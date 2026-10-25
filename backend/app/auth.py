"""Password hashing + JWT helpers + FastAPI dependencies for current user."""
from datetime import datetime, timedelta, timezone
from typing import Literal

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.database import Database

from .config import settings
from .db import get_db

bearer = HTTPBearer(auto_error=False)


# ------------------------------------------------------------ hashing ---
def hash_secret(raw: str) -> str:
    return bcrypt.hashpw(raw.encode(), bcrypt.gensalt()).decode()


def verify_secret(raw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(raw.encode(), hashed.encode())
    except ValueError:
        return False


# ---------------------------------------------------------------- jwt ---
def create_token(subject: int, role: Literal["student", "staff"]) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")


# ------------------------------------------------------- dependencies ---
def _payload(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not logged in!")
    return decode_token(creds.credentials)


def current_student(payload: dict = Depends(_payload), db: Database = Depends(get_db)) -> dict:
    """Returns the student document ({_id: sapid, name, email, balance, ...})."""
    if payload.get("role") != "student":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Student login required")
    student = db.students.find_one({"_id": int(payload["sub"])})
    if not student:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return student


def current_staff(payload: dict = Depends(_payload), db: Database = Depends(get_db)) -> dict:
    if payload.get("role") != "staff":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Canteen manager login required")
    staff = db.canteen_staff.find_one({"_id": int(payload["sub"])})
    if not staff:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Staff not found")
    return staff
