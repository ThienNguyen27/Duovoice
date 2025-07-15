import os
import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import FastAPI
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", "lib", ".env")
load_dotenv(dotenv_path=env_path)
# Initialize Firebase once
cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)

db = firestore.client()

app = FastAPI()

@app.post("/add-user")
# write
def add_user():
    doc_ref = db.collection("users").document("sampleUser")
    doc_ref.set({
        "name": "Nibba",
        "age": 25,
    })
    return {"status": "User added"}
@app.get("/get-user")
def get_user():
    doc_ref = db.collection("users").document("sampleUser")
    doc = doc_ref.get()
    
    if doc.exists:
        return doc.to_dict()
    else:
        return {"error": "User not found"}