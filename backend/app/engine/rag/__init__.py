"""RAG 知识库引擎 — 文档分块、向量嵌入、语义检索。

典型用法::

    from app.engine.rag import chunk_by_headers, index_chunks, retrieve_as_context

    # 1. 文档入库
    chunks = chunk_by_headers(doc_content, source_id=str(doc_id))
    await index_chunks(chunks, doc_id=str(doc_id))

    # 2. 检索上下文（注入 Prompt Layer 6）
    rag_context = await retrieve_as_context("用户查询")
"""

from app.engine.rag.chunker import Chunk, chunk_by_headers, chunk_by_paragraphs
from app.engine.rag.embedder import embed_query, embed_texts
from app.engine.rag.retriever import (
    RetrievalResult,
    delete_by_doc_id,
    ensure_collection,
    index_chunks,
    retrieve,
    retrieve_as_context,
)

__all__ = [
    "Chunk",
    "RetrievalResult",
    "chunk_by_headers",
    "chunk_by_paragraphs",
    "delete_by_doc_id",
    "embed_query",
    "embed_texts",
    "ensure_collection",
    "index_chunks",
    "retrieve",
    "retrieve_as_context",
]
