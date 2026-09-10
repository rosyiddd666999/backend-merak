import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

from .database import engine, Base, get_db
from .models import IncubatorSettings, User
from .routers import auth, breeders, eggs, chicks, incubator, sales, finance, dashboard, alerts, users
from .auth import get_password_hash

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("merak")

load_dotenv()

API_KEY_WEB = os.getenv("API_KEY_WEB", "dev-api-key-web")
API_KEY_ANDROID = os.getenv("API_KEY_ANDROID", "dev-api-key-android")
VALID_API_KEYS = {API_KEY_WEB, API_KEY_ANDROID}

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        settings = db.query(IncubatorSettings).first()
        if settings is None:
            default_settings = IncubatorSettings(
                suhu_min=37.0,
                suhu_max=38.0,
                kelembapan_min=55.0,
                kelembapan_max=65.0,
                interval_rotasi_menit=240,
            )
            db.add(default_settings)
            db.commit()

        first_user = db.query(User).first()
        if first_user is None:
            admin_email = os.getenv("FIRST_ADMIN_EMAIL")
            admin_password = os.getenv("FIRST_ADMIN_PASSWORD")
            if admin_email and admin_password:
                seed_user = User(
                    id="USR-001",
                    email=admin_email,
                    hashed_password=get_password_hash(admin_password),
                    nama="Admin Utama",
                    role="pemilik",
                )
                db.add(seed_user)
                db.commit()
                logger.info("Seeded first admin user: %s", admin_email)
    except Exception as e:
        logger.exception("Startup seed failed: %s", e)
    finally:
        db.close()
    yield


app = FastAPI(title="Kampung Merak API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "https://abdulrosyid.my.id")
origins = [o.strip() for o in CORS_ORIGINS.split(",")]
origins.extend(["http://localhost:3000", "http://localhost:8000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="Kampung Merak API",
        version="1.0.0",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "X-API-Key": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
        },
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        },
    }
    openapi_schema["security"] = [{"X-API-Key": [], "BearerAuth": []}]

    for path in openapi_schema["paths"].values():
        for method in path.values():
            method.pop("security", None)

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi


@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    if request.url.path in ["/docs", "/openapi.json", "/redoc", "/"]:
        return await call_next(request)

    api_key = request.headers.get("X-API-Key")
    if api_key not in VALID_API_KEYS:
        return JSONResponse(
            status_code=401,
            content={"detail": "X-API-Key tidak valid atau tidak disertakan"},
        )
    return await call_next(request)


app.include_router(auth.router)
app.include_router(breeders.router)
app.include_router(eggs.router)
app.include_router(chicks.router)
app.include_router(incubator.router)
app.include_router(sales.router)
app.include_router(finance.router)
app.include_router(dashboard.router)
app.include_router(alerts.router)
app.include_router(users.router)


@app.get("/")
def root():
    return {"message": "Kampung Merak API v1.0.0", "docs": "/docs"}
