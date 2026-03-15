import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.prompts import (
    DEFAULT_OUTPUT_PREFERENCE,
    DEFAULT_RAG_CONFIG,
    DEFAULT_SCOPE_PREFERENCE,
    DEFAULT_TEAM_STANDARD,
)
from app.core.encryption import decrypt_api_key, encrypt_api_key, mask_api_key
from app.modules.ai_config.models import AiConfiguration, ModelConfiguration, PromptConfiguration, PromptHistory
from app.modules.ai_config.schemas import AiConfigCreate, AiConfigUpdate, ModelConfigCreate, ModelConfigUpdate
from app.modules.products.models import Iteration

logger = logging.getLogger(__name__)


# ── Legacy AiConfiguration service ─────────────────────────────────


class AiConfigService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_config(self, config_id: UUID) -> AiConfiguration:
        config = await self.session.get(AiConfiguration, config_id)
        if not config or config.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Config not found")
        return config

    async def get_by_scope(self, scope: str, scope_id: UUID | None = None) -> AiConfiguration | None:
        query = select(AiConfiguration).where(
            AiConfiguration.scope == scope,
            AiConfiguration.deleted_at.is_(None),
        )
        if scope_id:
            query = query.where(AiConfiguration.scope_id == scope_id)
        else:
            query = query.where(AiConfiguration.scope_id.is_(None))
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create_config(self, data: AiConfigCreate) -> AiConfiguration:
        dump = data.model_dump(exclude_none=True)
        if "api_keys" in dump and dump["api_keys"]:
            dump["api_keys"] = self._encrypt_keys(dump["api_keys"])
        config = AiConfiguration(**dump)
        self.session.add(config)
        await self.session.commit()
        await self.session.refresh(config)
        return config

    async def update_config(self, config_id: UUID, data: AiConfigUpdate) -> AiConfiguration:
        config = await self.get_config(config_id)
        updates = data.model_dump(exclude_unset=True)
        if "api_keys" in updates:
            if updates["api_keys"]:
                existing_keys = config.api_keys or {}
                updates["api_keys"] = {
                    **existing_keys,
                    **self._encrypt_keys(updates["api_keys"]),
                }
            else:
                del updates["api_keys"]
        for key, value in updates.items():
            setattr(config, key, value)
        await self.session.commit()
        await self.session.refresh(config)
        return config

    async def get_effective_config(self, iteration_id: UUID | None = None, product_id: UUID | None = None) -> dict:
        merged = await self._get_effective_raw(iteration_id, product_id)
        return self._mask_keys_in_result(merged)

    async def get_effective_config_with_secrets(
        self, iteration_id: UUID | None = None, product_id: UUID | None = None
    ) -> dict:
        merged = await self._get_effective_raw(iteration_id, product_id)
        if merged.get("api_keys"):
            merged["api_keys"] = self._decrypt_keys(merged["api_keys"])
        return merged

    async def _get_effective_raw(self, iteration_id: UUID | None = None, product_id: UUID | None = None) -> dict:
        merged: dict = {
            "team_standard_prompt": DEFAULT_TEAM_STANDARD,
            "output_preference": dict(DEFAULT_OUTPUT_PREFERENCE),
            "scope_preference": dict(DEFAULT_SCOPE_PREFERENCE),
            "rag_config": dict(DEFAULT_RAG_CONFIG),
            "module_rules": {},
            "custom_checklist": [],
            "llm_model": None,
            "llm_temperature": None,
            "api_keys": None,
            "vector_config": None,
        }

        resolved_product_id = product_id
        if iteration_id and not resolved_product_id:
            iteration = await self.session.get(Iteration, iteration_id)
            if iteration:
                resolved_product_id = iteration.product_id

        global_config = await self.get_by_scope("global")
        if global_config:
            merged = self._merge_config(merged, global_config)

        if resolved_product_id:
            product_config = await self.get_by_scope("product", resolved_product_id)
            if product_config:
                merged = self._merge_config(merged, product_config)

        if iteration_id:
            iteration_config = await self.get_by_scope("iteration", iteration_id)
            if iteration_config:
                merged = self._merge_config(merged, iteration_config)

        return merged

    def _mask_keys_in_result(self, result: dict) -> dict:
        if result.get("api_keys"):
            result["api_keys"] = self._mask_keys(result["api_keys"])
        return result

    @staticmethod
    def _encrypt_keys(keys: dict) -> dict:
        return {k: encrypt_api_key(v) for k, v in keys.items() if v}

    @staticmethod
    def _decrypt_keys(keys: dict) -> dict:
        decrypted = {}
        for k, v in keys.items():
            try:
                decrypted[k] = decrypt_api_key(v)
            except Exception:
                decrypted[k] = v
        return decrypted

    @staticmethod
    def _mask_keys(keys: dict) -> dict:
        masked = {}
        for k, v in keys.items():
            try:
                plain = decrypt_api_key(v)
                masked[k] = mask_api_key(plain)
            except Exception:
                masked[k] = mask_api_key(v)
        return masked

    def _merge_config(self, base: dict, override: AiConfiguration) -> dict:
        result = dict(base)

        if override.team_standard_prompt:
            result["team_standard_prompt"] = override.team_standard_prompt
        if override.llm_model:
            result["llm_model"] = override.llm_model
        if override.llm_temperature is not None:
            result["llm_temperature"] = override.llm_temperature

        if override.output_preference:
            result["output_preference"] = {**result.get("output_preference", {}), **override.output_preference}
        if override.scope_preference:
            result["scope_preference"] = {**result.get("scope_preference", {}), **override.scope_preference}
        if override.rag_config:
            result["rag_config"] = {**result.get("rag_config", {}), **override.rag_config}
        if override.module_rules:
            result["module_rules"] = {**result.get("module_rules", {}), **override.module_rules}
        if override.custom_checklist:
            existing = result.get("custom_checklist", [])
            if isinstance(existing, list) and isinstance(override.custom_checklist, list):
                result["custom_checklist"] = existing + override.custom_checklist
            else:
                result["custom_checklist"] = override.custom_checklist

        if override.api_keys:
            result["api_keys"] = {**(result.get("api_keys") or {}), **override.api_keys}
        if override.vector_config:
            result["vector_config"] = {**(result.get("vector_config") or {}), **override.vector_config}

        return result

    async def list_configs(self) -> list[AiConfiguration]:
        result = await self.session.execute(select(AiConfiguration).where(AiConfiguration.deleted_at.is_(None)))
        return list(result.scalars().all())


