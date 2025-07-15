from pydantic import BaseModel
from typing import Literal
from datetime import datetime, date

class User(BaseModel):
    id: str
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
    sender_id: str
    receiver_id: str
    content: str
    time_stamp: datetime

class FriendInvitation(BaseModel):
    id: str
    requester_id: str
    receiver_id: str
    status: Literal["Pending", "Accept", "Decline"]
    time_stamp: datetime

class Friend(BaseModel):
    id: str
    user_id: str
    friend_id: str
    status: Literal["Online", "Offline"]
