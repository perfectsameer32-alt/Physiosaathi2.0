import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException

from app.core.security import hash_password, verify_password, generate_token
from app.core import database as db_module
from app.models.user import UserSignup, UserSignin, UserProfile, AuthResponse

class AuthService:
    @staticmethod
    async def signup(input_data: UserSignup) -> AuthResponse:
        email = input_data.email.strip().lower()
        if "@" not in email or "." not in email:
            raise HTTPException(status_code=400, detail="Please enter a valid email address.")
        
        if len(input_data.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

        if db_module.HAS_MONGO and db_module.db is not None:
            existing = await db_module.db.users.find_one({"email": email})
            if existing:
                raise HTTPException(status_code=400, detail="An account with this email already exists. Please sign in.")
        elif email in db_module.in_memory_users:
            raise HTTPException(status_code=400, detail="An account with this email already exists. Please sign in.")

        hashed, salt = hash_password(input_data.password)
        user_id = f"user-{uuid.uuid4().hex[:10]}"
        name = (input_data.name or email.split("@")[0].replace(".", " ").capitalize()).strip()
        created_at = datetime.now(timezone.utc).isoformat()

        user_doc = {
            "id": user_id,
            "email": email,
            "name": name,
            "hashed_password": hashed,
            "salt": salt,
            "created_at": created_at
        }

        if db_module.HAS_MONGO and db_module.db is not None:
            await db_module.db.users.insert_one(user_doc)
        else:
            db_module.in_memory_users[email] = user_doc

        token = generate_token()
        db_module.in_memory_tokens[token] = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "created_at": created_at
        }

        return AuthResponse(
            token=token,
            user=UserProfile(
                id=user_id,
                email=email,
                name=name,
                created_at=created_at
            ),
            message="Account created successfully."
        )

    @staticmethod
    async def signin(input_data: UserSignin) -> AuthResponse:
        email = input_data.email.strip().lower()
        user_doc = None
        
        if db_module.HAS_MONGO and db_module.db is not None:
            user_doc = await db_module.db.users.find_one({"email": email})
            if not user_doc and email in db_module.in_memory_users:
                user_doc = db_module.in_memory_users[email]
        else:
            user_doc = db_module.in_memory_users.get(email)

        if not user_doc:
            raise HTTPException(status_code=401, detail="No account found with this email. Please click Create account.")

        if not verify_password(input_data.password, user_doc["hashed_password"], user_doc["salt"]):
            raise HTTPException(status_code=401, detail="Incorrect password. Please verify and try again.")

        token = generate_token()
        created_at = user_doc.get("created_at", datetime.now(timezone.utc).isoformat())
        db_module.in_memory_tokens[token] = {
            "user_id": user_doc["id"],
            "email": user_doc["email"],
            "name": user_doc["name"],
            "created_at": created_at
        }

        return AuthResponse(
            token=token,
            user=UserProfile(
                id=user_doc["id"],
                email=user_doc["email"],
                name=user_doc["name"],
                created_at=created_at
            ),
            message="Sign in successful."
        )

    @staticmethod
    def get_user_from_token(token: str) -> UserProfile:
        session = db_module.in_memory_tokens.get(token)
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")
        
        return UserProfile(
            id=session["user_id"],
            email=session["email"],
            name=session["name"],
            created_at=session["created_at"]
        )

