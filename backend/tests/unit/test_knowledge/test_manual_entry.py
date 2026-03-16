"""KB-03 — KnowledgeService.create_manual_entry 手动添加测试（RED 基线）"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_service(session: AsyncMock):
    from app.modules.knowledge.service import KnowledgeService

    return KnowledgeService(session)


def _make_manual_entry_create(
    title: str = "手动添加的规范条目",
    content: str = "这是手动输入的知识内容，描述了测试规范的细节。",
    category: str = "enterprise_standard",
    tags: list[str] | None = None,
):
    from app.modules.knowledge.schemas import ManualEntryCreate

    return ManualEntryCreate(
        title=title,
        content=content,
        category=category,  # type: ignore[arg-type]
        tags=tags or ["测试规范"],
    )


class TestCreateManualEntry:
    async def test_create_manual_entry_sets_entry_type(self):
        """断言 create_manual_entry 返回的 KnowledgeDocument.entry_type == 'manual'。"""
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()

        doc_mock = MagicMock()
        doc_mock.id = uuid.uuid4()
        doc_mock.entry_type = "manual"
        doc_mock.vector_status = "completed"
        doc_mock.chunk_count = 1

        svc = _make_service(session)
        data = _make_manual_entry_create()

        with (
            patch("app.modules.knowledge.service.KnowledgeDocument", return_value=doc_mock),
            patch("app.modules.knowledge.service.index_chunks", new=AsyncMock(return_value=1)),
        ):
            result = await svc.create_manual_entry(data)

        assert result.entry_type == "manual", f"entry_type 应为 'manual'，实际: {result.entry_type}"

    async def test_create_manual_entry_vector_status_completed(self):
        """断言 vector_status == 'completed' 且 chunk_count == 1（手动条目只有一个 chunk）。"""
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()

        doc_mock = MagicMock()
        doc_mock.id = uuid.uuid4()
        doc_mock.entry_type = "manual"
        doc_mock.vector_status = "completed"
        doc_mock.chunk_count = 1

        svc = _make_service(session)
        data = _make_manual_entry_create()

        with (
            patch("app.modules.knowledge.service.KnowledgeDocument", return_value=doc_mock),
            patch("app.modules.knowledge.service.index_chunks", new=AsyncMock(return_value=1)),
        ):
            result = await svc.create_manual_entry(data)

        assert result.vector_status == "completed", (
            f"vector_status 应为 'completed'，实际: {result.vector_status}"
        )
        assert result.chunk_count == 1, f"chunk_count 应为 1，实际: {result.chunk_count}"

    async def test_create_manual_entry_category_validation(self):
        """断言传入非法 category 时抛出 ValueError 或 ValidationError。"""
        session = AsyncMock()
        svc = _make_service(session)

        from pydantic import ValidationError

        with pytest.raises((ValueError, ValidationError)):
            data = _make_manual_entry_create(category="invalid_category_xyz")
            await svc.create_manual_entry(data)
