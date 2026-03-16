"""KB-04 — KnowledgeService 版本限额测试（RED 基线）"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_service(session: AsyncMock):
    from app.modules.knowledge.service import KnowledgeService

    return KnowledgeService(session)


def _make_doc_mock(
    doc_id: uuid.UUID | None = None,
    title: str = "测试文档.md",
    version: int = 1,
    is_active: bool = True,
    deleted_at: datetime | None = None,
):
    doc = MagicMock()
    doc.id = doc_id or uuid.uuid4()
    doc.title = title
    doc.doc_type = "md"
    doc.file_name = title
    doc.version = version
    doc.is_active = is_active
    doc.deleted_at = deleted_at
    doc.vector_status = "completed"
    doc.chunk_count = 2
    return doc


class TestVersionLimit:
    async def test_version_limit_is_three(self):
        """断言 KnowledgeService.MAX_VERSIONS 常量值为 3。"""
        from app.modules.knowledge.service import KnowledgeService

        assert KnowledgeService.MAX_VERSIONS == 3, (
            f"MAX_VERSIONS 应为 3，实际: {KnowledgeService.MAX_VERSIONS}"
        )

    async def test_fourth_version_deletes_oldest(self):
        """上传第4个版本时断言最旧版本被软删除（deleted_at != None）。"""
        session = AsyncMock()
        svc = _make_service(session)
        doc_id = uuid.uuid4()

        # 基准文档（用于获取 title）
        base_doc = _make_doc_mock(doc_id=doc_id, version=3, is_active=True)

        # 模拟已存在3个版本（查询同 title 文档）
        existing_docs = [
            _make_doc_mock(version=1, is_active=False),
            _make_doc_mock(version=2, is_active=False),
            _make_doc_mock(version=3, is_active=True),
        ]
        oldest_doc = existing_docs[0]
        new_doc = _make_doc_mock(version=4, is_active=True)

        upload = MagicMock()
        upload.filename = "测试文档_v4.md"
        upload.read = AsyncMock(return_value="# Title\n\n新版本内容".encode("utf-8"))

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = existing_docs
        session.execute = AsyncMock(return_value=mock_result)
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()

        with (
            patch.object(svc, "get_document", new=AsyncMock(return_value=base_doc)),
            patch("app.modules.knowledge.service.KnowledgeDocument", return_value=new_doc),
            patch(
                "app.modules.knowledge.service.parse_document",
                return_value=("# Title\n\n新版本内容", {"sections": []}),
            ),
            patch(
                "app.modules.knowledge.service.chunk_by_headers",
                return_value=[MagicMock()],
            ),
            patch(
                "app.modules.knowledge.service.index_chunks",
                new=AsyncMock(return_value=1),
            ),
            patch("app.modules.knowledge.service.delete_by_doc_id"),
        ):
            result = await svc.upload_new_version(doc_id=doc_id, file=upload)

        # 最旧版本应被软删除
        assert oldest_doc.deleted_at is not None, "最旧版本应被软删除，deleted_at 应不为 None"

    async def test_old_versions_set_inactive(self):
        """上传新版本后，旧版本 is_active 应设置为 False。"""
        session = AsyncMock()
        svc = _make_service(session)
        doc_id = uuid.uuid4()

        base_doc = _make_doc_mock(doc_id=doc_id, version=1, is_active=True)
        old_active_doc = _make_doc_mock(version=1, is_active=True)
        new_doc = _make_doc_mock(version=2, is_active=True)

        upload = MagicMock()
        upload.filename = "测试文档_v2.md"
        upload.read = AsyncMock(return_value="# Title\n\n新版本".encode("utf-8"))

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [old_active_doc]
        session.execute = AsyncMock(return_value=mock_result)
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()

        with (
            patch.object(svc, "get_document", new=AsyncMock(return_value=base_doc)),
            patch("app.modules.knowledge.service.KnowledgeDocument", return_value=new_doc),
            patch(
                "app.modules.knowledge.service.parse_document",
                return_value=("# Title\n\n新版本", {}),
            ),
            patch(
                "app.modules.knowledge.service.chunk_by_headers",
                return_value=[MagicMock()],
            ),
            patch(
                "app.modules.knowledge.service.index_chunks",
                new=AsyncMock(return_value=1),
            ),
        ):
            await svc.upload_new_version(doc_id=doc_id, file=upload)

        # 旧版本 is_active 应为 False
        assert old_active_doc.is_active is False, (
            f"旧版本 is_active 应为 False，实际: {old_active_doc.is_active}"
        )
