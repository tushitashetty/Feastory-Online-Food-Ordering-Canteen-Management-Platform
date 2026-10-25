"""Canteen-manager endpoints: dish management (incl. ADD NEW DISH) + order board."""
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pymongo import ASCENDING, DESCENDING, ReturnDocument
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from .. import schemas
from ..auth import current_staff
from ..db import get_db, now, round2
from ..serializers import dish_out, order_out
from ..storage import save_image
from .menu_routes import oid

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(current_staff)])

STATUS_FLOW = ["placed", "ready", "served"]


def _clean(s: str) -> str:
    return " ".join(s.strip().split())


def _ensure_category(db: Database, name: str) -> str:
    """Returns the canonical category name, creating it if new (case-insensitive)."""
    clean = _clean(name)
    if not clean:
        raise HTTPException(400, "Category is required")
    existing = db.categories.find_one({"name_lower": clean.lower()})
    if existing:
        return existing["name"]
    try:
        db.categories.insert_one({"name": clean, "name_lower": clean.lower(), "created_at": now()})
    except DuplicateKeyError:
        pass
    return clean


# --------------------------------------------------------------- dishes ---
@router.get("/dishes", response_model=list[schemas.DishOut])
def all_dishes(db: Database = Depends(get_db)):
    """Includes unavailable dishes so the manager can re-enable them."""
    return [dish_out(d) for d in db.dishes.find().sort([("created_at", DESCENDING), ("_id", DESCENDING)])]


@router.post("/dishes", response_model=schemas.DishOut, status_code=201)
async def add_dish(
    name: str = Form(..., min_length=1, max_length=100),
    price: str = Form(...),
    category: str = Form(..., min_length=1, max_length=60),
    calories: int | None = Form(default=None, ge=0),
    image: UploadFile | None = File(default=None),
    db: Database = Depends(get_db),
):
    """
    NEW FEATURE — Add a dish (multipart/form-data so the image comes with it).
    Fields: name, price, category (existing or new), calories (optional), image (optional).
    """
    try:
        price_f = round2(price)
    except ValueError:
        raise HTTPException(422, "Price must be a number")
    if price_f <= 0:
        raise HTTPException(422, "Price must be greater than 0")

    clean_name = _clean(name)
    if db.dishes.find_one({"name_lower": clean_name.lower()}):
        raise HTTPException(409, f"A dish named '{clean_name}' already exists")

    image_url = await save_image(image) if image and image.filename else None
    doc = {
        "name": clean_name,
        "name_lower": clean_name.lower(),
        "price": price_f,
        "calories": calories,
        "category": _ensure_category(db, category),
        "image_url": image_url,
        "is_available": True,
        "created_at": now(),
    }
    try:
        db.dishes.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(409, f"A dish named '{clean_name}' already exists")
    return dish_out(doc)


@router.patch("/dishes/{dish_id}", response_model=schemas.DishOut)
def update_dish(dish_id: str, body: schemas.DishUpdate, db: Database = Depends(get_db)):
    patch: dict = {}
    if body.name is not None:
        patch["name"] = _clean(body.name)
        patch["name_lower"] = patch["name"].lower()
    if body.calories is not None:
        patch["calories"] = body.calories
    if body.price is not None:
        patch["price"] = round2(body.price)
    if body.category is not None:
        patch["category"] = _ensure_category(db, body.category)
    if body.is_available is not None:
        patch["is_available"] = body.is_available
    if not patch:
        raise HTTPException(400, "Nothing to update")
    try:
        doc = db.dishes.find_one_and_update({"_id": oid(dish_id)}, {"$set": patch}, return_document=ReturnDocument.AFTER)
    except DuplicateKeyError:
        raise HTTPException(409, f"A dish named '{patch.get('name')}' already exists")
    if not doc:
        raise HTTPException(404, "Dish not found")
    return dish_out(doc)


@router.post("/dishes/{dish_id}/image", response_model=schemas.DishOut)
async def replace_dish_image(dish_id: str, image: UploadFile = File(...), db: Database = Depends(get_db)):
    url = await save_image(image)
    doc = db.dishes.find_one_and_update({"_id": oid(dish_id)}, {"$set": {"image_url": url}}, return_document=ReturnDocument.AFTER)
    if not doc:
        raise HTTPException(404, "Dish not found")
    return dish_out(doc)


@router.delete("/dishes/{dish_id}", status_code=204)
def delete_dish(dish_id: str, db: Database = Depends(get_db)):
    _id = oid(dish_id)
    res = db.dishes.delete_one({"_id": _id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Dish not found")
    # Remove it from every cart; past orders keep their name/price snapshot.
    db.carts.update_many({"items.dish_id": _id}, {"$pull": {"items": {"dish_id": _id}}})


# --------------------------------------------------------------- orders ---
@router.get("/orders", response_model=list[schemas.OrderOut])
def orders_board(status: str | None = Query(default=None, pattern="^(placed|ready|served)$"), db: Database = Depends(get_db)):
    filt = {"status": status} if status else {}
    cur = db.orders.find(filt).sort([("created_at", ASCENDING), ("order_no", ASCENDING)])
    return [order_out(o) for o in cur]


@router.patch("/orders/{order_no}/status", response_model=schemas.OrderOut)
def set_order_status(order_no: int, body: schemas.OrderStatusUpdate, db: Database = Depends(get_db)):
    """placed -> ready -> served (only forward moves allowed)."""
    order = db.orders.find_one({"order_no": order_no})
    if not order:
        raise HTTPException(404, "Order not found")
    if STATUS_FLOW.index(body.status) < STATUS_FLOW.index(order["status"]):
        raise HTTPException(400, f"Cannot move order from {order['status']} back to {body.status}")
    doc = db.orders.find_one_and_update(
        {"order_no": order_no},
        {"$set": {"status": body.status, "updated_at": now()}},
        return_document=ReturnDocument.AFTER,
    )
    return order_out(doc)


# ------------------------------------------------------------- messages ---
@router.get("/messages")
def contact_messages(db: Database = Depends(get_db)):
    rows = db.contact_messages.find().sort("created_at", DESCENDING).limit(100)
    return [
        {"id": str(r["_id"]), "name": r["name"], "phone": r["phone"], "email": r["email"],
         "message": r["message"], "created_at": r["created_at"]}
        for r in rows
    ]