# ── ModelConfiguration service ─────────────────────────────────────


class ModelConfigService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_models(self) -> list[ModelConfiguration]:
        q = (
            select(ModelConfiguration)
            .where(ModelConfiguration.deleted_at.is_(None))
            .order_by(ModelConfiguration.is_default.desc(), ModelConfiguration.created_at)
        )
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def get_model(self, model_config_id: UUID) -> ModelConfiguration:
        item = await self.session.get(ModelConfiguration, model_config_id)
        if not item or item.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model config not found")
        return item

    async def create_model(self, data: ModelConfigCreate) -> ModelConfiguration:
        dump = data.model_dump(exclude={"api_key"})
        if data.api_key:
            dump["api_key_encrypted"] = encrypt_api_key(data.api_key)
        if data.is_default:
            await self._clear_default()
        item = ModelConfiguration(**dump)
        self.session.add(item)
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def update_model(self, model_config_id: UUID, data: ModelConfigUpdate) -> ModelConfiguration:
        item = await self.get_model(model_config_id)
        updates = data.model_dump(exclude_unset=True, exclude={"api_key"})
        if data.api_key is not None:
            updates["api_key_encrypted"] = encrypt_api_key(data.api_key) if data.api_key else None
        if updates.get("is_default"):
            await self._clear_default()
        for key, value in updates.items():
            setattr(item, key, value)
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def delete_model(self, model_config_id: UUID) -> None:
        item = await self.get_model(model_config_id)
        from datetime import UTC, datetime

        item.deleted_at = datetime.now(UTC)
        await self.session.commit()

    async def _clear_default(self) -> None:
        q = select(ModelConfiguration).where(
            ModelConfiguration.is_default.is_(True),
            ModelConfiguration.deleted_at.is_(None),
        )
        result = await self.session.execute(q)
        for m in result.scalars().all():
            m.is_default = False

    def serialize(self, item: ModelConfiguration) -> dict:
        masked_key = None
        if item.api_key_encrypted:
            try:
                plain = decrypt_api_key(item.api_key_encrypted)
                masked_key = mask_api_key(plain)
            except Exception:
                masked_key = "***"
        return {
            "id": item.id,
            "name": item.name,
            "provider": item.provider,
            "model_id": item.model_id,
            "base_url": item.base_url,
            "api_key_masked": masked_key,
            "temperature": item.temperature,
            "max_tokens": item.max_tokens,
            "purpose_tags": item.purpose_tags or [],
            "is_enabled": item.is_enabled,
            "is_default": item.is_default,
            "extra_params": item.extra_params,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
        }


