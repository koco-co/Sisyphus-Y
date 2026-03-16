"""T-UNIT-09 — RAG 检索器客户端配置测试。"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from app.engine.rag import retriever


class TestQdrantClientConfig:
    def teardown_method(self):
        retriever._client = None

    def test_get_client_disables_env_proxy(self):
        """Qdrant 客户端应禁用 trust_env，避免被系统代理污染。"""
        client = MagicMock()

        with patch("app.engine.rag.retriever.QdrantClient", return_value=client) as qdrant_client:
            retriever._client = None
            result = retriever._get_client()

        qdrant_client.assert_called_once_with(
            url=retriever.settings.qdrant_url,
            timeout=30,
            trust_env=False,
        )
        assert result is client

    def test_get_client_reuses_cached_instance(self):
        """重复获取客户端时应复用缓存实例。"""
        client = MagicMock()

        with patch("app.engine.rag.retriever.QdrantClient", return_value=client) as qdrant_client:
            retriever._client = None
            first = retriever._get_client()
            second = retriever._get_client()

        qdrant_client.assert_called_once()
        assert first is second


class TestRetrieveThresholds:
    async def test_retrieve_uses_072_threshold_by_default(self):
        """retrieve() 未传阈值时应使用 0.72。"""
        client = MagicMock()
        client.query_points.return_value = SimpleNamespace(points=[])

        with (
            patch("app.engine.rag.retriever.ensure_collection"),
            patch("app.engine.rag.retriever._get_client", return_value=client),
            patch("app.engine.rag.retriever.embed_query", new=AsyncMock(return_value=[0.1, 0.2])),
        ):
            results = await retriever.retrieve("导入失败如何处理")

        assert results == []
        client.query_points.assert_called_once()
        assert client.query_points.call_args.kwargs["score_threshold"] == 0.72
        assert client.query_points.call_args.kwargs["limit"] == 5

    async def test_retrieve_respects_explicit_threshold(self):
        """retrieve() 显式传阈值时应使用调用方提供的值。"""
        client = MagicMock()
        client.query_points.return_value = SimpleNamespace(points=[])

        with (
            patch("app.engine.rag.retriever.ensure_collection"),
            patch("app.engine.rag.retriever._get_client", return_value=client),
            patch("app.engine.rag.retriever.embed_query", new=AsyncMock(return_value=[0.1, 0.2])),
        ):
            results = await retriever.retrieve("导入失败如何处理", score_threshold=0.81, top_k=3)

        assert results == []
        client.query_points.assert_called_once()
        assert client.query_points.call_args.kwargs["score_threshold"] == 0.81
        assert client.query_points.call_args.kwargs["limit"] == 3


class TestRecreateCollection:
    def test_recreate_collection_deletes_existing_points_and_recreates_collection(self):
        """recreate_collection() 应先删除旧 collection 再重建，并返回清理摘要。"""
        client = MagicMock()
        client.get_collections.return_value = SimpleNamespace(
            collections=[SimpleNamespace(name=retriever.COLLECTION_NAME)]
        )
        client.get_collection.return_value = SimpleNamespace(points_count=12)

        with patch("app.engine.rag.retriever._get_client", return_value=client):
            report = retriever.recreate_collection(collection_name=retriever.COLLECTION_NAME, vector_size=2048)

        client.delete_collection.assert_called_once_with(collection_name=retriever.COLLECTION_NAME)
        client.create_collection.assert_called_once()
        assert report == {
            "collection": retriever.COLLECTION_NAME,
            "existed": True,
            "deleted_points": 12,
            "vector_size": 2048,
        }


class TestRetrieveSimilarCases:
    """RAG-05: retrieve_similar_cases 测试集。"""

    async def test_retrieve_similar_cases_default_params(self):
        """retrieve_similar_cases() 默认 top_k=5, score_threshold=0.72。"""
        client = MagicMock()
        client.get_collections.return_value = SimpleNamespace(
            collections=[SimpleNamespace(name=retriever.TESTCASE_COLLECTION)]
        )
        client.query_points.return_value = SimpleNamespace(points=[])

        with (
            patch("app.engine.rag.retriever._get_client", return_value=client),
            patch("app.engine.rag.retriever.embed_query", new=AsyncMock(return_value=[0.1, 0.2])),
        ):
            results = await retriever.retrieve_similar_cases("用户登录测试")

        assert results == []
        client.query_points.assert_called_once()
        assert client.query_points.call_args.kwargs["limit"] == 5
        assert client.query_points.call_args.kwargs["score_threshold"] == 0.72

    async def test_retrieve_similar_cases_includes_score(self):
        """检索结果应包含 score 字段。"""
        client = MagicMock()
        client.get_collections.return_value = SimpleNamespace(
            collections=[SimpleNamespace(name=retriever.TESTCASE_COLLECTION)]
        )
        client.query_points.return_value = SimpleNamespace(
            points=[
                SimpleNamespace(
                    id="point-1",
                    score=0.85,
                    payload={"title": "登录测试", "content": "步骤1..."},
                )
            ]
        )

        with (
            patch("app.engine.rag.retriever._get_client", return_value=client),
            patch("app.engine.rag.retriever.embed_query", new=AsyncMock(return_value=[0.1, 0.2])),
        ):
            results = await retriever.retrieve_similar_cases("用户登录测试")

        assert len(results) == 1
        assert results[0].score == 0.85

    async def test_retrieve_similar_cases_includes_metadata(self):
        """检索结果应包含 metadata 字段。"""
        client = MagicMock()
        client.get_collections.return_value = SimpleNamespace(
            collections=[SimpleNamespace(name=retriever.TESTCASE_COLLECTION)]
        )
        client.query_points.return_value = SimpleNamespace(
            points=[
                SimpleNamespace(
                    id="point-1",
                    score=0.78,
                    payload={
                        "title": "登录测试",
                        "content": "步骤1...",
                        "testcase_id": "tc-001",
                        "product": "数据中台",
                        "module": "用户管理",
                        "priority": "P0",
                    },
                )
            ]
        )

        with (
            patch("app.engine.rag.retriever._get_client", return_value=client),
            patch("app.engine.rag.retriever.embed_query", new=AsyncMock(return_value=[0.1, 0.2])),
        ):
            results = await retriever.retrieve_similar_cases("用户登录测试")

        assert len(results) == 1
        assert results[0].metadata["testcase_id"] == "tc-001"
        assert results[0].metadata["title"] == "登录测试"
        assert results[0].metadata["product"] == "数据中台"
        assert results[0].metadata["module"] == "用户管理"
        assert results[0].metadata["priority"] == "P0"

    async def test_retrieve_similar_cases_empty_on_missing_collection(self):
        """collection 不存在时应返回空列表。"""
        client = MagicMock()
        client.get_collections.return_value = SimpleNamespace(collections=[])

        with patch("app.engine.rag.retriever._get_client", return_value=client):
            results = await retriever.retrieve_similar_cases("用户登录测试")

        assert results == []
        client.query_points.assert_not_called()
