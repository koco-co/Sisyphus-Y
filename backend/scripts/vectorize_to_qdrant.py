"""将清洗后的历史用例写入 Qdrant 向量库。

依赖：
- 清洗脚本已运行，产出 data/cleaned/vectorize_chunks.jsonl
- Qdrant 服务已启动（默认 localhost:6333）
- 环境变量 DASHSCOPE_API_KEY 或 ZHIPU_API_KEY 已配置

用法：
    cd backend
    uv run python scripts/vectorize_to_qdrant.py
"""

from __future__ import annotations

import asyncio
import json
import logging
import sys
import uuid
from pathlib import Path

# 需要先将 backend 加入 sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

CHUNKS_FILE = Path(__file__).resolve().parent.parent / "data" / "cleaned" / "vectorize_chunks.jsonl"
COLLECTION_NAME = "historical_testcases"
BATCH_SIZE = 20  # 每批嵌入数量（避免 API 限流）


async def main() -> None:
    """执行向量化入库。"""
    from qdrant_client import QdrantClient, models

    from app.core.config import settings
    from app.engine.rag.embedder import EMBEDDING_DIMENSION, embed_texts

    if not CHUNKS_FILE.exists():
        logger.error("未找到清洗后的数据文件: %s", CHUNKS_FILE)
        logger.error("请先运行: uv run python scripts/clean_historical_data.py")
        sys.exit(1)

    # 读取所有 chunks（脚本级同步读取，非服务器运行时）
    chunks: list[dict] = []
    with open(CHUNKS_FILE, encoding="utf-8") as f:  # noqa: ASYNC230
        for line in f:
            if line.strip():
                chunks.append(json.loads(line))

    logger.info("读取 %d 条向量化文本块", len(chunks))

    # 连接 Qdrant
    client = QdrantClient(url=settings.qdrant_url, timeout=60, trust_env=False)
    logger.info("Qdrant 连接成功: %s", settings.qdrant_url)

    # 确保 collection 存在
    collections = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME in collections:
        logger.info("集合 %s 已存在，将追加写入", COLLECTION_NAME)
    else:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=EMBEDDING_DIMENSION,
                distance=models.Distance.COSINE,
            ),
        )
        logger.info("创建集合: %s (dim=%d)", COLLECTION_NAME, EMBEDDING_DIMENSION)

    # 分批嵌入和写入
    total_written = 0
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        texts = [c["text"] for c in batch]

        try:
            vectors = await embed_texts(texts)
        except Exception as e:
            logger.warning("批次 %d 嵌入失败: %s，跳过", i // BATCH_SIZE, e)
            continue

        points: list[models.PointStruct] = []
        for chunk, vector in zip(batch, vectors, strict=True):
            payload = {
                "content": chunk["text"],
                **chunk.get("metadata", {}),
            }
            points.append(
                models.PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload=payload,
                )
            )

        client.upsert(collection_name=COLLECTION_NAME, points=points)
        total_written += len(points)
        logger.info(
            "进度: %d/%d (%.1f%%)",
            total_written,
            len(chunks),
            total_written / len(chunks) * 100,
        )

    logger.info("=" * 60)
    logger.info("向量化完成: %d 条写入 %s", total_written, COLLECTION_NAME)
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
