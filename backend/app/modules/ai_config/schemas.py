import uuid

from pydantic import Field

from app.shared.base_schema import BaseResponse, BaseSchema

# ── Legacy AiConfiguration schemas (backward compat) ──────────────


class AiConfigCreate(BaseSchema):
    scope: str = "global"
    scope_id: uuid.UUID | None = None
    team_standard_prompt: str | None = None
    module_rules: dict | None = None
    output_preference: dict | None = None
    scope_preference: dict | None = None
    rag_config: dict | None = None
    custom_checklist: dict | None = None
    llm_model: str | None = None
    llm_temperature: float | None = None
    api_keys: dict | None = None
    vector_config: dict | None = None


class AiConfigUpdate(BaseSchema):
    team_standard_prompt: str | None = None
    module_rules: dict | None = None
    output_preference: dict | None = None
    scope_preference: dict | None = None
    rag_config: dict | None = None
    custom_checklist: dict | None = None
    llm_model: str | None = None
    llm_temperature: float | None = None
    api_keys: dict | None = None
    vector_config: dict | None = None


class AiConfigResponse(BaseResponse):
    scope: str
    scope_id: uuid.UUID | None
    system_rules_version: str
    team_standard_prompt: str | None
    module_rules: dict | None
    output_preference: dict | None
    scope_preference: dict | None
    rag_config: dict | None
    custom_checklist: dict | None
    llm_model: str | None
    llm_temperature: float | None
    api_keys: dict | None = None
    vector_config: dict | None = None


# ── ModelConfiguration schemas ─────────────────────────────────────


class ModelConfigCreate(BaseSchema):
    name: str = Field(..., max_length=100)
    provider: str = Field(..., max_length=50)
    model_id: str = Field(..., max_length=100)
    base_url: str | None = None
    api_key: str | None = None
    temperature: float = 0.7
    max_tokens: int | None = None
    purpose_tags: list[str] = Field(default_factory=list)
    is_enabled: bool = True
    is_default: bool = False
    extra_params: dict | None = None


class ModelConfigUpdate(BaseSchema):
    name: str | None = None
    provider: str | None = None
    model_id: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    purpose_tags: list[str] | None = None
    is_enabled: bool | None = None
    is_default: bool | None = None
    extra_params: dict | None = None


class ModelConfigResponse(BaseResponse):
    name: str
    provider: str
    model_id: str
    base_url: str | None
    api_key_masked: str | None = None
    temperature: float
    max_tokens: int | None
    purpose_tags: list[str]
    is_enabled: bool
    is_default: bool
    extra_params: dict | None


# ── PromptConfiguration schemas ────────────────────────────────────


class PromptConfigUpdate(BaseSchema):
    system_prompt: str
    change_reason: str | None = None


class PromptConfigResponse(BaseResponse):
    module: str
    system_prompt: str
    is_customized: bool
    version: int


class PromptHistoryResponse(BaseResponse):
    module: str
    version: int
    system_prompt: str
    change_reason: str | None
