"""验证 embedder 的异步行为正确，ZhiPu SDK 不阻塞事件循环。"""
import asyncio
import inspect
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_embed_zhipu_is_async():
    """_embed_zhipu 必须是 async def。"""
    from app.engine.rag.embedder import _embed_zhipu
    assert inspect.iscoroutinefunction(_embed_zhipu)


@pytest.mark.asyncio
async def test_embed_texts_returns_correct_count():
    """embed_texts 返回列表长度与输入一致。"""
    with patch("app.engine.rag.embedder._embed_batch") as mock_batch:
        mock_batch.return_value = [[0.1] * 1024, [0.2] * 1024]
        from app.engine.rag.embedder import embed_texts
        result = await embed_texts(["text1", "text2"])
        assert len(result) == 2
        assert mock_batch.call_count == 1


@pytest.mark.asyncio
async def test_embed_zhipu_uses_to_thread():
    """_embed_zhipu 内部必须使用 asyncio.to_thread（通过 mock 验证不直接阻塞）。"""
    mock_resp = MagicMock()
    mock_resp.data = [MagicMock(embedding=[0.1] * 2048)]

    with (
        patch("app.engine.rag.embedder.settings") as mock_settings,
        patch("asyncio.to_thread", new_callable=AsyncMock) as mock_to_thread,
    ):
        mock_settings.zhipu_api_key = "test-key"
        mock_settings.llm_provider = "zhipu"
        mock_to_thread.return_value = [[0.1] * 2048]

        from app.engine.rag import embedder
        result = await embedder._embed_zhipu(["test text"])
        # to_thread 必须被调用（证明同步代码被正确包裹）
        mock_to_thread.assert_called_once()
