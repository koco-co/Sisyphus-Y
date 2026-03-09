"""Audit logging middleware — records POST/PUT/PATCH/DELETE operations automatically.

Captures request metadata (user, IP, user-agent) and, where possible, the
request body as a "new_value" snapshot for the audit trail.
"""

import json
import logging
import uuid

from fastapi import Request
from fastapi.responses import Response
from starlette.middleware.base import RequestResponseEndpoint

from app.core.database import get_async_session_context
from app.modules.audit.models import AuditLog

logger = logging.getLogger(__name__)

_AUDITED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
_SKIP_PATHS = {"/health", "/docs", "/openapi.json", "/redoc", "/api/auth/login", "/api/auth/register"}
_MAX_BODY_SIZE = 64 * 1024  # 64 KB


def _extract_entity_info(path: str, method: str) -> tuple[str, str, uuid.UUID | None]:
    """Derive (action, entity_type, entity_id) from the URL path and HTTP method."""
    parts = [p for p in path.removeprefix("/api/").split("/") if p]

    action_map = {
        "POST": "create",
        "PUT": "update",
        "PATCH": "update",
        "DELETE": "delete",
    }
    action = action_map.get(method, method.lower())
    entity_type = parts[0] if parts else "unknown"

    entity_id: uuid.UUID | None = None
    for part in parts[1:]:
        try:
            entity_id = uuid.UUID(part)
            break
        except ValueError:
            continue

    return action, entity_type, entity_id


def _extract_user_id(request: Request) -> uuid.UUID | None:
    """Try to extract user_id from the JWT token (best effort)."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        from jose import jwt

        from app.core.config import settings

        token = auth.removeprefix("Bearer ").strip()
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        sub = payload.get("sub")
        return uuid.UUID(sub) if sub else None
    except Exception:
        return None


async def audit_logging_middleware(request: Request, call_next: RequestResponseEndpoint) -> Response:
    """FastAPI middleware that automatically records audit entries for mutating operations."""
    method = request.method

    if method not in _AUDITED_METHODS:
        return await call_next(request)

    path = request.url.path
    if any(path.startswith(skip) for skip in _SKIP_PATHS):
        return await call_next(request)

    # Capture request body for "new_value" snapshot
    new_value: dict | None = None
    try:
        body = await request.body()
        if body and len(body) <= _MAX_BODY_SIZE:
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                new_value = json.loads(body)
    except Exception:
        pass

    response = await call_next(request)

    # Only log successful mutations (2xx)
    if not (200 <= response.status_code < 300):
        return response

    action, entity_type, entity_id = _extract_entity_info(path, method)
    user_id = _extract_user_id(request)

    try:
        async with get_async_session_context() as session:
            log = AuditLog(
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                old_value=None,  # before-snapshot requires entity fetch, tracked via old_value=None
                new_value=new_value,
                ip_address=request.client.host if request.client else None,
                user_agent=(request.headers.get("user-agent") or "")[:500] or None,
            )
            session.add(log)
    except Exception:
        logger.warning("Failed to write audit log for %s %s", method, path, exc_info=True)

    return response
