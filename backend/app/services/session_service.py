import logging
from datetime import datetime, timezone
from typing import List

from app.core import database as db_module
from app.models.session import SessionCreate, SessionRecord
from app.models.status import StatusCheck, StatusCheckCreate

logger = logging.getLogger(__name__)

class SessionService:
    @staticmethod
    async def create_session(data: SessionCreate) -> SessionRecord:
        duration_min = max(round(data.duration_seconds / 60), 1)
        record = SessionRecord(
            exercise_id=data.exercise_id,
            name=data.name,
            category=data.category,
            duration_seconds=data.duration_seconds,
            duration_formatted=f"{duration_min} min",
            reps=data.reps,
            calories=data.calories,
            accuracy=data.accuracy,
            date=f"Today · {duration_min} min",
            timestamp=datetime.now(timezone.utc)
        )

        doc = record.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()

        if db_module.HAS_MONGO and db_module.db is not None:
            try:
                await db_module.db.sessions.insert_one(doc)
                return record
            except Exception as e:
                logger.warning("MongoDB insert session failed: %s", e)

        db_module.in_memory_sessions.insert(0, doc)
        return record

    @staticmethod
    async def get_sessions(limit: int = 25) -> List[SessionRecord]:
        if db_module.HAS_MONGO and db_module.db is not None:
            try:
                results = await db_module.db.sessions.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
                for r in results:
                    if isinstance(r.get('timestamp'), str):
                        r['timestamp'] = datetime.fromisoformat(r['timestamp'].replace('Z', '+00:00'))
                return results
            except Exception as e:
                logger.warning("MongoDB query sessions failed: %s", e)

        parsed = []
        for s in db_module.in_memory_sessions[:limit]:
            item = dict(s)
            if isinstance(item.get('timestamp'), str):
                item['timestamp'] = datetime.fromisoformat(item['timestamp'].replace('Z', '+00:00'))
            parsed.append(SessionRecord(**item))
        return parsed

    @staticmethod
    async def create_status(input_data: StatusCheckCreate) -> StatusCheck:
        status_dict = input_data.model_dump()
        status_obj = StatusCheck(**status_dict)
        doc = status_obj.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        
        if db_module.HAS_MONGO and db_module.db is not None:
            try:
                await db_module.db.status_checks.insert_one(doc)
                return status_obj
            except Exception as e:
                logger.warning("MongoDB insert status failed: %s", e)

        db_module.in_memory_status_checks.insert(0, status_obj)
        return status_obj

    @staticmethod
    async def get_status_checks(limit: int = 20) -> List[StatusCheck]:
        if db_module.HAS_MONGO and db_module.db is not None:
            try:
                status_checks = await db_module.db.status_checks.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
                for check in status_checks:
                    if isinstance(check.get('timestamp'), str):
                        check['timestamp'] = datetime.fromisoformat(check['timestamp'].replace('Z', '+00:00'))
                return status_checks
            except Exception as e:
                logger.warning("MongoDB query status failed: %s", e)

        return db_module.in_memory_status_checks[:limit]

