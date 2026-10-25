"""
Feedback (formerly "contact"): a submission is
  1. stored in the `feedback` collection,
  2. shown publicly on the About page under "customer reviews" (GET /api/feedback),
  3. e-mailed via Web3Forms — the same service the original contact.html posted to —
     in a background task so a slow/failed mail never blocks the user.
"""
import json
import logging
import urllib.request

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from pymongo import DESCENDING
from pymongo.database import Database

from .. import schemas
from ..config import settings
from ..db import get_db, now
from ..serializers import feedback_out

router = APIRouter(prefix="/api/feedback", tags=["feedback"])
log = logging.getLogger("feastory.feedback")

WEB3FORMS_URL = "https://api.web3forms.com/submit"


def send_feedback_email(doc: dict) -> None:
    """POST to Web3Forms; the access key decides the receiving inbox."""
    if not settings.WEB3FORMS_ACCESS_KEY:
        return
    payload = {
        "access_key": settings.WEB3FORMS_ACCESS_KEY,
        "subject": f"Feastory feedback from {doc['name']} ({doc['rating']}/5)",
        "from_name": "Feastory",
        "name": doc["name"],
        "email": doc["email"],
        "phone": doc["phone"],
        "rating": f"{doc['rating']}/5",
        "message": doc["message"],
    }
    req = urllib.request.Request(
        WEB3FORMS_URL,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            log.info("feedback mail sent: %s", res.status)
    except Exception as exc:  # noqa: BLE001 — never fail the user's request over e-mail
        log.warning("feedback mail failed: %s", exc)


@router.post("", status_code=201, response_model=schemas.FeedbackOut)
def give_feedback(body: schemas.FeedbackIn, bg: BackgroundTasks, db: Database = Depends(get_db)):
    doc = {
        "name": body.name.strip(),
        "phone": body.phone,
        "email": body.email.lower(),
        "rating": body.rating,
        "message": body.message.strip(),
        "created_at": now(),
    }
    doc["_id"] = db.feedback.insert_one(doc).inserted_id
    bg.add_task(send_feedback_email, doc)
    return feedback_out(doc)


@router.get("", response_model=list[schemas.FeedbackOut])
def list_feedback(limit: int = Query(default=20, ge=1, le=100), db: Database = Depends(get_db)):
    """Newest first — rendered as review cards on the About page."""
    return [feedback_out(d) for d in db.feedback.find().sort("created_at", DESCENDING).limit(limit)]
