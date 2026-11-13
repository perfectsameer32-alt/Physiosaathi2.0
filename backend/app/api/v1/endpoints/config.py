from fastapi import APIRouter
from app.core.config import settings
from app.core import database as db_module
from app.models.status import ConfigResponse

router = APIRouter()

@router.get("/config", response_model=ConfigResponse)
async def get_configuration():
    return ConfigResponse(
        version=settings.version,
        status="online",
        auth_enabled=True,
        mongo_active=db_module.HAS_MONGO,
        features=[
            "pose-tracking",
            "voice-coach",
            "video-masterclass",
            "workout-history",
            "fullstack-auth",
            "dynamic-bmi"
        ]
    )

