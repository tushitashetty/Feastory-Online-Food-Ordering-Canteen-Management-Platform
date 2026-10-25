from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import connect, ensure_indexes, is_mock
from .routers import admin_routes, auth_routes, cart_routes, feedback_routes, menu_routes, order_routes
from .seed import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    db = connect()          # fails fast if MONGO_URL is wrong / IP not allow-listed on Atlas
    ensure_indexes(db)
    seed(db)
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title=settings.APP_NAME, version="2.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Turn pydantic's verbose validation errors into the one-line alerts the
# original site showed (e.g. "SAPID should be exactly 11 digits ...").
@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    first = exc.errors()[0]
    msg = first.get("msg", "Invalid input")
    msg = msg.removeprefix("Value error, ")
    field = ".".join(str(p) for p in first.get("loc", []) if p not in ("body", "query"))
    if field and not msg[0].isupper():
        msg = f"{field}: {msg}"
    return JSONResponse(status_code=422, content={"detail": msg})


app.include_router(auth_routes.router)
app.include_router(menu_routes.router)
app.include_router(cart_routes.router)
app.include_router(order_routes.router)
app.include_router(admin_routes.router)
app.include_router(feedback_routes.router)

# Locally uploaded dish images (STORAGE_BACKEND=local)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok", "storage": settings.STORAGE_BACKEND, "db": "mongomock (in-memory)" if is_mock() else settings.MONGO_DB}
