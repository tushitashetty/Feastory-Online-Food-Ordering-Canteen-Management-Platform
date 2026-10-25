"""
Populates an empty database with the categories from the original site's
dropdown, the six dishes shown on the original home page, and one canteen
manager account (Emp ID / PIN from config). Safe to run repeatedly.
"""
from pymongo.database import Database

from .auth import hash_secret
from .config import settings
from .db import now

CATEGORIES = [
    "Breakfast", "Chinese", "Chaat", "North Indian", "South Indian", "Hot beverages",
    "Beverages", "Juices", "Egg preparation", "Sandwiches", "Pav Bhaji", "Frankie",
]

# image_url is a path served by the React app's /public/images folder.
DISHES = [
    ("Vada Pav", 17, "Breakfast", 290, "/images/vadapav.jpg"),
    ("Pav Bhaji", 63, "Pav Bhaji", 400, "/images/pav_bhaji.jpg"),
    ("Manchurian Franky", 58, "Frankie", 350, "/images/veg_manchurian_dry.jpg"),
    ("Schezwan Fried Rice", 76, "Chinese", 420, "/images/schezwan_fried_rice.jpg"),
    ("Fresh Juice", 30, "Juices", 120, "/images/watermelon_juice.jpg"),
    ("Veg Sandwich", 32, "Sandwiches", 250, "/images/veg_sandwich.jpg"),
]


def seed(db: Database) -> None:
    if db.categories.estimated_document_count() == 0:
        db.categories.insert_many([{"name": c, "name_lower": c.lower(), "created_at": now()} for c in CATEGORIES])

    if db.dishes.estimated_document_count() == 0:
        # Inserted in reverse so the newest-first "latest dishes" grid shows
        # the same left-to-right order as the original home page.
        db.dishes.insert_many(
            [
                {"name": n, "name_lower": n.lower(), "price": float(p), "category": c, "calories": cal, "image_url": img,
                 "is_available": True, "created_at": now()}
                for n, p, c, cal, img in reversed(DISHES)
            ]
        )

    if db.canteen_staff.estimated_document_count() == 0:
        db.canteen_staff.insert_one(
            {"_id": settings.SEED_STAFF_EMP_ID, "name": settings.SEED_STAFF_NAME,
             "pin_hash": hash_secret(settings.SEED_STAFF_PIN), "created_at": now()}
        )
