"""
Cart = one document per student:  carts { _id: sapid, items: [{dish_id, quantity, added_at}] }
The cart item's public id is the dish id (one line per dish).
"""
from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from .. import schemas
from ..auth import current_student
from ..db import get_db, now, round2
from ..serializers import dish_out
from .menu_routes import oid

router = APIRouter(prefix="/api/cart", tags=["cart"])


def build_cart(db: Database, sapid: int) -> schemas.CartOut:
    cart = db.carts.find_one({"_id": sapid}) or {"items": []}
    dish_ids = [i["dish_id"] for i in cart["items"]]
    dishes = {d["_id"]: d for d in db.dishes.find({"_id": {"$in": dish_ids}})} if dish_ids else {}

    items, total = [], 0.0
    for i in cart["items"]:
        d = dishes.get(i["dish_id"])
        if not d:
            continue  # dish deleted since it was added
        items.append(schemas.CartItemOut(id=str(d["_id"]), dish=dish_out(d), quantity=int(i["quantity"])))
        total += float(d["price"]) * int(i["quantity"])
    return schemas.CartOut(items=items, total=round2(total))


@router.get("", response_model=schemas.CartOut)
def get_cart(student: dict = Depends(current_student), db: Database = Depends(get_db)):
    return build_cart(db, student["_id"])


@router.post("", response_model=schemas.CartOut, status_code=201)
def add_to_cart(body: schemas.CartAdd, student: dict = Depends(current_student), db: Database = Depends(get_db)):
    dish_id = oid(body.dish_id)
    dish = db.dishes.find_one({"_id": dish_id, "is_available": True})
    if not dish:
        raise HTTPException(404, "Dish not available")

    sapid = student["_id"]
    cart = db.carts.find_one({"_id": sapid, "items.dish_id": dish_id})
    if cart:
        current = next(i["quantity"] for i in cart["items"] if i["dish_id"] == dish_id)
        db.carts.update_one(
            {"_id": sapid, "items.dish_id": dish_id},
            {"$set": {"items.$.quantity": min(99, int(current) + body.quantity)}},
        )
    else:
        db.carts.update_one(
            {"_id": sapid},
            {"$push": {"items": {"dish_id": dish_id, "quantity": body.quantity, "added_at": now()}}},
            upsert=True,
        )
    return build_cart(db, sapid)


@router.patch("/{item_id}", response_model=schemas.CartOut)
def update_cart_item(
    item_id: str, body: schemas.CartUpdate, student: dict = Depends(current_student), db: Database = Depends(get_db)
):
    res = db.carts.update_one(
        {"_id": student["_id"], "items.dish_id": oid(item_id)},
        {"$set": {"items.$.quantity": body.quantity}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Cart item not found")
    return build_cart(db, student["_id"])


@router.delete("/{item_id}", response_model=schemas.CartOut)
def delete_cart_item(item_id: str, student: dict = Depends(current_student), db: Database = Depends(get_db)):
    res = db.carts.update_one({"_id": student["_id"]}, {"$pull": {"items": {"dish_id": oid(item_id)}}})
    if res.modified_count == 0:
        raise HTTPException(404, "Cart item not found")
    return build_cart(db, student["_id"])


@router.delete("", response_model=schemas.CartOut)
def clear_cart(student: dict = Depends(current_student), db: Database = Depends(get_db)):
    db.carts.delete_one({"_id": student["_id"]})
    return build_cart(db, student["_id"])
