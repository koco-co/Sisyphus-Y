"""验证 retriever 使用 AsyncQdrantClient，不阻塞事件循环。"""
import inspect
import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_get_client_returns_async_client():
    """_get_client 应返回 AsyncQdrantClient 实例。"""
    from qdrant_client import AsyncQdrantClient
    from app.engine.rag import retriever

    retriever._client = None
    with patch("app.engine.rag.retriever.AsyncQdrantClient") as mock_cls:
        mock_instance = AsyncMock(spec=AsyncQdrantClient)
        mock_cls.return_value = mock_instance
        client = retriever._get_client()
        mock_cls.assert_called_once()
        assert client is mock_instance


@pytest.mark.asyncio
async def test_ensure_collection_is_async():
    """ensure_collection 必须是 async def。"""
    from app.engine.rag.retriever import ensure_collection
    assert inspect.iscoroutinefunction(ensure_collection)


@pytest.mark.asyncio
async def test_index_chunks_is_async():
    """index_chunks 必须是 async def。"""
    from app.engine.rag.retriever import index_chunks
    assert inspect.iscoroutinefunction(index_chunks)


@pytest.mark.asyncio
async def test_retrieve_is_async():
    """retrieve 必须是 async def。"""
    from app.engine.rag.retriever import retrieve
    assert inspect.iscoroutinefunction(retrieve)
