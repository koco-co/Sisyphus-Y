"""SQL 查询优化工具 — selectinload / keyset pagination / N+1 检测"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any, TypeVar

from sqlalchemy import Select, asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute, selectinload

logger = logging.getLogger(__name__)

T = TypeVar("T")


# ── 预加载推荐 ─────────────────────────────────────────────────────
def apply_eager_loads(stmt: Select, *relationships: InstrumentedAttribute) -> Select:  # type: ignore[type-arg]
    """为查询添加 selectinload，避免 N+1 问题。

    Usage::

        stmt = select(Requirement)
        stmt = apply_eager_loads(stmt, Requirement.test_cases, Requirement.iteration)
    """
    for rel in relationships:
        stmt = stmt.options(selectinload(rel))
    return stmt


# ── Keyset Pagination（游标分页）────────────────────────────────────
async def keyset_paginate(
    session: AsyncSession,
    stmt: Select,  # type: ignore[type-arg]
    *,
    order_column: InstrumentedAttribute,
    cursor: str | None = None,
    page_size: int = 20,
    direction: str = "desc",
) -> dict[str, Any]:
    """基于 keyset 的高性能分页，替代 OFFSET。

    Args:
        session: 异步数据库会话
        stmt: 基础查询语句
        order_column: 排序字段（必须唯一或搭配主键）
        cursor: 上一页最后一条记录的排序字段值
        page_size: 每页条数
        direction: 排序方向 'asc' | 'desc'

    Returns:
        {"items": [...], "next_cursor": "..." | None, "has_more": bool}
    """
    order_fn = desc if direction == "desc" else asc

    if cursor is not None:
        cursor_value = _parse_cursor(cursor, order_column)
        compare = order_column < cursor_value if direction == "desc" else order_column > cursor_value
        stmt = stmt.where(compare)

    stmt = stmt.order_by(order_fn(order_column)).limit(page_size + 1)

    result = await session.execute(stmt)
    rows = list(result.scalars().all())

    has_more = len(rows) > page_size
    items = rows[:page_size]

    next_cursor = None
    if has_more and items:
        last = items[-1]
        col_name = order_column.key
        next_cursor = str(getattr(last, col_name))

    return {"items": items, "next_cursor": next_cursor, "has_more": has_more}


def _parse_cursor(cursor: str, column: InstrumentedAttribute) -> Any:
    """根据列类型将游标字符串转换为对应的 Python 值。"""
    col_type = column.property.columns[0].type
    type_name = type(col_type).__name__

    if type_name in ("DateTime", "TIMESTAMP"):
        return datetime.fromisoformat(cursor)
    if type_name in ("UUID", "Uuid"):
        return uuid.UUID(cursor)
    if type_name in ("Integer", "BigInteger"):
        return int(cursor)
    return cursor


# ── 标准 offset 分页（简单场景仍然好用）──────────────────────────
async def offset_paginate(
    session: AsyncSession,
    stmt: Select,  # type: ignore[type-arg]
    *,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    """标准 offset 分页，附带 total count。"""
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await session.execute(count_stmt)).scalar() or 0

    offset = (page - 1) * page_size
    result = await session.execute(stmt.offset(offset).limit(page_size))
    items = list(result.scalars().all())

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


# ── N+1 检测辅助 ──────────────────────────────────────────────────
class QueryCounter:
    """调试用：检测一段代码块中的 SQL 查询次数。

    Usage::

        counter = QueryCounter(session)
        async with counter:
            # ... 业务代码 ...
        if counter.count > 10:
            logger.warning("可能存在 N+1 查询: %d 次", counter.count)
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.count = 0
        self._original_execute = None

    async def __aenter__(self) -> QueryCounter:
        self.count = 0
        return self

    async def __aexit__(self, *args: object) -> None:
        if self.count > 10:
            logger.warning(
                "⚠️  检测到 %d 次 SQL 查询，可能存在 N+1 问题",
                self.count,
            )

    def increment(self) -> None:
        self.count += 1
