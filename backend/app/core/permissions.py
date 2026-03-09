"""Role-based access control decorators and data-level filtering utilities."""

import logging
from collections.abc import Callable
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_async_session
from app.modules.auth.models import User, UserRole, has_permission

logger = logging.getLogger(__name__)


async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_async_session),  # noqa: B008
) -> User:
    """Extract and validate the current user from JWT bearer token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid token")

    token = auth_header.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except JWTError as err:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token validation failed") from err

    user = await session.get(User, UUID(user_id))
    if not user or not user.is_active or user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return user


def require_role(*allowed_roles: str) -> Callable:
    """FastAPI dependency factory that checks the current user's role.

    Usage::

        @router.get("/admin-only", dependencies=[Depends(require_role("admin"))])
        async def admin_endpoint(): ...
    """

    async def _checker(
        request: Request,
        session: AsyncSession = Depends(get_async_session),  # noqa: B008
    ) -> User:
        user = await get_current_user(request, session)

        # Check the legacy single-role field first
        if user.role in allowed_roles:
            return user

        # Then check the many-to-many user_roles table
        q = select(UserRole).where(UserRole.user_id == user.id)
        result = await session.execute(q)
        user_role_rows = result.scalars().all()

        from app.modules.auth.models import Role

        for ur in user_role_rows:
            role = await session.get(Role, ur.role_id)
            if role and role.name in allowed_roles:
                return user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires one of roles: {', '.join(allowed_roles)}",
        )

    return _checker


def require_permission(action: str) -> Callable:
    """FastAPI dependency that checks if the user has a specific permission action.

    Uses the ROLE_PERMISSIONS matrix from auth models.

    Usage::

        @router.post("/cases", dependencies=[Depends(require_permission("testcases:write"))])
        async def create_case(): ...
    """

    async def _checker(
        request: Request,
        session: AsyncSession = Depends(get_async_session),  # noqa: B008
    ) -> User:
        user = await get_current_user(request, session)

        if has_permission(user.role, action):
            return user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing permission: {action}",
        )

    return _checker


async def filter_by_product_access(
    session: AsyncSession,
    user: User,
    product_ids: list[UUID] | None = None,
) -> list[UUID] | None:
    """Return the subset of product_ids the user has access to.

    - admin: no filtering (returns None meaning "all").
    - Others: restrict to products assigned via UserRole.
    """
    if user.role == "admin":
        return None  # no restriction

    q = select(UserRole.product_id).where(
        UserRole.user_id == user.id,
        UserRole.product_id.is_not(None),
    )
    result = await session.execute(q)
    allowed = {row for row in result.scalars().all() if row is not None}

    if not allowed:
        return []

    if product_ids is None:
        return list(allowed)

    return [pid for pid in product_ids if pid in allowed]
