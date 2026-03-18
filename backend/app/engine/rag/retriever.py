"""向量检索器 — 从 Qdrant 检索相似文档片段。

职责：
- 管理 Qdrant collection 的创建/连接（AsyncQdrantClient）
- 文档分块 → 嵌入 → 入库
- 语义检索 + 元数据过滤
- 格式化检索结果为 RAG 上下文字符串
"""

import logging
import uuid
from dataclasses import dataclass

from qdrant_client import AsyncQdrantClient, models

from app.core.config import settings
from app.engine.rag.chunker import Chunk
from app.engine.rag.embedder import EMBEDDING_DIMENSION, embed_query, embed_texts

logger = logging.getLogger(__name__)

COLLECTION_NAME = "knowledge_chunks"
TESTCASE_COLLECTION = "historical_testcases"


@dataclass
class RetrievalResult:
    """单条检索结果。"""

    content: str
    score: float
    metadata: dict
    chunk_id: str


_client: AsyncQdrantClient | None = None


def _get_client() -> AsyncQdrantClient:
    """懒加载 AsyncQdrantClient，避免导入时连接。"""
    global _client  # noqa: PLW0603
    if _client is None:
        _client = AsyncQdrantClient(
            url=settings.qdrant_url,
            timeout=30,
            proxy=None,
            trust_env=False,
        )
        logger.info("AsyncQdrant 客户端已连接: %s", settings.qdrant_url)
    return _client


async def ensure_collection() -> None:
    """确保 collection 存在，不存在则创建。"""
    client = _get_client()
    result = await client.get_collections()
    collections = [c.name for c in result.collections]
    if COLLECTION_NAME not in collections:
        await client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=EMBEDDING_DIMENSION,
                distance=models.Distance.COSINE,
            ),
        )
        logger.info(
            "创建 Qdrant collection: %s (dim=%d)",
            COLLECTION_NAME,
            EMBEDDING_DIMENSION,
        )


async def recreate_collection(
    *,
    collection_name: str = COLLECTION_NAME,
    vector_size: int = EMBEDDING_DIMENSION,
) -> dict:
    """删除并重建指定 collection，返回清理摘要。"""
    client = _get_client()
    result = await client.get_collections()
    collections = [c.name for c in result.collections]
    existed = collection_name in collections
    deleted_points = 0

    if existed:
        info = await client.get_collection(collection_name=collection_name)
        deleted_points = int(getattr(info, "points_count", 0) or 0)
        await client.delete_collection(collection_name=collection_name)
        logger.info(
            "删除 Qdrant collection: %s (points=%d)", collection_name, deleted_points
        )

    await client.create_collection(
        collection_name=collection_name,
        vectors_config=models.VectorParams(
            size=vector_size,
            distance=models.Distance.COSINE,
        ),
    )
    logger.info("重建 Qdrant collection: %s (dim=%d)", collection_name, vector_size)

    return {
        "collection": collection_name,
        "existed": existed,
        "deleted_points": deleted_points,
        "vector_size": vector_size,
    }


async def index_chunks(chunks: list[Chunk], *, doc_id: str = "") -> int:
    """将分块嵌入并写入 Qdrant。"""
    if not chunks:
        return 0

    await ensure_collection()
    client = _get_client()

    texts = [c.content for c in chunks]
    vectors = await embed_texts(texts)

    points: list[models.PointStruct] = []
    for chunk, vector in zip(chunks, vectors, strict=True):
        payload = {
            "content": chunk.content,
            "doc_id": doc_id or chunk.metadata.get("source_id", ""),
            "section_path": chunk.metadata.get("section_path", ""),
            "headers": chunk.metadata.get("headers", []),
            "chunk_index": chunk.index,
        }
        points.append(
            models.PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload=payload,
            )
        )

    await client.upsert(collection_name=COLLECTION_NAME, points=points)
    logger.info("入库完成: %d chunks (doc_id=%s)", len(points), doc_id)
    return len(points)


async def _async_delete_by_doc_id(doc_id: str) -> None:
    """异步删除指定文档的所有向量。"""
    await ensure_collection()
    client = _get_client()
    await client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="doc_id",
                        match=models.MatchValue(value=doc_id),
                    )
                ]
            )
        ),
    )
    logger.info("已删除文档向量: doc_id=%s", doc_id)


async def delete_by_doc_id(doc_id: str) -> None:
    """删除指定文档的所有向量（文档更新/删除时调用）。"""
    await _async_delete_by_doc_id(doc_id)


