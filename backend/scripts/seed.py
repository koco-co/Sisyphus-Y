"""Seed initial data: default admin user, demo product/iteration/requirement."""

import asyncio
import hashlib
import os
import sys
import uuid
from datetime import date, datetime

# Ensure the backend directory is on sys.path so `app` package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session_factory


def _hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


async def seed() -> None:
    print("Seeding database...")
    factory = get_session_factory()
    async with factory() as session:
        session: AsyncSession

        # Check if admin already exists
        result = await session.execute(
            text("SELECT id FROM users WHERE username = 'admin' LIMIT 1")
        )
        if result.scalar():
            print("Admin user already exists — skipping seed.")
            return

        now = datetime.utcnow()
        admin_id = uuid.uuid4()
        product_id = uuid.uuid4()
        iteration_id = uuid.uuid4()
        req_id = uuid.uuid4()

        # Admin user
        await session.execute(
            text(
                "INSERT INTO users (id, email, username, hashed_password, full_name, is_active, role, created_at, updated_at) "
                "VALUES (:id, :email, :username, :pw, :name, true, 'admin', :now, :now)"
            ),
            {
                "id": admin_id,
                "email": "admin@sisyphus.dev",
                "username": "admin",
                "pw": _hash_pw("admin123"),
                "name": "系统管理员",
                "now": now,
            },
        )

        # Demo product
        await session.execute(
            text(
                "INSERT INTO products (id, name, slug, description, created_at, updated_at) "
                "VALUES (:id, :name, :slug, :desc, :now, :now)"
            ),
            {
                "id": product_id,
                "name": "数据中台",
                "slug": "data-platform",
                "desc": "企业级数据中台核心系统",
                "now": now,
            },
        )

        # Demo iteration
        await session.execute(
            text(
                "INSERT INTO iterations (id, product_id, name, start_date, end_date, status, created_at, updated_at) "
                "VALUES (:id, :pid, :name, :start, :end, 'active', :now, :now)"
            ),
            {
                "id": iteration_id,
                "pid": product_id,
                "name": "Sprint 2025-Q1",
                "start": date(2025, 1, 1),
                "end": date(2025, 3, 31),
                "now": now,
            },
        )

        # Demo requirement
        await session.execute(
            text(
                "INSERT INTO requirements (id, iteration_id, req_id, title, content_ast, status, version, created_at, updated_at) "
                "VALUES (:id, :iid, :rid, :title, :ast, 'draft', 1, :now, :now)"
            ),
            {
                "id": req_id,
                "iid": iteration_id,
                "rid": "REQ-001",
                "title": "用户数据源接入管理",
                "ast": '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"支持多种数据源（MySQL, PostgreSQL, MongoDB, API）的统一接入与管理。"}]}]}',
                "now": now,
            },
        )

        await session.commit()
    print("Seed complete — admin user (admin / admin123) and demo data created.")


if __name__ == "__main__":
    asyncio.run(seed())
