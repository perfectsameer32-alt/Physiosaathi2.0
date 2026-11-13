import hashlib
import hmac
import secrets
from typing import Optional, Tuple

def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return hashed, salt

def verify_password(password: str, hashed: str, salt: str) -> bool:
    expected = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return hmac.compare_digest(expected, hashed)

def generate_token(length: int = 24) -> str:
    return secrets.token_hex(length)

