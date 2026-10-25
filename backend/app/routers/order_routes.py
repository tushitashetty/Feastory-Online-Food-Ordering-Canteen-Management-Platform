from fastapi import APIRouter, Depends, HTTPException
from pymongo import DESCENDING
from pymongo.database import Database
from pymongo.errors import OperationFailure

from .. import schemas
from ..auth import current_student
from ..db import client, get_db, is_mock, next_sequence, now, round2
from ..serializers import order_out, student_out, txn_out

router = APIRouter(prefix="/api", tags=["orders & wallet"])


# ------------------------------------------------------------ checkout ---
def _checkout_steps(db: Database, student: dict, payment_method: str, session=None) -> tuple[dict, float]:
    """
    1. read cart + current dish prices
    2. atomically debit the wallet  (filter balance >= total — cannot double-spend)
    3. insert order (with item snapshots) + wallet transaction
    4. clear the cart
    """
    sapid = student["_id"]
    cart = db.carts.find_one({"_id": sapid}, session=session)
    if not cart or not cart["items"]:
        raise HTTPException(400, "Your cart is empty.")

    dishes = {d["_id"]: d for d in db.dishes.find({"_id": {"$in": [i["dish_id"] for i in cart["items"]]}}, session=session)}
    lines, total = [], 0.0
    unavailable = []
    for i in cart["items"]:
        d = dishes.get(i["dish_id"])
        if not d:
            continue
        if not d.get("is_available", True):
            unavailable.append(d["name"])
        lines.append(
            {"dish_id": d["_id"], "dish_name": d["name"], "unit_price": float(d["price"]), "quantity": int(i["quantity"])}
        )
        total += float(d["price"]) * int(i["quantity"])
    if unavailable:
        raise HTTPException(400, f"No longer available: {', '.join(unavailable)}")
    if not lines:
        raise HTTPException(400, "Your cart is empty.")
    total = round2(total)

    # Atomic conditional debit: only succeeds if balance is still sufficient.
    updated = db.students.find_one_and_update(
        {"_id": sapid, "balance": {"$gte": total}},
        {"$inc": {"balance": -total}},
        return_document=True,
        session=session,
    )
    if updated is None:
        fresh = db.students.find_one({"_id": sapid}, {"balance": 1}, session=session)
        raise HTTPException(402, f"Insufficient eWallet balance. Your current balance is ₹{round2(fresh['balance'])}.")
    new_balance = round2(updated["balance"])

    ts = now()
    order = {
        "order_no": next_sequence(db, "orders", session=session),
        "student_sapid": sapid,
        "student_name": student["name"],
        "total_amount": total,
        "payment_method": payment_method,
        "status": "placed",
        "items": lines,
        "created_at": ts,
        "updated_at": ts,
    }
    db.orders.insert_one(order, session=session)
    db.wallet_transactions.insert_one(
        {
            "student_sapid": sapid,
            "kind": "debit",
            "amount": total,
            "balance_after": new_balance,
            "order_no": order["order_no"],
            "note": f"Order #{order['order_no']}",
            "created_at": ts,
        },
        session=session,
    )
    db.carts.delete_one({"_id": sapid}, session=session)
    return order, new_balance


@router.post("/orders/checkout", response_model=schemas.CheckoutOut, status_code=201)
def checkout(body: schemas.CheckoutIn, student: dict = Depends(current_student), db: Database = Depends(get_db)):
    """
    On Atlas / any replica set this runs as a multi-document transaction.
    On a standalone mongod (or the mock) transactions aren't available, so
    it falls back to the same steps without one — the conditional $inc still
    guarantees the wallet can never go negative.
    """
    if not is_mock():
        try:
            with client().start_session() as s:
                order, bal = s.with_transaction(lambda sess: _checkout_steps(db, student, body.payment_method, sess))
                return schemas.CheckoutOut(order=order_out(order), new_balance=bal)
        except OperationFailure as e:
            if "Transaction numbers" not in str(e) and "replica set" not in str(e):
                raise
            # standalone server -> fall through
    order, bal = _checkout_steps(db, student, body.payment_method)
    return schemas.CheckoutOut(order=order_out(order), new_balance=bal)


@router.get("/orders", response_model=list[schemas.OrderOut])
def my_orders(student: dict = Depends(current_student), db: Database = Depends(get_db)):
    cur = db.orders.find({"student_sapid": student["_id"]}).sort([("created_at", DESCENDING), ("order_no", DESCENDING)])
    return [order_out(o) for o in cur]


@router.get("/orders/{order_no}", response_model=schemas.OrderOut)
def my_order(order_no: int, student: dict = Depends(current_student), db: Database = Depends(get_db)):
    o = db.orders.find_one({"order_no": order_no, "student_sapid": student["_id"]})
    if not o:
        raise HTTPException(404, "Order not found")
    return order_out(o)


# -------------------------------------------------------------- wallet ---
@router.post("/wallet/topup", response_model=schemas.StudentOut)
def top_up(body: schemas.TopUpIn, student: dict = Depends(current_student), db: Database = Depends(get_db)):
    amt = round2(body.amount)
    updated = db.students.find_one_and_update(
        {"_id": student["_id"]}, {"$inc": {"balance": amt}}, return_document=True
    )
    db.wallet_transactions.insert_one(
        {
            "student_sapid": student["_id"],
            "kind": "credit",
            "amount": amt,
            "balance_after": round2(updated["balance"]),
            "order_no": None,
            "note": "Wallet top-up",
            "created_at": now(),
        }
    )
    return student_out(updated)


@router.get("/wallet/transactions", response_model=list[schemas.WalletTxnOut])
def transactions(student: dict = Depends(current_student), db: Database = Depends(get_db)):
    cur = db.wallet_transactions.find({"student_sapid": student["_id"]}).sort([("created_at", DESCENDING), ("_id", DESCENDING)]).limit(50)
    return [txn_out(t) for t in cur]
