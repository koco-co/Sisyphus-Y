import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.core.dependencies import AsyncSessionDep
from app.modules.ai_config.schemas import AiConfigCreate, AiConfigResponse, AiConfigUpdate
from app.modules.ai_config.service import AiConfigService

router = APIRouter(prefix="/ai-config", tags=["ai-config"])


@router.get("", response_model=list[AiConfigResponse])
async def list_configs(session: AsyncSessionDep) -> list[AiConfigResponse]:
    service = AiConfigService(session)
    configs = await service.list_configs()
    return [AiConfigResponse.model_validate(c) for c in configs]


@router.get("/effective", response_model=dict)
async def get_effective_config(
    session: AsyncSessionDep,
    iteration_id: Annotated[uuid.UUID | None, Query()] = None,
    product_id: Annotated[uuid.UUID | None, Query()] = None,
) -> dict:
    service = AiConfigService(session)
    return await service.get_effective_config(iteration_id, product_id)


@router.get("/providers")
async def get_providers() -> dict:
    """返回平台支持的 LLM 提供商和各提供商的模型版本列表。"""
    return {
        "providers": [
            {
                "id": "zhipu",
                "name": "智谱AI",
                "description": "国内领先大模型，中文理解强，响应速度快，适合需求诊断与追问场景",
                "api_key_placeholder": "xxxxxxxx.xxxxxxxxxx",
                "models": [
                    {
                        "id": "glm-4-flash",
                        "name": "GLM-4-Flash",
                        "description": "速度最快，适合实时对话",
                        "recommended": True,
                    },
                    {"id": "glm-4", "name": "GLM-4", "description": "综合能力强，性价比高"},
                    {"id": "glm-4-air", "name": "GLM-4-Air", "description": "轻量版，低延迟"},
                    {"id": "glm-4-airx", "name": "GLM-4-AirX", "description": "极速推理版"},
                    {"id": "glm-4-long", "name": "GLM-4-Long", "description": "超长上下文（128K）"},
                ],
            },
            {
                "id": "dashscope",
                "name": "阿里云百炼",
                "description": "阿里云 DashScope，推理能力强，结构化输出稳定，适合复杂用例 CoT 生成",
                "api_key_placeholder": "sk-xxxxxxxxxxxxxxxx",
                "models": [
                    {
                        "id": "qwen-max",
                        "name": "Qwen-Max",
                        "description": "最高质量，复杂推理首选",
                        "recommended": True,
                    },
                    {"id": "qwen-plus", "name": "Qwen-Plus", "description": "质量与速度均衡"},
                    {"id": "qwen-turbo", "name": "Qwen-Turbo", "description": "高速低成本"},
                    {"id": "qwen-long", "name": "Qwen-Long", "description": "超长上下文（1M Token）"},
                ],
            },
            {
                "id": "openai",
                "name": "OpenAI",
                "description": "兼容 OpenAI 协议的模型，也可配合自定义 Base URL 使用 Moonshot、DeepSeek 等兼容服务",
                "api_key_placeholder": "sk-xxxxxxxxxxxxxxxx",
                "models": [
                    {"id": "gpt-4o", "name": "GPT-4o", "description": "多模态旗舰模型", "recommended": True},
                    {"id": "gpt-4o-mini", "name": "GPT-4o mini", "description": "低成本版，适合高并发"},
                    {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "description": "强推理，128K 上下文"},
                    {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "description": "经济型，快速响应"},
                ],
            },
        ]
    }


@router.get("/{config_id}", response_model=AiConfigResponse)
async def get_config(config_id: uuid.UUID, session: AsyncSessionDep) -> AiConfigResponse:
    service = AiConfigService(session)
    config = await service.get_config(config_id)
    return AiConfigResponse.model_validate(config)


@router.post("", response_model=AiConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_config(data: AiConfigCreate, session: AsyncSessionDep) -> AiConfigResponse:
    service = AiConfigService(session)
    config = await service.create_config(data)
    return AiConfigResponse.model_validate(config)


@router.patch("/{config_id}", response_model=AiConfigResponse)
async def update_config(config_id: uuid.UUID, data: AiConfigUpdate, session: AsyncSessionDep) -> AiConfigResponse:
    service = AiConfigService(session)
    config = await service.update_config(config_id, data)
    return AiConfigResponse.model_validate(config)


@router.post("/test-llm")
async def test_llm_connection(
    provider: str = "zhipu",
    model: str | None = None,
) -> dict:
    """Test LLM provider connection by sending a simple ping message."""
    try:
        from app.ai.llm_client import invoke_llm

        result = await invoke_llm(
            [{"role": "user", "content": "请回复'连接成功'四个字。"}],
            provider=provider,
            max_retries=0,
        )
        return {
            "status": "ok",
            "provider": provider,
            "response_preview": result.content[:100],
            "usage": result.usage,
        }
    except Exception as e:
        return {
            "status": "error",
            "provider": provider,
            "error": str(e),
        }


@router.post("/test-embedding")
async def test_embedding_connection() -> dict:
    """Test embedding/vector service connection."""
    try:
        from qdrant_client import QdrantClient

        from app.core.config import settings

        client = QdrantClient(url=settings.qdrant_url, timeout=5)
        collections = client.get_collections()
        return {
            "status": "ok",
            "qdrant_url": settings.qdrant_url,
            "collections_count": len(collections.collections),
            "collection_names": [c.name for c in collections.collections],
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
        }
