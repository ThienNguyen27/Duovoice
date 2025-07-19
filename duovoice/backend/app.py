import os
import uuid
import json
import firebase_admin
import numpy as np
from pathlib import Path
import tensorflow as tf
from firebase_admin import credentials, firestore, initialize_app
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Body
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from schemas import UserLogin, UserInDB, UserSignUp, FriendInvitation, Friend, DirectMessage, DirectMessageCreate, FriendOut
import bcrypt
import redis
from typing import List, Dict
from datetime import datetime
import warnings

warnings.filterwarnings(
    "ignore",
    "Detected filter using positional arguments",
    category=UserWarning,
    module="google.cloud.firestore_v1.base_collection"
)

env_path = os.path.join(os.path.dirname(__file__), "..", "lib", ".env")
load_dotenv(dotenv_path=env_path)
redis_host = os.getenv("REDIS_HOST")
redis_port = os.getenv("REDIS_PORT")
redis_username = os.getenv("REDIS_USERNAME")
redis_password = os.getenv("REDIS_PASSWORD")

r = redis.Redis(
    host=redis_host,
    port=redis_port,
    decode_responses=True,
    username=redis_username,
    password=redis_password,
)

# Initialize Firebase once
cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)

db = firestore.client()

app = FastAPI()
# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"]
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent

MODEL_PATH = Path(
    os.getenv("ASL_H5_PATH", PROJECT_ROOT / "public" / "model" / "asl_alphabet_mlp.h5")
)

try:
    h5_model = tf.keras.models.load_model(MODEL_PATH)
except Exception as e:
    raise RuntimeError(f"Failed to load ASL model at {MODEL_PATH}: {e}")

# Same labels as front-end
LABELS = [
  'A','B','C','D','E','F','G','H','I',
  'K','L','M','N','O','P','Q','R','S',
  'T','U','V','W','X','Y',
  'del','space'
]

class PredictPayload(BaseModel):
    landmarks: list[list[float]]  # shape: (21, 2)

@app.post("/predict")
def predict_asl(payload: PredictPayload):
    lm = np.array(payload.landmarks, dtype=np.float32)  # (21,2)
    # 1) center on wrist
    lm -= lm[0]
    # 2) scale to unit size
    dists = np.linalg.norm(lm, axis=1)
    max_dist = float(np.max(dists)) if np.any(dists) else 1.0
    lm /= max_dist
    # 3) flatten and predict
    flat = lm.flatten()[None, :]
    preds = h5_model.predict(flat)  # (1, 28)
    idx = int(np.argmax(preds, axis=1)[0])
    try:
        letter = LABELS[idx]
    except IndexError:
        raise HTTPException(500, detail="Model output index out of range")
    return {"letter": letter}

@app.on_event("startup")
def clear_queues():
    # remove leftover entries from previous runs
    r.delete("normal_queue", "muted_queue")
    # we'll also use a hash to store matches
    r.delete("matches")

@app.get("/") 
async def root():
    return {"routes": ["/about", "/login", "/signup"]} # basic backend routes

@app.get("/about")
async def about():
    return {"message": "This is the about page."}

@app.post("/login")
async def login(user: UserLogin):
    user_ref = db.collection("users").document(user.name)
    doc = user_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=401, detail="User does not exist! Please sign up!")

    stored_user = doc.to_dict()

    # Check password using bcrypt
    if not bcrypt.checkpw(user.password.encode(), stored_user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Please type the correct password!")

    return {"Welcome": f"{user.name}!"}

@app.post("/signup", response_model=str)
async def signup(user: UserSignUp):
    user_ref = db.collection("users").document(user.name)

    if user_ref.get().exists:
        raise HTTPException(status_code=400, detail=f"{user.name} already exists")

    # Secure bcrypt hashing
    password_hash = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt()).decode()

    user_db = UserInDB(name=user.name, password_hash=password_hash, is_muted=user.is_muted)
    user_ref.set(user_db.dict())

    return f"Thanks for sign up {user.name}!"

