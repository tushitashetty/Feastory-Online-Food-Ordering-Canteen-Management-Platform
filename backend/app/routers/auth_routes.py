from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from .. import schemas
from ..auth import create_token, current_staff, current_student, hash_secret, verify_secret
from ..config import settings
from ..db import get_db, now, round2
from ..serializers import staff_out, student_out

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ------------------------------------------------------------ student ---
@router.post("/student/register", response_model=schemas.TokenOut, status_code=201)
def register_student(body: schemas.StudentRegister, db: Database = Depends(get_db)):
    sapid = int(body.sapid)
    email = body.email.lower()
    if db.students.find_one({"_id": sapid}):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this SAP ID already exists")
    if db.students.find_one({"email": email}):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    start = round2(settings.STARTING_BALANCE)
    doc = {
        "_id": sapid,
        "name": body.name,
        "email": email,
        "password_hash": hash_secret(body.password),
        "balance": start,
        "created_at": now(),
    }
    try:
        db.students.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this SAP ID or email already exists")

    if start > 0:
        db.wallet_transactions.insert_one(
            {
                "student_sapid": sapid,
                "kind": "credit",
                "amount": start,
                "balance_after": start,
                "order_no": None,
                "note": "Welcome balance",
                "created_at": now(),
            }
        )
    return schemas.TokenOut(access_token=create_token(sapid, "student"), role="student", user=student_out(doc))


@router.post("/student/login", response_model=schemas.TokenOut)
def login_student(body: schemas.StudentLogin, db: Database = Depends(get_db)):
    student = db.students.find_one({"_id": int(body.sapid)})
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if not verify_secret(body.password, student["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect password.")
    return schemas.TokenOut(
        access_token=create_token(student["_id"], "student"), role="student", user=student_out(student)
    )


@router.get("/student/me", response_model=schemas.StudentOut)
def me_student(student: dict = Depends(current_student)):
    return student_out(student)


# -------------------------------------------------------------- staff ---
@router.post("/staff/login", response_model=schemas.TokenOut)
def login_staff(body: schemas.StaffLogin, db: Database = Depends(get_db)):
    staff = db.canteen_staff.find_one({"_id": int(body.emp_id)})
    if not staff:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invalid credentials or user not found.")
    if not verify_secret(body.pin, staff["pin_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect PIN.")
    return schemas.TokenOut(access_token=create_token(staff["_id"], "staff"), role="staff", user=staff_out(staff))


@router.get("/staff/me", response_model=schemas.StaffOut)
def me_staff(staff: dict = Depends(current_staff)):
    return staff_out(staff)