async def retrieve(
    query: str,
    *,
    top_k: int = 5,
    score_threshold: float = 0.72,
    doc_ids: list[str] | None = None,
) -> list[RetrievalResult]:
    """语义检索最相似的文档片段。"""
    await ensure_collection()
    client = _get_client()

    query_vector = await embed_query(query)

    query_filter = None
    if doc_ids:
        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="doc_id",
                    match=models.MatchAny(any=doc_ids),
                )
            ]
        )

    result = await client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=query_filter,
        limit=top_k,
        score_threshold=score_threshold,
    )

    return [
        RetrievalResult(
            content=hit.payload.get("content", "") if hit.payload else "",
            score=hit.score if hit.score is not None else 0.0,
            metadata={
                "doc_id": hit.payload.get("doc_id", "") if hit.payload else "",
                "section_path": (
                    hit.payload.get("section_path", "") if hit.payload else ""
                ),
                "headers": hit.payload.get("headers", []) if hit.payload else [],
                "chunk_index": hit.payload.get("chunk_index", 0) if hit.payload else 0,
            },
            chunk_id=str(hit.id),
        )
        for hit in result.points
    ]


async def retrieve_as_context(
    query: str,
    *,
    top_k: int = 5,
    score_threshold: float = 0.72,
    doc_ids: list[str] | None = None,
) -> str | None:
    """检索并格式化为可直接注入 Prompt 的上下文字符串。"""
    results = await retrieve(
        query,
        top_k=top_k,
        score_threshold=score_threshold,
        doc_ids=doc_ids,
    )
    if not results:
        return None

    parts: list[str] = []
    for i, r in enumerate(results, 1):
        source = r.metadata.get("section_path") or r.metadata.get("doc_id", "未知来源")
        parts.append(
            f"### 参考片段 {i}（相似度 {r.score:.2f} | {source}）\n{r.content}"
        )

    return "\n\n".join(parts)


async def retrieve_similar_cases(
    query: str,
    *,
    top_k: int = 5,
    score_threshold: float = 0.72,
    product: str | None = None,
) -> list[RetrievalResult]:
    """从 historical_testcases collection 检索相似的历史用例。"""
    client = _get_client()
    result = await client.get_collections()
    collections = [c.name for c in result.collections]
    if TESTCASE_COLLECTION not in collections:
        logger.warning("历史用例 collection '%s' 不存在，跳过检索", TESTCASE_COLLECTION)
        return []

    query_vector = await embed_query(query)

    query_filter = None
    if product:
        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="product",
                    match=models.MatchValue(value=product),
                )
            ]
        )

    result2 = await client.query_points(
        collection_name=TESTCASE_COLLECTION,
        query=query_vector,
        query_filter=query_filter,
        limit=top_k,
        score_threshold=score_threshold,
    )

    return [
        RetrievalResult(
            content=hit.payload.get("content", "") if hit.payload else "",
            score=hit.score if hit.score is not None else 0.0,
            metadata={
                "testcase_id": (
                    hit.payload.get("testcase_id", "") if hit.payload else ""
                ),
                "title": hit.payload.get("title", "") if hit.payload else "",
                "product": hit.payload.get("product", "") if hit.payload else "",
                "module": hit.payload.get("module", "") if hit.payload else "",
                "priority": hit.payload.get("priority", "") if hit.payload else "",
            },
            chunk_id=str(hit.id),
        )
        for hit in result2.points
    ]


async def scroll_by_doc_id(
    doc_id: str,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """按文档 ID 分页获取 Qdrant 中的分块列表。"""
    await ensure_collection()
    client = _get_client()

    try:
        scroll_result = await client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="doc_id",
                        match=models.MatchValue(value=doc_id),
                    )
                ]
            ),
            limit=limit,
            offset=offset,
            with_payload=True,
        )
        points = scroll_result[0]
    except Exception:
        logger.exception("scroll_by_doc_id 失败: doc_id=%s", doc_id)
        return []

    out: list[dict] = []
    for idx, point in enumerate(points):
        payload = point.payload or {}
        chunk_index = payload.get("chunk_index", offset + idx)
        out.append({"content": payload.get("content", ""), "chunk_index": chunk_index})
    return out


async def retrieve_cases_as_context(
    query: str,
    *,
    top_k: int = 5,
    score_threshold: float = 0.72,
    product: str | None = None,
) -> str | None:
    """检索历史用例并格式化为 Prompt 上下文。"""
    results = await retrieve_similar_cases(
        query,
        top_k=top_k,
        score_threshold=score_threshold,
        product=product,
    )
    if not results:
        return None

    parts: list[str] = []
    for i, r in enumerate(results, 1):
        title = r.metadata.get("title", "未知用例")
        priority = r.metadata.get("priority", "")
        module = r.metadata.get("module", "")
        header = f"### 参考用例 {i}（相似度 {r.score:.2f}"
        if module:
            header += f" | {module}"
        if priority:
            header += f" | {priority}"
        header += f"）\n**{title}**\n{r.content}"
        parts.append(header)

    return "\n\n".join(parts)
