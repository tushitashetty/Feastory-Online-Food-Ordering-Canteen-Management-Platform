"""
MongoDB connection + collection layout + indexes.

Collections (see backend/db/collections.md for full document shapes):

  students             _id = SAP ID (int)          name, email, password_hash, balance
  canteen_staff        _id = Employee ID (int)     name, pin_hash
  categories           _id = ObjectId              name, name_lower (unique)
  dishes               _id = ObjectId              name, name_lower (unique), price, category, calories, image_url, is_available
  carts                _id = SAP ID                items: [{dish_id, quantity, added_at}]   (one doc per student)
  orders               _id = ObjectId              order_no (int, unique), student_sapid, status, items[], total_amount
  wallet_transactions  _id = ObjectId              student_sapid, kind, amount, balance_after, order_no
  contact_messages     _id = ObjectId
  counters             _id = "orders"              seq   (gives human-readable order numbers #1, #2, ...)
"""
from __future__ import annotations

from datetime import datetime, timezone

from pymongo import ASCENDING, DESCENDING, MongoClient, ReturnDocument
from pymongo.database import Database

from .config import settings

_client: MongoClient | None = None
_db: Database | None = None



def now() -> datetime:
    return datetime.now(timezone.utc)


def connect() -> Database:
    """Create the client once. mock:// swaps in mongomock (dev/test only)."""
    global _client, _db
    if _db is not None:
        return _db
    if settings.MONGO_URL.startswith("mock://"):
        import mongomock  # dev dependency

        _client = mongomock.MongoClient()
    else:
        _client = MongoClient(
            settings.MONGO_URL,
            serverSelectionTimeoutMS=10000,
            tz_aware=True,
        )
        _client.admin.command("ping")  # fail fast on bad URL / IP not allow-listed
    _db = _client[settings.MONGO_DB]
    return _db


def get_db() -> Database:
    """FastAPI dependency."""
    return connect()


def client() -> MongoClient:
    connect()
    return _client  # type: ignore[return-value]


def is_mock() -> bool:
    return settings.MONGO_URL.startswith("mock://")


def ensure_indexes(db: Database) -> None:
    db.students.create_index([("email", ASCENDING)], unique=True)
    # name_lower = lowercase copy of name -> case-insensitive uniqueness without collations
    db.categories.create_index([("name_lower", ASCENDING)], unique=True)
    db.dishes.create_index([("name_lower", ASCENDING)], unique=True)
    db.dishes.create_index([("category", ASCENDING)])
    db.dishes.create_index([("is_available", ASCENDING), ("created_at", DESCENDING)])
    db.orders.create_index([("order_no", ASCENDING)], unique=True)
    db.orders.create_index([("student_sapid", ASCENDING), ("created_at", DESCENDING)])
    db.orders.create_index([("status", ASCENDING), ("created_at", ASCENDING)])
    db.wallet_transactions.create_index([("student_sapid", ASCENDING), ("created_at", DESCENDING)])
    db.feedback.create_index([("created_at", DESCENDING)])


def next_sequence(db: Database, name: str, session=None) -> int:
    """Atomic counter — used for human-friendly order numbers."""
    doc = db.counters.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
        session=session,
    )
    return int(doc["seq"])


def round2(x) -> float:
    return round(float(x) + 1e-9, 2)
