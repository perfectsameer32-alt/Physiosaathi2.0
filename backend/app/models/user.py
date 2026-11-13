from typing import Optional
from pydantic import BaseModel, Field

class UserSignup(BaseModel):
    email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=6, max_length=128)
    name: Optional[str] = None

class UserSignin(BaseModel):
    email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=1, max_length=128)

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

class AuthResponse(BaseModel):
    token: str
    user: UserProfile
    message: str

