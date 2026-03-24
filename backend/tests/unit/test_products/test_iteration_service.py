"""B-M00-14 — IterationService 单元测试"""

from __future__ import annotations

import uuid
from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.products.models import Product, RequirementFolder
from app.modules.products.schemas import IterationCreate, IterationUpdate
from app.modules.products.service import IterationService

# ── Helpers ──────────────────────────────────────────────────────────


def _make_iteration(
    name: str = "Sprint-1",
    product_id: uuid.UUID | None = None,
    status: str = "active",
):
    it = MagicMock()
    it.id = uuid.uuid4()
    it.product_id = product_id or uuid.uuid4()
    it.name = name
    it.start_date = None
    it.end_date = None
    it.status = status
    it.deleted_at = None
    return it


def _make_service(session: AsyncMock):
    from app.modules.products.service import IterationService

    return IterationService(session)


# ── Integration Tests (with real DB) ───────────────────────────────────


@pytest.mark.asyncio
async def test_create_iteration_auto_creates_uncategorized_folder(db_session: AsyncSession):
    """新建迭代时应自动创建「未分类」系统文件夹"""
    # 先创建产品（使用唯一 slug 避免测试间冲突）
    unique_slug = f"test-product-{uuid.uuid4().hex[:8]}"
    product = Product(name="测试产品", slug=unique_slug)
    db_session.add(product)
    await db_session.commit()

    service = IterationService(db_session)
    data = IterationCreate(
        product_id=product.id,
        name="v1.0",
    )
    iteration = await service.create_iteration(data)

    # 验证自动创建了文件夹
    result = await db_session.execute(
        select(RequirementFolder).where(
            RequirementFolder.iteration_id == iteration.id,
            RequirementFolder.is_system == True,  # noqa: E712
        )
    )
    folder = result.scalar_one_or_none()

    assert folder is not None, "应该自动创建系统文件夹"
    assert folder.name == "未分类"
    assert folder.is_system == True  # noqa: E712
    assert folder.level == 1
    assert folder.parent_id is None


# ── Mock-based Unit Tests ─────────────────────────────────────────────────────


class TestCreateIteration:
    async def test_create_iteration(self):
        session = AsyncMock()
        iter_mock = _make_iteration()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()

        svc = _make_service(session)

        with patch("app.modules.products.service.Iteration", return_value=iter_mock):
            result = await svc.create_iteration(IterationCreate(product_id=iter_mock.product_id, name="Sprint-1"))

        # 现在会调用 add 两次：一次 iteration，一次 uncategorized folder
        assert session.add.call_count == 2
        session.flush.assert_awaited_once()
        session.commit.assert_awaited_once()
        session.refresh.assert_awaited_once_with(iter_mock)
        assert result == iter_mock

    async def test_create_iteration_with_dates(self):
        session = AsyncMock()
        iter_mock = _make_iteration()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()

        svc = _make_service(session)

        with patch("app.modules.products.service.Iteration", return_value=iter_mock):
            result = await svc.create_iteration(
                IterationCreate(
                    product_id=iter_mock.product_id,
                    name="Sprint-2",
                    start_date=date(2024, 1, 1),
                    end_date=date(2024, 1, 14),
                )
            )

        assert result == iter_mock


class TestListIterations:
    async def test_list_by_product(self):
        product_id = uuid.uuid4()
        iterations = [_make_iteration("S1", product_id), _make_iteration("S2", product_id)]

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = iterations

        session = AsyncMock()
        session.execute = AsyncMock(return_value=mock_result)

        svc = _make_service(session)
        result = await svc.list_by_product(product_id)

        assert len(result) == 2
        assert result[0].name == "S1"
        assert result[1].name == "S2"

    async def test_list_by_product_empty(self):
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        session = AsyncMock()
        session.execute = AsyncMock(return_value=mock_result)

        svc = _make_service(session)
        result = await svc.list_by_product(uuid.uuid4())

        assert result == []


class TestUpdateIteration:
    async def test_update_iteration(self):
        it = _make_iteration()
        session = AsyncMock()
        session.get = AsyncMock(return_value=it)
        session.commit = AsyncMock()
        session.refresh = AsyncMock()

        svc = _make_service(session)
        result = await svc.update_iteration(it.id, IterationUpdate(name="Updated"))

        assert result.name == "Updated"
        session.commit.assert_awaited_once()

    async def test_update_iteration_status(self):
        it = _make_iteration()
        session = AsyncMock()
        session.get = AsyncMock(return_value=it)
        session.commit = AsyncMock()
        session.refresh = AsyncMock()

        svc = _make_service(session)
        result = await svc.update_iteration(it.id, IterationUpdate(status="completed"))

        assert result.status == "completed"

    async def test_update_iteration_not_found(self):
        session = AsyncMock()
        session.get = AsyncMock(return_value=None)

        svc = _make_service(session)
        with pytest.raises(HTTPException) as exc_info:
            await svc.update_iteration(uuid.uuid4(), IterationUpdate(name="X"))

        assert exc_info.value.status_code == 404
