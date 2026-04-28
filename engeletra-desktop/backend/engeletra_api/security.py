from __future__ import annotations

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware

from .settings import API_TOKEN


class LocalApiTokenMiddleware(BaseHTTPMiddleware):
    """Optional local API token gate for packaged desktop builds.

    During development, API_TOKEN may be empty. In production, Electron should
    start the Python backend with a random token and attach it to every request.
    """

    async def dispatch(self, request: Request, call_next):
        if not API_TOKEN:
            return await call_next(request)

        if request.url.path in {"/health", "/docs", "/openapi.json"}:
            return await call_next(request)

        token = request.headers.get("x-engeletra-token")
        if token != API_TOKEN:
            raise HTTPException(status_code=401, detail="Acesso local não autorizado")

        return await call_next(request)
