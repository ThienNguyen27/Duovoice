import os
import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from schemas import UserLogin, UserInDB, UserSignUp
import bcrypt

env_path = os.path.join(os.path.dirname(__file__), "..", "lib", ".env")
load_dotenv(dotenv_path=env_path)


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
    allow_headers=["*"],
    allow_methods=["*"]
)

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

peers = {}
@app.websocket("/call/{room_id}")
async def call_websocket(websocket: WebSocket, room_id: str):
    await websocket.accept()
    if room_id not in peers:
        peers[room_id] = []
    peers[room_id].append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            for peer in peers[room_id]:
                if peer != websocket:
                    await peer.send_text(data)
    except WebSocketDisconnect:
        peers[room_id].remove(websocket)