"""Task 2: RAG 历史用例预览端点测试 (WRK-04)"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import ASGITransport, AsyncClient


class TestRagPreviewEndpoint:
    """POST /scene-map/{req_id}/rag-preview 端点测试。"""

    async def test_rag_preview_returns_results_when_qdrant_available(self):
        """Qdrant 可达时返回 {"results": [...]} 结构。"""
        req_id = uuid.uuid4()

        from app.engine.rag.retriever import RetrievalResult
        mock_result = RetrievalResult(
            content="测试用例内容",
            score=0.85,
            metadata={"title": "历史用例标题", "product": "test"},
            chunk_id="chunk-1",
        )

        mock_svc = AsyncMock()
        mock_tp = MagicMock()
        mock_tp.title = "登录测试点"
        mock_svc.get_test_points_by_ids = AsyncMock(return_value=[mock_tp])

        with patch("app.modules.scene_map.router.SceneMapService", return_value=mock_svc), \
             patch("app.engine.rag.retriever.retrieve_similar_cases", new_callable=AsyncMock, return_value=[mock_result]):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post(
                    f"/api/scene-map/{req_id}/rag-preview",
                    json={"test_point_ids": [str(uuid.uuid4())]},
                )
            app.dependency_overrides.clear()

        assert resp.status_code == 200
        data = resp.json()
        assert "results" in data

    async def test_rag_preview_returns_empty_when_qdrant_unavailable(self):
        """Qdrant 不可达（mock exception）时返回 200 + {"results": []}，不 500。"""
        req_id = uuid.uuid4()

        mock_svc = AsyncMock()
        mock_tp = MagicMock()
        mock_tp.title = "测试点"
        mock_svc.get_test_points_by_ids = AsyncMock(return_value=[mock_tp])

        async def raise_connection_error(*args, **kwargs):
            raise ConnectionError("Qdrant not reachable")

        with patch("app.modules.scene_map.router.SceneMapService", return_value=mock_svc), \
             patch("app.engine.rag.retriever.retrieve_similar_cases", side_effect=raise_connection_error):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post(
                    f"/api/scene-map/{req_id}/rag-preview",
                    json={"test_point_ids": [str(uuid.uuid4())]},
                )
            app.dependency_overrides.clear()

        assert resp.status_code == 200
        data = resp.json()
        assert data == {"results": []}

    async def test_rag_preview_empty_ids_returns_empty(self):
        """test_point_ids 为空列表时返回 200 + {"results": []}。"""
        req_id = uuid.uuid4()

        with patch("app.modules.scene_map.router.SceneMapService"):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post(
                    f"/api/scene-map/{req_id}/rag-preview",
                    json={"test_point_ids": []},
                )
            app.dependency_overrides.clear()

        assert resp.status_code == 200
        data = resp.json()
        assert data == {"results": []}
