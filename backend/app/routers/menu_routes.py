import re
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo import ASCENDING, DESCENDING
from pymongo.database import Database

from .. import schemas
from ..config import settings
from ..db import get_db
from ..serializers import category_out, dish_out

router = APIRouter(prefix="/api/menu", tags=["menu"])


def oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(404, "Dish not found")


@router.get("", response_model=list[schemas.DishOut])
def list_dishes(
    q: str | None = Query(default=None, max_length=100, description="search by dish name"),
    category: str | None = Query(default=None, description="exact category name"),
    include_unavailable: bool = False,
    limit: int | None = Query(default=None, ge=1, le=200),
    db: Database = Depends(get_db),
):
    filt: dict = {}
    if not include_unavailable:
        filt["is_available"] = True
    if q:
        filt["name"] = {"$regex": re.escape(q.strip()), "$options": "i"}
    if category:
        filt["category"] = category
    cursor = db.dishes.find(filt).sort([("created_at", DESCENDING), ("_id", DESCENDING)])
    if limit:
        cursor = cursor.limit(limit)
    return [dish_out(d) for d in cursor]


@router.get("/popular", response_model=list[schemas.DishOut])
def popular_today(limit: int = Query(default=6, ge=1, le=50), db: Database = Depends(get_db)):
    """
    Most-ordered dishes since midnight (settings.TIMEZONE, Asia/Kolkata by default),
    ranked by total quantity across all orders placed today. Dishes that have since
    been deleted or marked sold-out are skipped. Empty list = no orders yet today.
    """
    start = datetime.now(ZoneInfo(settings.TIMEZONE)).replace(hour=0, minute=0, second=0, microsecond=0)
    start_utc = start.astimezone(timezone.utc)
    ranked = list(
        db.orders.aggregate(
            [
                {"$match": {"created_at": {"$gte": start_utc}}},
                {"$unwind": "$items"},
                {"$group": {"_id": "$items.dish_id", "qty": {"$sum": "$items.quantity"}}},
                {"$sort": {"qty": -1, "_id": 1}},
                {"$limit": limit * 2},  # headroom for sold-out/deleted dishes we drop below
            ]
        )
    )
    if not ranked:
        return []
    ids = [r["_id"] for r in ranked]
    dishes = {d["_id"]: d for d in db.dishes.find({"_id": {"$in": ids}, "is_available": True})}
    out = [dish_out(dishes[r["_id"]]) for r in ranked if r["_id"] in dishes]
    return out[:limit]


@router.get("/categories", response_model=list[schemas.CategoryOut])
def list_categories(db: Database = Depends(get_db)):
    names = [c["name"] for c in db.categories.find({}, {"name": 1}).sort("name", ASCENDING)]
    return [category_out(n) for n in names]


@router.get("/{dish_id}", response_model=schemas.DishOut)
def get_dish(dish_id: str, db: Database = Depends(get_db)):
    dish = db.dishes.find_one({"_id": oid(dish_id)})
    if not dish:
        raise HTTPException(404, "Dish not found")
    return dish_out(dish)