@app.post("/add10sampleusers")
async def add_10_users():
    usernames = ["alex", "bob", "charlie", "dave", "eve", "frank", "grace", "heidi", "ivan", "judy"]
    passwords = ["password1", "password2", "password3", "password4", "password5", 
                 "password6", "password7", "password8", "password9", "password10"]

    for i in range(10):
        is_muted = i % 2 != 0
        password_hash = bcrypt.hashpw(passwords[i].encode(), bcrypt.gensalt()).decode()
        user = UserInDB(name=usernames[i], password_hash=password_hash, is_muted=is_muted)
        user_ref = db.collection("users").document(user.name)
        user_ref.set(user.dict())

    return {"message": "10 users created successfully"}

@app.get("/users")
async def get_all_users():
    users_ref = db.collection("users").stream()
    
    users = []
    for doc in users_ref:
        user = doc.to_dict()
        user["id"] = doc.id  # include document ID
        users.append(user)
    
    return users

peers: dict[str, list[WebSocket]] = {}
user_map: dict[WebSocket, str] = {}
@app.websocket("/call/{room_id}")
async def call_websocket(websocket: WebSocket, room_id: str):
    await websocket.accept()

    # 1) Stash this socket
    peers.setdefault(room_id, []).append(websocket)

    try:
        # 2) First message MUST be a join with your userId
        join_raw = await websocket.receive_text()
        join = json.loads(join_raw)
        if join.get("type") != "join" or "sender" not in join:
            await websocket.close()
            return
        user_map[websocket] = join["sender"]

        # 3) Now forward ONLY to the *other* peer
        while True:
            raw = await websocket.receive_text()
            for peer_ws in list(peers[room_id]):
                if peer_ws is not websocket:
                    await peer_ws.send_text(raw)

    except WebSocketDisconnect:
        pass
    finally:
        # 4) Clean up
        peers[room_id].remove(websocket)
        user_map.pop(websocket, None)
        if not peers[room_id]:
            peers.pop(room_id, None)

# Add a friend invitation
@app.post("/users/{username}/friends",response_model=FriendInvitation,status_code=201)
async def add_friend(username: str, inv: FriendInvitation):
    # 1) ensure the path‐param matches the payload
    if inv.requester_id != username:
        raise HTTPException(400, "Mismatched requester")

    # 2) verify both users exist
    me_ref   = db.collection("users").document(inv.requester_id)
    them_ref = db.collection("users").document(inv.receiver_id)
    if not me_ref.get().exists or not them_ref.get().exists:
        raise HTTPException(404, "User not found")

    # 3) write the full invitation doc under each user
    me_ref.collection("friends").document(inv.receiver_id).set(inv.dict())
    them_ref.collection("friends").document(inv.requester_id).set(inv.dict())

    # 4) return exactly what the client sent
    return inv


# List friends 
@app.get("/users/{user_uid}/friends", response_model=List[FriendOut])
async def list_friends(user_uid: str):
    user_ref = db.collection("users").document(user_uid)
    if not user_ref.get().exists:
        raise HTTPException(404, "User not found")

    # Only accepted invitations
    invites = user_ref.collection("friends").where("status", "==", "Accept").stream()

    friends: List[FriendOut] = []
    for inv_doc in invites:
        inv = inv_doc.to_dict()
        # Figure out which field points at *the other* user
        if inv["requester_id"] == user_uid:
            friend_id = inv["receiver_id"]
        else:
            friend_id = inv["requester_id"]

        # Lookup their display name
        user_doc = db.collection("users").document(friend_id).get()
        display_name = user_doc.get("name") if user_doc.exists else friend_id

        friends.append(FriendOut(
            uid   = friend_id,
            name  = display_name,
            since = inv.get("time_stamp")
        ))
    return friends

