from typing import List
from fastapi import APIRouter, Query
from app.models.session import SessionCreate, SessionRecord
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["Workout Sessions"])

@router.get("", response_model=List[SessionRecord])
async def get_sessions(limit: int = Query(25, ge=1, le=100)):
    return await SessionService.get_sessions(limit=limit)

@router.post("", response_model=SessionRecord)
async def create_session(data: SessionCreate):
    return await SessionService.create_session(data)

