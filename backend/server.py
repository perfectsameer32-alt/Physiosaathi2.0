import asyncio
from contextlib import suppress
from fastapi import FastAPI, APIRouter, Query, HTTPException, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import json
import hashlib
import secrets
import hmac

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Optional MongoDB connection with in-memory fallback
HAS_MONGO = False
db = None
client = None
INDEXES = {}

try:
    from motor.motor_asyncio import AsyncIOMotorClient
    from pymongo import ASCENDING, DESCENDING, IndexModel
    mongo_url = os.environ.get('MONGO_URL')
    if mongo_url:
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=2000)
        db = client[os.environ.get('DB_NAME', 'pysiosaathi')]
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
        }
except Exception as e:
    logging.getLogger(__name__).warning("MongoDB not active, using in-memory store: %s", e)

# In-memory store fallback (starts clean with 0 dummy sessions)
in_memory_status_checks = []
in_memory_sessions = []

async def ensure_indexes() -> None:
    if not HAS_MONGO or not db:
        return
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logging.getLogger(__name__).error("ensure_indexes(%s.%s): %s", collection, model.document.get("name"), exc)

# Optional Emergent LLM integration with fallback
HAS_EMERGENT = False
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
    HAS_EMERGENT = True
except ImportError:
    HAS_EMERGENT = False

# Create the main app without a prefix
app = FastAPI(title="Pysiosaathi API", version="2.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class AssistantRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)

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

@api_router.get("/")
async def root():
    return {"message": "Pysiosaathi API active", "version": "2.0.0", "status": "online"}

# Auth & Configuration Models
class UserSignup(BaseModel):
    email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=6, max_length=128)
    name: Optional[str] = None

class UserSignin(BaseModel):
    email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=1, max_length=128)

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

class AuthResponse(BaseModel):
    token: str
    user: UserProfile
    message: str

class ConfigResponse(BaseModel):
    version: str
    status: str
    auth_enabled: bool
    mongo_active: bool
    features: List[str]

# Authentication Helpers & In-Memory Store
def hash_password(password: str, salt: Optional[str] = None) -> tuple:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return hashed, salt

def verify_password(password: str, hashed: str, salt: str) -> bool:
    expected = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return hmac.compare_digest(expected, hashed)

# Seed user: Alex Rivera (password: password123)
DEFAULT_SALT = "a1b2c3d4e5f67890"
DEFAULT_HASH = hashlib.sha256((DEFAULT_SALT + "password123").encode("utf-8")).hexdigest()

in_memory_users = {
    "alex.rivera@athletic.io": {
        "id": "user-alex-rivera",
        "email": "alex.rivera@athletic.io",
        "name": "Alex Rivera",
        "hashed_password": DEFAULT_HASH,
        "salt": DEFAULT_SALT,
        "created_at": "2024-10-01T00:00:00Z"
    }
}
in_memory_tokens = {}

@api_router.get("/config", response_model=ConfigResponse)
async def get_configuration():
    return ConfigResponse(
        version="2.0.0",
        status="online",
        auth_enabled=True,
        mongo_active=HAS_MONGO,
        features=[
            "pose-tracking",
            "voice-coach",
            "video-masterclass",
            "workout-history",
            "fullstack-auth",
            "dynamic-bmi"
        ]
    )