chat_rooms: Dict[str, List[WebSocket]] = {} # in-memory storage for chat rooms
# WebSocket for chat
@app.websocket("/ws/chat/{room_id}")
async def websocket_chat(websocket: WebSocket, room_id: str):
    await websocket.accept()
    chat_rooms.setdefault(room_id, []).append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            payload = DirectMessageCreate(**json.loads(data))

            # 1) persist
            dm_id = uuid.uuid4().hex
            now = datetime.utcnow()
            record = DirectMessage(
                id=dm_id,
                room_id=payload.room_id,
                sender_id=payload.sender_id,
                receiver_id=payload.receiver_id,
                content=payload.content,
                time_stamp=now,
            )
            db.collection("direct_messages").document(dm_id).set(record.dict())

            # 2) broadcast
            text = json.dumps(record.dict(), default=str)
            for conn in chat_rooms[room_id]:
                await conn.send_text(text)

    except WebSocketDisconnect:
        chat_rooms[room_id].remove(websocket)
        if not chat_rooms[room_id]:
            del chat_rooms[room_id]

# Save DM
@app.post("/messages", response_model=DirectMessage, status_code=201)
async def send_message(msg: DirectMessageCreate):
    # verify users exist...
    dm_id = uuid.uuid4().hex
    now   = datetime.utcnow()
    record = DirectMessage(
        id=dm_id,
        room_id=msg.room_id,
        sender_id=msg.sender_id,
        receiver_id=msg.receiver_id,
        content=msg.content,
        time_stamp=now,
    )
    # persist to Firestore
    db.collection("direct_messages").document(dm_id).set(record.dict())
    # return the Pydantic model
    return record

# Get chat history for a room
@app.get("/chat/history/{room_id}", response_model=List[DirectMessage])
async def get_history(room_id: str):
    # 1) Query your existing direct_messages by room_id
    coll = db.collection("direct_messages")
    q    = coll.where("room_id", "==", room_id)
    docs = list(q.stream())

    # 2) Map to your Pydantic model, injecting the room_id
    history: List[DirectMessage] = []
    for doc in docs:
        data = doc.to_dict()
        history.append(DirectMessage(
            id          = doc.id,
            room_id     = room_id,
            sender_id   = data["sender_id"],
            receiver_id = data["receiver_id"],
            content     = data["content"],
            time_stamp  = data["time_stamp"],
        ))

    # 3) Sort in Python by timestamp (you may remove if Firestore indexed time_stamp)
    history.sort(key=lambda m: m.time_stamp)
    return history

# matching normal with muted person currently take in a json
@app.post("/match")
async def match_user(user_id: str = Body(...)):
    # 1) Clean up any stale entries for this user
    r.lrem("normal_queue", 0, user_id)
    r.lrem("muted_queue", 0, user_id)

    # 2) Fetch user metadata
    doc = db.collection("users").document(user_id).get()
    if not doc.exists:
        raise HTTPException(404, "User not found")
    is_muted = doc.to_dict().get("is_muted", False)

    # 3) Determine which list to push vs pop
    my_queue = "muted_queue" if is_muted else "normal_queue"
    other_queue = "normal_queue" if is_muted else "muted_queue"

    # 4) Try to atomically pop a peer
    peer_id = r.lpop(other_queue)
    if peer_id:
        room_id = uuid.uuid4().hex
        # store both room and peer for each user
        r.hset("matches", user_id, room_id)
        r.hset("matches", peer_id, room_id)
        r.hset("peers", user_id, peer_id)
        r.hset("peers", peer_id, user_id)
        return {"status": "matched", "room_id": room_id, "peer_id": peer_id}

    # 5) No peer yet, enqueue this user
    r.rpush(my_queue, user_id)
    return {"status": "waiting"}

@app.get("/match/status/{user_id}")
async def match_status(user_id: str):
    room_id = r.hget("matches", user_id)
    if room_id:
        peer_id = r.hget("peers", user_id)
        # clean up
        r.hdel("matches", user_id)
        r.hdel("peers", user_id)
        return {"status": "matched", "room_id": room_id, "peer_id": peer_id}
    return {"status": "waiting"}
