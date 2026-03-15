"""B-M11-10 — Knowledge API contract tests."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import ASGITransport, AsyncClient

from app.modules.knowledge.service import KnowledgeService


def _make_doc():
    doc = MagicMock()
    doc.id = uuid.uuid4()
    doc.file_name = "知识库文档.md"
    doc.title = "知识库文档"
    doc.doc_type = "md"
    doc.file_size = 2048
    doc.vector_status = "completed"
    doc.hit_count = 3
    doc.chunk_count = 6
    doc.tags = ["知识库"]
    doc.category = "business_rule"
    doc.entry_type = "file"
    doc.is_active = True
    doc.created_at = "2024-01-01T00:00:00"
    doc.updated_at = "2024-01-01T00:00:00"
    doc.content = "# Title\n\ncontent"
    doc.source = "upload"
    doc.version = 1
    doc.error_message = None
    return doc


class TestKnowledgeListEndpoint:
    async def test_list_documents_matches_frontend_contract(self):
        """GET /api/knowledge/ 应返回知识库页面需要的字段。"""
        mock_doc = _make_doc()
        mock_service_instance = AsyncMock()
        mock_service_instance.list_documents = AsyncMock(return_value=([mock_doc], 1))

        with patch("app.modules.knowledge.router.KnowledgeService", return_value=mock_service_instance):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.get("/api/knowledge/?doc_type=md&vector_status=completed&q=知识")

            app.dependency_overrides.clear()

        assert resp.status_code == 200
        payload = resp.json()
        assert payload["total"] == 1
        assert payload["items"][0] == {
            "id": str(mock_doc.id),
            "file_name": "知识库文档.md",
            "doc_type": "md",
            "file_size": 2048,
            "vector_status": "completed",
            "hit_count": 3,
            "chunk_count": 6,
            "tags": ["知识库"],
            "category": "business_rule",
            "entry_type": "file",
            "is_active": True,
            "uploaded_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }


class TestKnowledgeUploadEndpoint:
    async def test_upload_document_endpoint(self):
        """POST /api/knowledge/upload 应接收文件并返回已索引文档。"""
        mock_doc = _make_doc()
        mock_service_instance = AsyncMock()
        mock_service_instance.upload_document = AsyncMock(return_value=mock_doc)

        with patch("app.modules.knowledge.router.KnowledgeService", return_value=mock_service_instance):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post(
                    "/api/knowledge/upload",
                    files={"file": ("knowledge.md", b"# hello\n\nworld", "text/markdown")},
                )

            app.dependency_overrides.clear()

        assert resp.status_code == 201
        assert resp.json()["file_name"] == "知识库文档.md"
        assert resp.json()["vector_status"] == "completed"


class TestKnowledgeReindexEndpoint:
    async def test_reindex_document_endpoint(self):
        """POST /api/knowledge/{id}/reindex 应返回重建后的文档信息。"""
        doc_id = uuid.uuid4()
        mock_doc = _make_doc()
        mock_service_instance = AsyncMock()
        mock_service_instance.reindex_document = AsyncMock(return_value=mock_doc)

        with patch("app.modules.knowledge.router.KnowledgeService", return_value=mock_service_instance):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post(f"/api/knowledge/{doc_id}/reindex")

            app.dependency_overrides.clear()

        assert resp.status_code == 200
        assert resp.json()["chunk_count"] == 6


class TestKnowledgeSearchEndpoint:
    async def test_search_endpoint(self):
        """POST /api/knowledge/search 应返回 RAG 测试面板需要的结果格式。"""
        result = {
            "id": "chunk-1",
            "content": "导入失败时需要回滚并告警。",
            "score": 0.91,
            "source_doc": "知识库文档.md",
            "chunk_index": 0,
        }
        mock_service_instance = AsyncMock()
        mock_service_instance.search = AsyncMock(return_value=[result])

        with patch("app.modules.knowledge.router.KnowledgeService", return_value=mock_service_instance):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post("/api/knowledge/search", json={"query": "导入失败如何处理", "top_k": 5})

            app.dependency_overrides.clear()

        assert resp.status_code == 200
        assert resp.json() == [result]

    async def test_search_endpoint_uses_072_default_threshold_when_omitted(self):
        """POST /api/knowledge/search 未显式传阈值时应转发 0.72 默认值。"""
        mock_service_instance = AsyncMock()
        mock_service_instance.search = AsyncMock(return_value=[])

        with patch("app.modules.knowledge.router.KnowledgeService", return_value=mock_service_instance):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post("/api/knowledge/search", json={"query": "导入失败如何处理", "top_k": 5})

            app.dependency_overrides.clear()

        assert resp.status_code == 200
        mock_service_instance.search.assert_awaited_once_with(
            "导入失败如何处理",
            top_k=5,
            score_threshold=0.72,
            doc_id=None,
        )


class TestKnowledgeServiceSearch:
    async def test_search_uses_072_default_threshold_when_omitted(self):
        """KnowledgeService.search 未显式传阈值时应使用 0.72。"""
        session = AsyncMock()
        service = KnowledgeService(session)

        with patch("app.modules.knowledge.service.retrieve", new=AsyncMock(return_value=[])) as retrieve_mock:
            result = await service.search("导入失败如何处理")

        assert result == []
        retrieve_mock.assert_awaited_once_with(
            "导入失败如何处理",
            top_k=5,
            score_threshold=0.72,
            doc_ids=None,
        )


class TestKnowledgeRebuildVectorIndex:
    async def test_rebuild_vector_index_endpoint_returns_cleanup_report(self):
        """POST /api/knowledge/rebuild-vector-index 应返回旧向量清理与重建排队摘要。"""
        mock_service_instance = AsyncMock()
        mock_service_instance.reset_all_vector_status = AsyncMock(
            return_value={
                "collection": "knowledge_chunks",
                "dimensions": 1536,
                "docs_queued": 4,
                "deleted_points": 28,
                "collection_recreated": True,
                "summary": "已清理 28 个旧向量点，并将 4 篇文档重新标记为 pending。",
            }
        )

        with patch("app.modules.knowledge.router.KnowledgeService", return_value=mock_service_instance):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post(
                    "/api/knowledge/rebuild-vector-index",
                    json={"dimensions": 1536, "collection": "knowledge_chunks"},
                )

            app.dependency_overrides.clear()

        assert resp.status_code == 200
        assert resp.json() == {
            "ok": True,
            "collection": "knowledge_chunks",
            "dimensions": 1536,
            "docs_queued": 4,
            "deleted_points": 28,
            "collection_recreated": True,
            "message": "已清理 28 个旧向量点，并将 4 篇文档重新标记为 pending。",
        }

    async def test_reset_all_vector_status_returns_cleanup_report(self):
        """KnowledgeService.reset_all_vector_status 应返回文档排队与旧向量清理摘要。"""
        doc_a = MagicMock()
        doc_b = MagicMock()
        execute_result = MagicMock()
        execute_result.scalars.return_value.all.return_value = [doc_a, doc_b]
        session = AsyncMock()
        session.execute = AsyncMock(return_value=execute_result)
        service = KnowledgeService(session)

        with patch(
            "app.modules.knowledge.service.recreate_collection",
            return_value={
                "collection": "knowledge_chunks",
                "existed": True,
                "deleted_points": 18,
                "vector_size": 1536,
            },
        ) as recreate_mock:
            report = await service.reset_all_vector_status(collection="knowledge_chunks", new_dimensions=1536)

        recreate_mock.assert_called_once_with(collection_name="knowledge_chunks", vector_size=1536)
        assert doc_a.vector_status == "pending"
        assert doc_b.vector_status == "pending"
        session.commit.assert_awaited_once()
        assert report == {
            "collection": "knowledge_chunks",
            "dimensions": 1536,
            "docs_queued": 2,
            "deleted_points": 18,
            "collection_recreated": True,
            "summary": "已清理 18 个旧向量点，并将 2 篇文档重新标记为 pending。",
        }
