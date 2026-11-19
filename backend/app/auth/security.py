
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv

# Load .env from the RetailPulse project root
PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "retailpulse-super-secret-jwt-key-2026-production-ready")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
)

try:
    from pwdlib import PasswordHash
    _password_hash = PasswordHash.recommended()
    def hash_password(password: str) -> str:
        return _password_hash.hash(password)
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return _password_hash.verify(plain_password, hashed_password)
except ImportError:
    import argon2
    _hasher = argon2.PasswordHasher()
    def hash_password(password: str) -> str:
        return _hasher.hash(password)
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        try:
            return _hasher.verify(hashed_password, plain_password)
        except Exception:
            return False


def create_access_token(data: dict) -> str:
    """Generate a signed JWT access token."""
    payload = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload.update({"exp": expire})

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token
