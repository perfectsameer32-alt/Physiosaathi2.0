import os
from pathlib import Path
from typing import List
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseModel):
    app_name: str = "Pysiosaathi API"
    version: str = "2.0.0"
    environment: str = Field(default_factory=lambda: os.environ.get("ENV", "development"))
    mongo_url: str = Field(default_factory=lambda: os.environ.get("MONGO_URL", ""))
    db_name: str = Field(default_factory=lambda: os.environ.get("DB_NAME", "pysiosaathi"))
    emergent_llm_key: str = Field(default_factory=lambda: os.environ.get("EMERGENT_LLM_KEY", ""))
    gemini_api_key: str = Field(default_factory=lambda: os.environ.get("GEMINI_API_KEY", ""))
    port: int = Field(default_factory=lambda: int(os.environ.get("PORT", 8001)))
    
    @property
    def cors_origins(self) -> List[str]:
        raw = os.environ.get("CORS_ORIGINS", "")
        if raw.strip():
            return [orig.strip() for orig in raw.split(",") if orig.strip()]
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8001",
            "http://127.0.0.1:8001",
        ]

settings = Settings()

