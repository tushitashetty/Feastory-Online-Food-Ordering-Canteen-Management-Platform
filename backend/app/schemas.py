"""Pydantic request/response models. Validation rules match the original site."""
import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

SAPID_RE = re.compile(r"^[1-9][0-9]{10}$")          # 11 digits, no leading 0
EMP_ID_RE = re.compile(r"^[1-9][0-9]{9}$")          # 10 digits, no leading 0
PIN_RE = re.compile(r"^[0-9]{4}$")
PASSWORD_RE = re.compile(
    r"^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$#!%*&])[A-Za-z\d@$#!%*&]{8,}$"
)
NAME_RE = re.compile(r"^[a-zA-Z\s]+$")


# ---------------------------------------------------------------- auth ---
class StudentRegister(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    sapid: str
    password: str

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = v.strip()
        if not NAME_RE.match(v):
            raise ValueError("Name must have only letters")
        return v

    @field_validator("sapid")
    @classmethod
    def _sapid(cls, v: str) -> str:
        if not SAPID_RE.match(v):
            raise ValueError("SAPID should be exactly 11 digits and should not start with 0.")
        return v

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        if not PASSWORD_RE.match(v):
            raise ValueError(
                "Password must have 8+ chars, 1 uppercase, 1 lowercase, 1 number, and 1 special symbol."
            )
        return v


class StudentLogin(BaseModel):
    sapid: str
    password: str

    @field_validator("sapid")
    @classmethod
    def _sapid(cls, v: str) -> str:
        if not SAPID_RE.match(v):
            raise ValueError("SAPID should be exactly 11 digits and should not start with 0.")
        return v


class StaffLogin(BaseModel):
    emp_id: str
    pin: str

    @field_validator("emp_id")
    @classmethod
    def _emp(cls, v: str) -> str:
        if not EMP_ID_RE.match(v):
            raise ValueError("Employee ID should be exactly 10 digits and should not start with 0.")
        return v

    @field_validator("pin")
    @classmethod
    def _pin(cls, v: str) -> str:
        if not PIN_RE.match(v):
            raise ValueError("PIN should be exactly 4 digits.")
        return v


class StudentOut(BaseModel):
    sapid: int
    name: str
    email: str
    balance: float


class StaffOut(BaseModel):
    emp_id: int
    name: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Literal["student", "staff"]
    user: StudentOut | StaffOut


# ---------------------------------------------------------------- menu ---
class CategoryOut(BaseModel):
    id: str
    name: str


class DishOut(BaseModel):
    id: str                      # MongoDB ObjectId as a string
    name: str
    calories: int | None
    price: float
    category: CategoryOut
    image_url: str | None
    is_available: bool
    created_at: datetime


class DishUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    calories: int | None = Field(default=None, ge=0)
    price: float | None = Field(default=None, gt=0)
    category: str | None = Field(default=None, min_length=1, max_length=60)
    is_available: bool | None = None


# ---------------------------------------------------------------- cart ---
class CartAdd(BaseModel):
    dish_id: str
    quantity: int = Field(default=1, ge=1, le=99)


class CartUpdate(BaseModel):
    quantity: int = Field(ge=1, le=99)


class CartItemOut(BaseModel):
    id: str                      # == dish id (one line per dish in the cart)
    dish: DishOut
    quantity: int


class CartOut(BaseModel):
    items: list[CartItemOut]
    total: float


# -------------------------------------------------------------- orders ---
class CheckoutIn(BaseModel):
    payment_method: Literal["eWallet"] = "eWallet"


class OrderItemOut(BaseModel):
    dish_name: str
    unit_price: float
    quantity: int


class OrderOut(BaseModel):
    id: int                      # human-readable order number (#1, #2, ...)
    student_sapid: int
    student_name: str | None = None
    total_amount: float
    payment_method: str
    status: str
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemOut]


class CheckoutOut(BaseModel):
    order: OrderOut
    new_balance: float


class OrderStatusUpdate(BaseModel):
    status: Literal["placed", "ready", "served"]


# -------------------------------------------------------------- wallet ---
class TopUpIn(BaseModel):
    amount: float = Field(gt=0, le=10000)


class WalletTxnOut(BaseModel):
    id: str
    kind: str
    amount: float
    balance_after: float
    order_id: int | None
    note: str | None
    created_at: datetime


# ------------------------------------------------------------ feedback ---
class FeedbackIn(BaseModel):
    """The 'give feedback' form (was the contact form). Shown as a customer review on About."""
    name: str = Field(min_length=1, max_length=50)
    phone: str = Field(pattern=r"^[0-9]{10}$")
    email: EmailStr
    rating: int = Field(ge=1, le=5)
    message: str = Field(min_length=1, max_length=500)


class FeedbackOut(BaseModel):
    """Public review card — deliberately excludes phone/e-mail."""
    id: str
    name: str
    rating: int
    message: str
    created_at: datetime
