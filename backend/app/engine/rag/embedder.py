"""向量嵌入器 — 将文本转换为向量表示。

支持多种嵌入模型后端：
- dashscope (通义千问 text-embedding-v3)
- zhipu (智谱 embedding-3)
- openai (text-embedding-3-small)

通过 ``app.core.config.settings`` 读取 provider 和 API Key，
自动选择对应的嵌入后端。
"""

import asyncio
import logging
from typing import TYPE_CHECKING

import httpx

from app.core.config import settings

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
# 嵌入维度常量
# ═══════════════════════════════════════════════════════════════════

_DIMENSIONS: dict[str, int] = {
    "dashscope": 1024,
    "zhipu": 2048,
    "openai": 1536,
    "local": 512,
    "voyageai": 1024,
}

EMBEDDING_DIMENSION: int = _DIMENSIONS.get(
    settings.embedding_provider or settings.llm_provider, 1024
)

# ═══════════════════════════════════════════════════════════════════
# 嵌入 API 调用
# ═══════════════════════════════════════════════════════════════════

_TIMEOUT = httpx.Timeout(60.0, connect=10.0)


async def embed_texts(texts: list[str], *, batch_size: int = 16) -> list[list[float]]:
    """批量嵌入文本，返回与输入等长的向量列表。

    Args:
        texts: 待嵌入的文本列表。
        batch_size: 每次 API 调用的批大小（避免超限）。

    Returns:
        二维列表 ``[[float, ...], ...]``，长度与 texts 相同。
    """
    if not texts:
        return []

    provider = settings.embedding_provider or settings.llm_provider
    all_vectors: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        vectors = await _embed_batch(batch, provider)
        all_vectors.extend(vectors)

    if len(all_vectors) != len(texts):
        raise ValueError(f"嵌入结果数量不匹配: 输入 {len(texts)}, 返回 {len(all_vectors)}")

    logger.info("嵌入完成: %d 条文本 (provider=%s)", len(texts), provider)
    return all_vectors


async def embed_query(text: str) -> list[float]:
    """对单条查询文本进行嵌入。"""
    vectors = await embed_texts([text])
    return vectors[0]


# ═══════════════════════════════════════════════════════════════════
# Provider 实现
# ═══════════════════════════════════════════════════════════════════


async def _embed_batch(texts: list[str], provider: str) -> list[list[float]]:
    if provider == "dashscope":
        return await _embed_dashscope(texts)
    if provider == "zhipu":
        return await _embed_zhipu(texts)
    if provider == "openai":
        return await _embed_openai(texts)
    if provider == "local":
        return await _embed_local(texts)
    if provider == "voyageai":
        return await _embed_voyageai(texts)
    raise ValueError(f"不支持的嵌入 provider: {provider}")


async def _embed_dashscope(texts: list[str]) -> list[list[float]]:
    """通义千问 text-embedding-v3。"""
    url = f"{settings.dashscope_base_url}/embeddings"
    headers = {
        "Authorization": f"Bearer {settings.dashscope_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "text-embedding-v3",
        "input": texts,
        "dimensions": _DIMENSIONS["dashscope"],
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT, trust_env=False) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    return [item["embedding"] for item in sorted(data["data"], key=lambda x: x["index"])]


async def _embed_zhipu(texts: list[str]) -> list[list[float]]:
    """智谱 embedding-3 — 同步 SDK 用 to_thread 包裹，避免阻塞事件循环。"""
    import httpx
    from zhipuai import ZhipuAI

    client = ZhipuAI(
        api_key=settings.zhipu_api_key,
        http_client=httpx.Client(proxy=None, trust_env=False),
    )

    def _call_sync() -> list[list[float]]:
        vectors: list[list[float]] = []
        for text in texts:
            resp = client.embeddings.create(model="embedding-3", input=text)
            vectors.append(resp.data[0].embedding)
        return vectors

    return await asyncio.to_thread(_call_sync)


async def _embed_openai(texts: list[str]) -> list[list[float]]:
    """OpenAI text-embedding-3-small。"""
    url = "https://api.openai.com/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "text-embedding-3-small",
        "input": texts,
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT, trust_env=False) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    return [item["embedding"] for item in sorted(data["data"], key=lambda x: x["index"])]


async def _embed_voyageai(texts: list[str]) -> list[list[float]]:
    """Voyage AI voyage-3.5-lite（REST API）— 带重试。"""
    url = "https://api.voyageai.com/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {settings.voyageai_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.voyageai_model,
        "input": texts,
        "input_type": "document",
    }

    last_error: Exception | None = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT, trust_env=False) as client:
                resp = await client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
            return [item["embedding"] for item in sorted(data["data"], key=lambda x: x["index"])]
        except httpx.HTTPStatusError as e:
            last_error = e
            if e.response.status_code == 429 and attempt < 2:
                wait = 2 ** (attempt + 1)
                logger.warning("Voyage AI 429, %ds 后重试 (attempt %d/3)", wait, attempt + 1)
                await asyncio.sleep(wait)
            else:
                raise
    raise RuntimeError(f"Voyage AI 嵌入失败: {last_error}")


# ── 本地嵌入（fastembed + ONNX，无需 API Key） ──────────────────

_LOCAL_MODEL: object | None = None
_LOCAL_MODEL_NAME = "BAAI/bge-small-zh-v1.5"


def _get_local_model():
    """懒加载 fastembed 模型（首次加载约 2s）。"""
    global _LOCAL_MODEL  # noqa: PLW0603
    if _LOCAL_MODEL is None:
        from fastembed import TextEmbedding

        _LOCAL_MODEL = TextEmbedding(_LOCAL_MODEL_NAME)
        logger.info("本地嵌入模型已加载: %s", _LOCAL_MODEL_NAME)
    return _LOCAL_MODEL


async def _embed_local(texts: list[str]) -> list[list[float]]:
    """本地嵌入 — fastembed (ONNX Runtime)，适用于无 API Key 场景。"""
    import numpy as np

    def _run():
        model = _get_local_model()
        embeddings = list(model.embed(texts))
        return [e.tolist() if isinstance(e, np.ndarray) else list(e) for e in embeddings]

    return await asyncio.to_thread(_run)
