"""RAG-08: collection 清空重建测试。"""

from unittest.mock import MagicMock, patch

import pytest


class TestRecreateCollection:
    """测试 recreate_collection 函数。"""

    def test_recreate_collection_mock(self):
        """mock QdrantClient，调用 recreate_collection 后 delete_collection 和 create_collection 均被调用。"""
        # 需要导入被测函数
        from app.engine.rag.retriever import recreate_collection

        with patch("app.engine.rag.retriever._get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client

            # 模拟 collection 已存在 - 使用有 name 属性的对象
            mock_collection = MagicMock()
            mock_collection.name = "historical_testcases"
            mock_collections = MagicMock()
            mock_collections.collections = [mock_collection]
            mock_client.get_collections.return_value = mock_collections

            # 模拟 collection info
            mock_info = MagicMock()
            mock_info.points_count = 100
            mock_client.get_collection.return_value = mock_info

            # 执行
            recreate_collection(collection_name="historical_testcases", vector_size=2048)

            # 验证 delete_collection 被调用
            mock_client.delete_collection.assert_called_once_with(
                collection_name="historical_testcases"
            )

            # 验证 create_collection 被调用
            mock_client.create_collection.assert_called_once()
            call_kwargs = mock_client.create_collection.call_args.kwargs
            assert call_kwargs["collection_name"] == "historical_testcases"

    def test_recreate_returns_deleted_count(self):
        """recreate_collection 返回 dict 含 "deleted_points" 键。"""
        from app.engine.rag.retriever import recreate_collection

        with patch("app.engine.rag.retriever._get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client

            # 模拟 collection 已存在且有 50 条数据
            mock_collection = MagicMock()
            mock_collection.name = "knowledge_chunks"
            mock_collections = MagicMock()
            mock_collections.collections = [mock_collection]
            mock_client.get_collections.return_value = mock_collections

            mock_info = MagicMock()
            mock_info.points_count = 50
            mock_client.get_collection.return_value = mock_info

            # 执行
            result = recreate_collection(collection_name="knowledge_chunks", vector_size=2048)

            # 验证返回结构
            assert isinstance(result, dict)
            assert "deleted_points" in result
            assert result["deleted_points"] == 50
            assert "collection" in result
            assert "existed" in result
            assert "vector_size" in result
