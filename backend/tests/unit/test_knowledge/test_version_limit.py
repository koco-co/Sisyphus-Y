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

    async def _run_upload_new_version(
        self,
        svc,
        session,
        doc_id,
        base_doc,
        versions_list,
        filename: str = "测试文档.md",
    ):
        """公共执行辅助方法，避免重复 patch 代码。"""
        upload = MagicMock()
        upload.filename = filename
        upload.read = AsyncMock(return_value=f"# Title\n\n{filename} 内容".encode("utf-8"))

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = versions_list
        session.execute = AsyncMock(return_value=mock_result)
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()

        with (
            patch.object(svc, "get_document", new=AsyncMock(return_value=base_doc)),
            patch(
                "app.modules.knowledge.service.parse_document",
                return_value=(f"# Title\n\n{filename}", {"sections": []}),
            ),
            patch("app.modules.knowledge.service.chunk_by_headers", return_value=[MagicMock()]),
            patch("app.modules.knowledge.service.index_chunks", new=AsyncMock(return_value=1)),
            patch("app.modules.knowledge.service.delete_by_doc_id"),
        ):
            return await svc.upload_new_version(doc_id=doc_id, file=upload)

    async def test_fourth_version_deletes_oldest(self):
        """上传第4个版本时断言最旧版本被软删除（deleted_at != None）。"""
        session = AsyncMock()
        svc = _make_service(session)
        doc_id = uuid.uuid4()

        base_doc = _make_doc_mock(doc_id=doc_id, version=3, is_active=True)

        # 模拟已存在3个版本
        existing_docs = [
            _make_doc_mock(version=1, is_active=False),
            _make_doc_mock(version=2, is_active=False),
            _make_doc_mock(version=3, is_active=True),
        ]
        oldest_doc = existing_docs[0]

        await self._run_upload_new_version(svc, session, doc_id, base_doc, existing_docs)

        # 最旧版本应被软删除
        assert oldest_doc.deleted_at is not None, "最旧版本应被软删除，deleted_at 应不为 None"

    async def test_old_versions_set_inactive(self):
        """上传新版本后，旧版本 is_active 应设置为 False。"""
        session = AsyncMock()
        svc = _make_service(session)
        doc_id = uuid.uuid4()

        base_doc = _make_doc_mock(doc_id=doc_id, version=1, is_active=True)
        old_active_doc = _make_doc_mock(version=1, is_active=True)

        await self._run_upload_new_version(svc, session, doc_id, base_doc, [old_active_doc])

        # 旧版本 is_active 应为 False
        assert old_active_doc.is_active is False, (
            f"旧版本 is_active 应为 False，实际: {old_active_doc.is_active}"
        )