# ── PromptConfiguration service ────────────────────────────────────


class PromptConfigService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_prompts(self) -> list[PromptConfiguration]:
        q = (
            select(PromptConfiguration)
            .where(PromptConfiguration.deleted_at.is_(None))
            .order_by(PromptConfiguration.module)
        )
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def get_prompt(self, module: str) -> PromptConfiguration | None:
        q = select(PromptConfiguration).where(
            PromptConfiguration.module == module,
            PromptConfiguration.deleted_at.is_(None),
        )
        result = await self.session.execute(q)
        return result.scalar_one_or_none()

    async def upsert_prompt(
        self, module: str, system_prompt: str, change_reason: str | None = None
    ) -> PromptConfiguration:
        existing = await self.get_prompt(module)
        if existing:
            await self._save_history(existing, change_reason)
            existing.system_prompt = system_prompt
            existing.is_customized = True
            existing.version += 1
            await self.session.commit()
            await self.session.refresh(existing)
            return existing

        item = PromptConfiguration(module=module, system_prompt=system_prompt, is_customized=True, version=1)
        self.session.add(item)
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def reset_prompt(self, module: str) -> None:
        existing = await self.get_prompt(module)
        if not existing:
            return
        from datetime import UTC, datetime

        existing.deleted_at = datetime.now(UTC)
        await self.session.commit()

    async def get_history(self, module: str) -> list[PromptHistory]:
        q = (
            select(PromptHistory)
            .where(PromptHistory.module == module, PromptHistory.deleted_at.is_(None))
            .order_by(PromptHistory.version.desc())
            .limit(5)
        )
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def rollback_prompt(self, module: str, history_id: UUID) -> PromptConfiguration:
        history = await self.session.get(PromptHistory, history_id)
        if not history or history.deleted_at is not None or history.module != module:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt history not found")

        existing = await self.get_prompt(module)
        if existing:
            await self._save_history(existing, "rollback")
            existing.system_prompt = history.system_prompt
            existing.is_customized = True
            existing.version += 1
            target = existing
        else:
            target = PromptConfiguration(
                module=module,
                system_prompt=history.system_prompt,
                is_customized=True,
                version=max(history.version + 1, 1),
            )
            self.session.add(target)

        await self.session.commit()
        await self.session.refresh(target)
        return target

    async def _save_history(self, prompt: PromptConfiguration, change_reason: str | None) -> None:
        history = PromptHistory(
            module=prompt.module,
            version=prompt.version,
            system_prompt=prompt.system_prompt,
            change_reason=change_reason,
        )
        self.session.add(history)

        # Keep max 5 versions per module
        q = (
            select(PromptHistory)
            .where(PromptHistory.module == prompt.module, PromptHistory.deleted_at.is_(None))
            .order_by(PromptHistory.version.desc())
        )
        result = await self.session.execute(q)
        all_history = list(result.scalars().all())
        if len(all_history) >= 5:
            from datetime import UTC, datetime

            for old in all_history[4:]:
                old.deleted_at = datetime.now(UTC)
