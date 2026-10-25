"""
Central configuration. Every value can be overridden with an environment
variable (see backend/.env.example).

Database: MongoDB. Point MONGO_URL at a MongoDB Atlas cluster (free M0 tier
is enough) or a local mongod. For a quick local run with *no* MongoDB
installed at all, set MONGO_URL=mock:// to use an in-memory emulator
(mongomock) — data is lost on restart, dev/test only.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


class Settings:
    APP_NAME: str = "Feastory API"

    # --- database (MongoDB) -----------------------------------------------
    # Atlas:  mongodb+srv://<user>:<password>@feastory.xxxxx.mongodb.net/?retryWrites=true&w=majority
    # Local:  mongodb://localhost:27017
    # Test:   mock://
    MONGO_URL: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    MONGO_DB: str = os.getenv("MONGO_DB", "feastory")

    # --- auth -----------------------------------------------------------
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "720"))  # 12h

    # --- CORS -----------------------------------------------------------
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if o.strip()
    ]

    # --- image storage --------------------------------------------------
    # "local"  -> files saved to backend/uploads and served at /uploads/...
    # "s3"     -> files uploaded to S3_BUCKET, public URL returned
    STORAGE_BACKEND: str = os.getenv("STORAGE_BACKEND", "local")
    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", BASE_DIR / "uploads"))
    PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")
    S3_BUCKET: str = os.getenv("S3_BUCKET", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-south-1")
    S3_PUBLIC_BASE_URL: str = os.getenv("S3_PUBLIC_BASE_URL", "")

    # --- business rules -------------------------------------------------
    STARTING_BALANCE: float = float(os.getenv("STARTING_BALANCE", "500"))
    # "Most ordered today" on the home page counts orders since midnight in this zone
    TIMEZONE: str = os.getenv("TIMEZONE", "Asia/Kolkata")

    # --- feedback e-mail (Web3Forms, same service the original contact page used) ---
    # The key decides which inbox receives the mail. Get yours at https://web3forms.com
    # (free). Leave empty to store feedback in the DB without sending e-mail.
    WEB3FORMS_ACCESS_KEY: str = os.getenv("WEB3FORMS_ACCESS_KEY", "fdae9a92-3513-4bb6-a32e-6db1ac06778d")

    # --- seed admin -----------------------------------------------------
    SEED_STAFF_EMP_ID: int = int(os.getenv("SEED_STAFF_EMP_ID", "1234567890"))
    SEED_STAFF_PIN: str = os.getenv("SEED_STAFF_PIN", "1234")
    SEED_STAFF_NAME: str = os.getenv("SEED_STAFF_NAME", "Canteen Manager")


settings = Settings()