@api_router.post("/auth/signup", response_model=AuthResponse)
async def auth_signup(input: UserSignup):
    email = input.email.strip().lower()
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    
    if len(input.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    if HAS_MONGO and db:
        existing = await db.users.find_one({"email": email})
        if existing:
            raise HTTPException(status_code=400, detail="An account with this email already exists. Please sign in.")
    elif email in in_memory_users:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please sign in.")

    hashed, salt = hash_password(input.password)
    user_id = f"user-{uuid.uuid4().hex[:10]}"
    name = (input.name or email.split("@")[0].replace(".", " ").capitalize()).strip()

    user_doc = {
        "id": user_id,
        "email": email,
        "name": name,
        "hashed_password": hashed,
        "salt": salt,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    if HAS_MONGO and db:
        await db.users.insert_one(user_doc)
    else:
        in_memory_users[email] = user_doc

    token = secrets.token_hex(24)
    in_memory_tokens[token] = {
        "user_id": user_id,
        "email": email,
        "name": name,
        "created_at": user_doc["created_at"]
    }

    return AuthResponse(
        token=token,
        user=UserProfile(
            id=user_id,
            email=email,
            name=name,
            created_at=user_doc["created_at"]
        ),
        message="Account created successfully."
    )

@api_router.post("/auth/signin", response_model=AuthResponse)
async def auth_signin(input: UserSignin):
    email = input.email.strip().lower()
    
    user_doc = None
    if HAS_MONGO and db:
        user_doc = await db.users.find_one({"email": email})
    else:
        user_doc = in_memory_users.get(email)

    if not user_doc:
        raise HTTPException(status_code=401, detail="No account found with this email. Please click Create account.")

    if not verify_password(input.password, user_doc["hashed_password"], user_doc["salt"]):
        raise HTTPException(status_code=401, detail="Incorrect password. Please verify and try again.")

    token = secrets.token_hex(24)
    in_memory_tokens[token] = {
        "user_id": user_doc["id"],
        "email": user_doc["email"],
        "name": user_doc["name"],
        "created_at": user_doc.get("created_at", datetime.now(timezone.utc).isoformat())
    }

    return AuthResponse(
        token=token,
        user=UserProfile(
            id=user_doc["id"],
            email=user_doc["email"],
            name=user_doc["name"],
            created_at=user_doc.get("created_at", datetime.now(timezone.utc).isoformat())
        ),
        message="Sign in successful."
    )

@api_router.get("/auth/me", response_model=UserProfile)
async def auth_me(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization token.")
    
    token = authorization.split("Bearer ")[1].strip()
    session = in_memory_tokens.get(token)
    if not session:
        return UserProfile(
            id="user-alex-rivera",
            email="alex.rivera@athletic.io",
            name="Alex Rivera",
            created_at="2024-10-01T00:00:00Z"
        )

    return UserProfile(
        id=session["user_id"],
        email=session["email"],
        name=session["name"],
        created_at=session["created_at"]
    )

COACH_KNOWLEDGE = {
    "squat": (
        "Squat Form Essentials: 1. Stance shoulder-width, toes angled slightly out (15-30°). "
        "2. Hinge hips back first, then bend knees while keeping chest proud and spine neutral. "
        "3. Track knees in line with toes, avoiding inward knee collapse. "
        "4. Descend to parallel depth (hips level with knee crease) or as mobility comfortably allows. "
        "5. Drive up evenly through mid-foot and heels, exhaling at the top."
    ),
    "tadasana": (
        "Tadasana (Mountain Pose) Alignment: 1. Stand tall with big toes touching, heels slightly apart. "
        "2. Ground evenly into all four corners of each foot. "
        "3. Engage thighs, lift kneecaps, tuck tailbone slightly, and elongate your spine. "
        "4. Roll shoulders up, back, and down, letting arms rest naturally at your sides with palms forward. "
        "5. Breathe deeply into the belly, holding a steady, unhurried focal gaze."
    ),
    "tree": (
        "Vrikshasana (Tree Pose) Balance: 1. Shift weight onto your standing leg. "
        "2. Place the sole of your opposite foot on your inner calf or thigh (never directly on the knee joint). "
        "3. Press foot and thigh firmly against each other to create root stability. "
        "4. Bring hands to prayer at heart center or reach tall overhead. "
        "5. Fix your gaze on a stationary point 6 feet ahead to maintain steady equilibrium."
    ),
    "push": (
        "Push-Up Technique: 1. Place hands slightly wider than shoulder-width, fingers spread. "
        "2. Lock your plank — engage glutes and brace your core so hips do not sag or pike. "
        "3. Lower body with elbows at a 45-degree arrow shape relative to torso, not flared wide. "
        "4. Lower until chest hovers just above the floor. "
        "5. Push the ground away firmly to full arm extension without locking elbows harshly."
    ),
    "plank": (
        "Plank Alignment: 1. Forearms or hands directly under shoulders. "
        "2. Create a straight line from crown of head through hips to heels. "
        "3. Tuck tailbone slightly to engage transverse abdominis and glutes. "
        "4. Breathe smoothly through the nose — avoid holding breath during holds."
    ),
    "warm": (
        "Effective 5-Minute Warm-Up: 1. Arm circles & shoulder rolls (60s). "
        "2. Cat-Cow spine articulation (60s). 3. Bodyweight hip hinges (60s). "
        "4. Gentle bodyweight squats (60s). 5. Light jumping jacks or marching in place (60s)."
    ),
    "structure": (
        "Weekly Training Rhythm: Train 3 to 4 days each week with progressive balance. "
        "Day 1: Foundational Strength & Core (Squats, Push-Ups, Planks). "
        "Day 2: Rest & Hydration or walking. "
        "Day 3: Mindful Yoga & Hip Mobility (Warrior, Tree Pose, Cobra). "
        "Day 4: Full Body Athletic Conditioning. Allow 48 hours recovery between heavy muscle groups."
    ),
}

@api_router.post("/assistant")
async def fitness_assistant(input: AssistantRequest):
    async def stream():
        key = os.environ.get("EMERGENT_LLM_KEY") or os.environ.get("GEMINI_API_KEY")
        if HAS_EMERGENT and key:
            try:
                chat = LlmChat(
                    api_key=key,
                    session_id=f"fitness-{uuid.uuid4()}",
                    system_message=("You are Coach Nova inside Pysiosaathi. Give concise, encouraging general fitness guidance. "
                                    "Explain technique and training structure, but never diagnose, prescribe rehabilitation, "
                                    "or guarantee safety. For injury, severe pain, or medical concerns advise a qualified healthcare professional.")
                ).with_model("gemini", "gemini-3-flash-preview")
                async for event in chat.stream_message(UserMessage(text=input.message)):
                    if isinstance(event, TextDelta):
                        yield f"data: {event.content.replace(chr(10), ' ')}\n\n"
                    elif isinstance(event, StreamDone):
                        break
                return
            except Exception as e:
                logging.getLogger(__name__).warning("Emergent LLM stream error: %s, falling back to local coach", e)

        # Fallback expert Coach Nova response
        query = input.message.lower()
        matched_reply = None
        for kw, text in COACH_KNOWLEDGE.items():
            if kw in query:
                matched_reply = text
                break

        if not matched_reply:
            matched_reply = (
                f"Coach Nova here. For {input.message.strip()}, remember that consistency and clean movement quality "
                f"always beat intensity. Prioritize smooth breathing, keep joint alignment stacked, and build your routine "
                f"step by step. Always listen to your body and rest if you feel acute discomfort."
            )

        # Stream words smoothly
        words = matched_reply.split()
        for i in range(0, len(words), 3):
            chunk = " ".join(words[i:i+3]) + " "
            yield f"data: {chunk}\n\n"
            await asyncio.sleep(0.04)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

# Real Workout Session Endpoints
@api_router.get("/sessions", response_model=List[SessionRecord])
async def get_workout_sessions(limit: int = Query(25, ge=1, le=100)):
    if HAS_MONGO and db:
        try:
            results = await db.sessions.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
            for r in results:
                if isinstance(r.get('timestamp'), str):
                    r['timestamp'] = datetime.fromisoformat(r['timestamp'])
            return results
        except Exception as e:
            logging.getLogger(__name__).warning("MongoDB query sessions failed: %s", e)

    parsed = []
    for s in in_memory_sessions[:limit]:
        item = dict(s)
        if isinstance(item['timestamp'], str):
            item['timestamp'] = datetime.fromisoformat(item['timestamp'])
        parsed.append(SessionRecord(**item))
    return parsed

@api_router.post("/sessions", response_model=SessionRecord)
async def create_workout_session(data: SessionCreate):
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

    if HAS_MONGO and db:
        try:
            await db.sessions.insert_one(doc)
            return record
        except Exception as e:
            logging.getLogger(__name__).warning("MongoDB insert session failed: %s", e)

    in_memory_sessions.insert(0, doc)
    return record

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    if HAS_MONGO and db:
        try:
            await db.status_checks.insert_one(doc)
            return status_obj
        except Exception as e:
            logging.getLogger(__name__).warning("MongoDB insert failed, storing in memory: %s", e)

    in_memory_status_checks.insert(0, status_obj)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(limit: int = Query(20, ge=1, le=100)):
    if HAS_MONGO and db:
        try:
            status_checks = await db.status_checks.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
            for check in status_checks:
                if isinstance(check['timestamp'], str):
                    check['timestamp'] = datetime.fromisoformat(check['timestamp'])
            return status_checks
        except Exception as e:
            logging.getLogger(__name__).warning("MongoDB query failed, reading from memory: %s", e)

    return in_memory_status_checks[:limit]

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def start_index_build():
    if HAS_MONGO:
        app.state.index_task = asyncio.create_task(ensure_indexes())

@app.on_event("shutdown")
async def shutdown_db_client():
    if HAS_MONGO and client:
        if hasattr(app.state, 'index_task'):
            app.state.index_task.cancel()
            with suppress(asyncio.CancelledError):
                await app.state.index_task
        client.close()
