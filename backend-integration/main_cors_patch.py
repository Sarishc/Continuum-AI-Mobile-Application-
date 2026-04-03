"""
Patch to apply to your FastAPI main.py:

1. Add the CORS middleware configuration below.
2. Add MobileSchemeMiddleware to allow expo:// redirect URIs during dev.

Copy the relevant sections into your existing main.py.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

# ─── CORS ────────────────────────────────────────────────────────────────────
# Add this after `app = FastAPI(...)` in your main.py

def add_cors(app: FastAPI) -> None:
    origins = [
        # Local Expo dev
        "http://localhost:8081",
        "http://localhost:19000",
        "http://localhost:19001",
        # EAS / production (replace with your actual domain)
        "https://continuum-ai.app",
        "https://api.continuum-ai.app",
        # Expo Go deep-link scheme
        "exp://",
        "expo://",
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )


# ─── Mobile scheme middleware ─────────────────────────────────────────────────
# Strips the custom scheme prefix from Origin headers sent by Expo Go
# so CORS validation doesn't reject native deep-link origins.

class MobileSchemeMiddleware(BaseHTTPMiddleware):
    ALLOWED_SCHEMES = {"exp", "expo", "continuumhealth"}

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        scheme = origin.split("://")[0].lower()
        if scheme in self.ALLOWED_SCHEMES:
            # Rewrite to a safe placeholder so CORSMiddleware accepts it
            headers = dict(request.headers)
            headers["origin"] = "http://localhost:8081"
            request._headers = request.headers.__class__(
                scope=request.scope,
                headers=[(k.encode(), v.encode()) for k, v in headers.items()],
            )
        return await call_next(request)


# ─── Usage ────────────────────────────────────────────────────────────────────
# In your main.py:
#
#   from backend_integration.main_cors_patch import add_cors, MobileSchemeMiddleware
#
#   app = FastAPI(...)
#   app.add_middleware(MobileSchemeMiddleware)
#   add_cors(app)
