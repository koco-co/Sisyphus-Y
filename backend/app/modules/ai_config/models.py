import uuid

from sqlalchemy import Boolean, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import BaseModel


class AiConfiguration(BaseModel):
    """Legacy scope-based AI config. Preserved for backward compatibility."""

    __tablename__ = "ai_configurations"

    scope: Mapped[str] = mapped_column(String(20), default="global")
    scope_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    system_rules_version: Mapped[str] = mapped_column(String(20), default="1.0")
    team_standard_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    module_rules: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    output_preference: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    scope_preference: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    rag_config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    custom_checklist: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    llm_model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    llm_temperature: Mapped[float | None] = mapped_column(Float, nullable=True)

    # API key storage (encrypted via core/encryption.py)
    api_keys: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Vector/embedding model configuration
    vector_config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class ModelConfiguration(BaseModel):
    """Individual LLM model configuration (multi-record list)."""

    __tablename__ = "model_configurations"

    name: Mapped[str] = mapped_column(String(100))
    provider: Mapped[str] = mapped_column(String(50), index=True)
    model_id: Mapped[str] = mapped_column(String(100))
    base_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    api_key_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    max_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    purpose_tags: Mapped[list] = mapped_column(JSONB, default=list)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    extra_params: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class PromptConfiguration(BaseModel):
    """Module-level system prompt configuration."""

    __tablename__ = "prompt_configurations"

    module: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    system_prompt: Mapped[str] = mapped_column(Text)
    is_customized: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)


class PromptHistory(BaseModel):
    """Prompt version history for rollback (max 5 per module)."""

    __tablename__ = "prompt_histories"

    module: Mapped[str] = mapped_column(String(50), index=True)
    version: Mapped[int] = mapped_column(Integer)
    system_prompt: Mapped[str] = mapped_column(Text)
    change_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
