import uuid
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict

class SessionCreate(BaseModel):
    exercise_id: str
    name: str
    category: str
    duration_seconds: int
    reps: int
    calories: int
    accuracy: int

class SessionRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    exercise_id: str
    name: str
    category: str
    duration_seconds: int
    duration_formatted: str
    reps: int
    calories: int
    accuracy: int
    date: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

