"""Mongo document -> API schema converters."""
from . import schemas


def student_out(doc: dict) -> schemas.StudentOut:
    return schemas.StudentOut(
        sapid=int(doc["_id"]), name=doc["name"], email=doc["email"], balance=float(doc["balance"])
    )


def staff_out(doc: dict) -> schemas.StaffOut:
    return schemas.StaffOut(emp_id=int(doc["_id"]), name=doc["name"])


def category_out(name: str) -> schemas.CategoryOut:
    # Categories are referenced by name inside dish documents (denormalised,
    # the idiomatic Mongo choice). The id mirrors the name so the frontend's
    # `category.id` / `category.name` keep working unchanged.
    return schemas.CategoryOut(id=name, name=name)


def dish_out(doc: dict) -> schemas.DishOut:
    return schemas.DishOut(
        id=str(doc["_id"]),
        name=doc["name"],
        calories=doc.get("calories"),
        price=float(doc["price"]),
        category=category_out(doc["category"]),
        image_url=doc.get("image_url"),
        is_available=bool(doc.get("is_available", True)),
        created_at=doc["created_at"],
    )


def order_out(doc: dict) -> schemas.OrderOut:
    return schemas.OrderOut(
        id=int(doc["order_no"]),
        student_sapid=int(doc["student_sapid"]),
        student_name=doc.get("student_name"),
        total_amount=float(doc["total_amount"]),
        payment_method=doc["payment_method"],
        status=doc["status"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        items=[
            schemas.OrderItemOut(
                dish_name=i["dish_name"], unit_price=float(i["unit_price"]), quantity=int(i["quantity"])
            )
            for i in doc["items"]
        ],
    )


def txn_out(doc: dict) -> schemas.WalletTxnOut:
    return schemas.WalletTxnOut(
        id=str(doc["_id"]),
        kind=doc["kind"],
        amount=float(doc["amount"]),
        balance_after=float(doc["balance_after"]),
        order_id=doc.get("order_no"),
        note=doc.get("note"),
        created_at=doc["created_at"],
    )


def feedback_out(doc: dict) -> schemas.FeedbackOut:
    return schemas.FeedbackOut(
        id=str(doc["_id"]),
        name=doc["name"],
        rating=int(doc.get("rating", 5)),
        message=doc["message"],
        created_at=doc["created_at"],
    )
