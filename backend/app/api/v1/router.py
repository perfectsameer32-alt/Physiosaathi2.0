from fastapi import APIRouter
from app.api.v1.endpoints import config, auth, sessions, coach, status

api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"message": "Pysiosaathi API active", "version": "2.0.0", "status": "online"}

api_router.include_router(config.router)
api_router.include_router(auth.router)
api_router.include_router(sessions.router)
api_router.include_router(coach.router)
api_router.include_router(status.router)

