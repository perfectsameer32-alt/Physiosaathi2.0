from typing import Optional
from fastapi import APIRouter, Header, HTTPException
from app.models.user import UserSignup, UserSignin, UserProfile, AuthResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=AuthResponse)
async def signup(input_data: UserSignup):
    return await AuthService.signup(input_data)

@router.post("/signin", response_model=AuthResponse)
async def signin(input_data: UserSignin):
    return await AuthService.signin(input_data)

@router.get("/me", response_model=UserProfile)
async def get_me(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization token.")
    
    token = authorization.split("Bearer ")[1].strip()
    return AuthService.get_user_from_token(token)

