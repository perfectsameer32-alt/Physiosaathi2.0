import uuid
from datetime import datetime, timezone
from typing import List
from pydantic import BaseModel, Field, ConfigDict

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class ConfigResponse(BaseModel):
    version: str
    status: str
    auth_enabled: bool
    mongo_active: bool
    features: List[str]

