"""
Pysiosaathi Backend Application Entrypoint.
Startup-grade modular architecture delegating to app.main:app.
Preserves backward compatibility for 'server:app' runners and tests.
"""

from app.main import app
from app.core import database as db_module
from app.core.database import (
    HAS_MONGO,
    db,
    client,
    in_memory_status_checks,
    in_memory_sessions,
    in_memory_users,
    in_memory_tokens,
)
from app.models.status import StatusCheck, StatusCheckCreate, ConfigResponse
from app.models.session import SessionCreate, SessionRecord
from app.models.user import UserSignup, UserSignin, UserProfile, AuthResponse
from app.models.coach import AssistantRequest
from app.services.coach_service import COACH_KNOWLEDGE, HAS_EMERGENT
from app.core.security import hash_password, verify_password

if __name__ == "__main__":
    import uvicorn
    from app.core.config import settings
    uvicorn.run("server:app", host="0.0.0.0", port=settings.port, reload=True)
