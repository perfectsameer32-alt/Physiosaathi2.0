from typing import List
from fastapi import APIRouter, Query
from app.models.status import StatusCheck, StatusCheckCreate
from app.services.session_service import SessionService

router = APIRouter(prefix="/status", tags=["System Status"])

@router.post("", response_model=StatusCheck)
async def create_status(input_data: StatusCheckCreate):
    return await SessionService.create_status(input_data)

@router.get("", response_model=List[StatusCheck])
async def get_status_checks(limit: int = Query(20, ge=1, le=100)):
    return await SessionService.get_status_checks(limit=limit)

