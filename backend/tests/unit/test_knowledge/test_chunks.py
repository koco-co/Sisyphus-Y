"""KB-02 — scroll_by_doc_id 分块预览检索测试（RED 基线）"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.engine.rag.retriever import scroll_by_doc_id


class TestScrollByDocId:
    async def test_scroll_by_doc_id_returns_chunks(self):
        """mock Qdrant scroll，断言返回 list[dict] 含 content/chunk_index。"""
        doc_id = str(uuid.uuid4())

        fake_chunks = [
            {"content": "第一段内容", "chunk_index": 0},
            {"content": "第二段内容", "chunk_index": 1},
        ]

        with patch(
            "app.engine.rag.retriever.scroll_by_doc_id",
            new=AsyncMock(return_value=fake_chunks),
        ):
            result = await scroll_by_doc_id(doc_id=doc_id)

        assert isinstance(result, list)
        for chunk in result:
            assert "content" in chunk, f"缺少 content 字段，实际: {chunk}"
            assert "chunk_index" in chunk, f"缺少 chunk_index 字段，实际: {chunk}"

    async def test_chunks_limited_to_50(self):
        """断言默认 limit=50，不传 limit 时最多返回 50 条。"""
        doc_id = str(uuid.uuid4())

        result = await scroll_by_doc_id(doc_id=doc_id)

        assert isinstance(result, list)
        assert len(result) <= 50, f"默认 limit 应为 50，实际返回 {len(result)} 条"

    async def test_chunks_offset(self):
        """断言 offset 参数正确传递，结果从指定偏移量开始。"""
        doc_id = str(uuid.uuid4())

        result_page1 = await scroll_by_doc_id(doc_id=doc_id, limit=5, offset=0)
        result_page2 = await scroll_by_doc_id(doc_id=doc_id, limit=5, offset=5)

        assert isinstance(result_page1, list)
        assert isinstance(result_page2, list)
