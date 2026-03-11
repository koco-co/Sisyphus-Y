"""清洗用例向量化 — 将清洗后的历史用例嵌入写入 Qdrant。

Collection: sisyphus_cleaned_cases
每个 point 对应一条 TestCase，payload 含 case_id/title/module_path/quality_score。
"""

from __future__ import annotations

import logging
import uuid

from qdrant_client import QdrantClient, models

from app.core.config import settings
from app.engine.rag.embedder import EMBEDDING_DIMENSION, embed_texts

logger = logging.getLogger(__name__)

CLEANED_CASES_COLLECTION = "sisyphus_cleaned_cases"

_client: QdrantClient | None = None


def _get_client() -> QdrantClient:
    global _client  # noqa: PLW0603
    if _client is None:
        _client = QdrantClient(url=settings.qdrant_url, timeout=30, trust_env=False)
    return _client


def _ensure_collection() -> None:
    client = _get_client()
    existing = [c.name for c in client.get_collections().collections]
    if CLEANED_CASES_COLLECTION not in existing:
        client.create_collection(
            collection_name=CLEANED_CASES_COLLECTION,
            vectors_config=models.VectorParams(
                size=EMBEDDING_DIMENSION,
                distance=models.Distance.COSINE,
            ),
        )
        logger.info("创建 Qdrant collection: %s (dim=%d)", CLEANED_CASES_COLLECTION, EMBEDDING_DIMENSION)


def _build_case_text(case: dict) -> str:
    """将用例字段拼合为可嵌入的文本。"""
    parts: list[str] = []
    if case.get("title"):
        parts.append(f"标题：{case['title']}")
    if case.get("module_path"):
        parts.append(f"模块：{case['module_path']}")
    if case.get("precondition"):
        parts.append(f"前置：{case['precondition']}")
    steps: list[dict] = case.get("steps", [])
    if steps:
        step_lines = []
        for s in steps:
            action = s.get("action", "")
            expected = s.get("expected_result", "")
            step_lines.append(f"{s.get('no', '')}. {action} → {expected}")
        parts.append("步骤：" + " | ".join(step_lines))
    return "\n".join(parts)


async def upsert_cases_to_qdrant(cases: list[dict]) -> int:
    """将清洗后的用例批量 upsert 到 Qdrant。

    Args:
        cases: 包含 case_id/title/steps 等字段的用例字典列表。
               需包含 ``_db_id`` 字段（uuid str）作为 Qdrant point id。

    Returns:
        成功 upsert 的数量。
    """
    if not cases:
        return 0

    _ensure_collection()
    client = _get_client()

    texts = [_build_case_text(c) for c in cases]
    vectors = await embed_texts(texts)

    points: list[models.PointStruct] = []
    for case, vector in zip(cases, vectors, strict=True):
        db_id = case.get("_db_id") or str(uuid.uuid4())
        payload = {
            "case_id": case.get("case_id", ""),
            "title": case.get("title", ""),
            "module_path": case.get("module_path") or "",
            "quality_score": case.get("quality_score") or 0.0,
            "clean_status": case.get("clean_status", "scored"),
            "source_file": case.get("_source_file", ""),
        }
        points.append(
            models.PointStruct(
                id=db_id,
                vector=vector,
                payload=payload,
            )
        )

    client.upsert(collection_name=CLEANED_CASES_COLLECTION, points=points)
    logger.info("向量化 upsert 完成: %d 条 (collection=%s)", len(points), CLEANED_CASES_COLLECTION)
    return len(points)
