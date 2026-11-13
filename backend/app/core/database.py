import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import hashlib

from app.core.config import settings

logger = logging.getLogger(__name__)

HAS_MONGO = False
db: Optional[Any] = None
client: Optional[Any] = None
INDEXES: Dict[str, list] = {}

try:
    from motor.motor_asyncio import AsyncIOMotorClient
    from pymongo import ASCENDING, DESCENDING, IndexModel
    
    if settings.mongo_url:
        client = AsyncIOMotorClient(settings.mongo_url, serverSelectionTimeoutMS=2000)
        db = client[settings.db_name]
        HAS_MONGO = True
        INDEXES = {
            "status_checks": [
                IndexModel([("id", ASCENDING)], name="id", unique=True),
                IndexModel([("timestamp", DESCENDING)], name="timestamp_desc"),
            ],
            "sessions": [
                IndexModel([("id", ASCENDING)], name="id", unique=True),
                IndexModel([("timestamp", DESCENDING)], name="timestamp_desc"),
            ],
            "users": [
                IndexModel([("email", ASCENDING)], name="email_unique", unique=True),
            ]
        }
        logger.info("MongoDB client initialized for %s", settings.db_name)
except Exception as e:
    logger.warning("MongoDB not active, using in-memory store: %s", e)

# In-memory store fallback (starts clean with 0 dummy sessions)
in_memory_status_checks: List[Dict[str, Any]] = []
in_memory_sessions: List[Dict[str, Any]] = []

# Default seed user: Alex Rivera (password: password123)
DEFAULT_SALT = "a1b2c3d4e5f67890"
DEFAULT_HASH = hashlib.sha256((DEFAULT_SALT + "password123").encode("utf-8")).hexdigest()

in_memory_users: Dict[str, Dict[str, Any]] = {
    "alex.rivera@athletic.io": {
        "id": "user-alex-rivera",
        "email": "alex.rivera@athletic.io",
        "name": "Alex Rivera",
        "hashed_password": DEFAULT_HASH,
        "salt": DEFAULT_SALT,
        "created_at": "2024-10-01T00:00:00Z"
    }
}
in_memory_tokens: Dict[str, Dict[str, Any]] = {}

async def ensure_indexes() -> None:
    if not HAS_MONGO or not db:
        return
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                idx_name = getattr(model, "name", None) or (
                    model.document.get("name") if hasattr(model, "document") and isinstance(model.document, dict) else str(model)
                )
                logger.error("ensure_indexes(%s.%s): %s", collection, idx_name, exc)

async def close_mongo_connection() -> None:
    global client
    if HAS_MONGO and client:
        client.close()
        logger.info("MongoDB connection closed.")

