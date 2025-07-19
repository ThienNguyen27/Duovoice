from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime, date, timezone
from enum import Enum

class UserLogin(BaseModel):
    name: str
    password: str

class UserSignUp(BaseModel):
    name: str
    password: str
    is_muted: bool = False

class UserInDB(BaseModel):
    name: str
    password_hash: str
    is_muted: bool

class PracticeGoal(BaseModel):
    user_id: str
    goal_date: date
    stars_need: int

class PracticeProgress(BaseModel):
    user_id: str
    date: date
    stars_earned: int
    streak: int

class DirectMessage(BaseModel):
    id: str
    room_id: str
    sender_id: str
    receiver_id: str
    content: str
    time_stamp: datetime

class DirectMessageCreate(BaseModel):
    room_id: str
    sender_id: str
    receiver_id: str
    content: str

class FriendInvitationCreate(BaseModel):
    requester_id: str
    receiver_id: str

class FriendInvitation(BaseModel):
    id: str
    requester_id: str
    receiver_id: str
    status: Literal["Accept", "Decline"]
    time_stamp: datetime

class Friend(BaseModel):
    id: str
    user_id: str
    friend_id: str

class FriendOut(BaseModel):
    """Model representing a friend to return in API responses"""
    uid: str
    name: str
    since: Optional[datetime] = None

