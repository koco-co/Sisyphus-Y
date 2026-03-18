'use client';

import { Bot, Check, ChevronDown, Eye, EyeOff, Loader2, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConnectionTestButton } from '@/components/ui/ConnectionTestButton';
import { useAiConfig } from '@/hooks/useAiConfig';
import {
  api,
  type EffectiveAiConfig,
  type ModelConfigPayload,
  type ModelConfigRecord,
} from '@/lib/api';
import { VectorModelSettings } from './VectorModelSettings';

interface ModelOption {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
}

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  api_key_placeholder: string;
  requires_base_url?: boolean;
  default_base_url?: string;
  models: ModelOption[];
}

interface ModelDraft {
  name: string;
  provider: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  apiKeyMasked: string | null;
  apiKeyVisible: boolean;
  temperature: number;
  maxTokens: string;
  purposeTagsText: string;
  isEnabled: boolean;
  isDefault: boolean;
}

const DEFAULT_PROVIDER_ID = 'zhipu';
const DEFAULT_MODEL_ID = 'glm-5';

function getRecommendedModelId(
  provider?: ProviderInfo | null,
  fallback = DEFAULT_MODEL_ID,
): string {
  if (!provider) {
    return fallback;
  }

  return (
    provider.models.find((model) => model.recommended)?.id ?? provider.models[0]?.id ?? fallback
  );
}

function getBaseUrlFromEffectiveConfig(effectiveConfig: EffectiveAiConfig | null): string {
  const baseUrl = effectiveConfig?.output_preference?.base_url;
  return typeof baseUrl === 'string' ? baseUrl : '';
}

function buildEmptyDraft(
  provider?: ProviderInfo | null,
  effectiveConfig?: EffectiveAiConfig | null,
): ModelDraft {
  const initialProvider = provider?.id ?? DEFAULT_PROVIDER_ID;

  return {
    name: '',
    provider: initialProvider,
    modelId: getRecommendedModelId(provider, effectiveConfig?.llm_model ?? DEFAULT_MODEL_ID),
    baseUrl: provider?.requires_base_url
      ? (provider.default_base_url ?? '')
      : getBaseUrlFromEffectiveConfig(effectiveConfig ?? null),
    apiKey: '',
    apiKeyMasked: null,
    apiKeyVisible: false,
    temperature: effectiveConfig?.llm_temperature ?? 0.7,
    maxTokens:
      typeof effectiveConfig?.output_preference?.max_tokens === 'number'
        ? String(effectiveConfig.output_preference.max_tokens)
        : '',
    purposeTagsText: '',
    isEnabled: true,
    isDefault: false,
  };
}

function buildDraftFromModel(model: ModelConfigRecord): ModelDraft {
  return {
    name: model.name,
    provider: model.provider,
    modelId: model.model_id,
    baseUrl: model.base_url ?? '',
    apiKey: model.api_key_masked ?? '',
    apiKeyMasked: model.api_key_masked,
    apiKeyVisible: false,
    temperature: model.temperature,
    maxTokens: model.max_tokens ? String(model.max_tokens) : '',
    purposeTagsText: model.purpose_tags.join(', '),
    isEnabled: model.is_enabled,
    isDefault: model.is_default,
  };
}

function parsePurposeTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseMaxTokens(value: string): number | null {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function getChangedApiKey(draft: ModelDraft): string | undefined {
  const trimmed = draft.apiKey.trim();
  if (!trimmed || trimmed.includes('***')) {
    return undefined;
  }

  return trimmed;
}

export function AIModelSettings() {
  const {
    effectiveConfig,
    modelConfigs,
    loading,
    saving,
    error,
    saveGlobalConfig,
    createModelConfig,
    updateModelConfig,
    deleteModelConfig,
  } = useAiConfig();

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('edit');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ModelDraft>(() => buildEmptyDraft());
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [revealingKey, setRevealingKey] = useState(false);

  useEffect(() => {
    api
      .get<{ providers: ProviderInfo[] }>('/ai-config/providers')
      .then((data) => setProviders(data.providers ?? []))
      .catch(() => setProviders([]))
      .finally(() => setProvidersLoading(false));
  }, []);

  const defaultProvider = useMemo(
    () => providers.find((provider) => provider.id === DEFAULT_PROVIDER_ID) ?? providers[0] ?? null,
    [providers],
  );

  const selectedModel = useMemo(
    () => modelConfigs.find((item) => item.id === selectedModelId) ?? null,
    [modelConfigs, selectedModelId],
  );

  const activeProvider = useMemo(
    () => providers.find((provider) => provider.id === draft.provider) ?? null,
    [draft.provider, providers],
  );

  const activeModelOption = useMemo(
    () => activeProvider?.models.find((model) => model.id === draft.modelId) ?? null,
    [activeProvider, draft.modelId],
  );

  const showBaseUrl = Boolean(activeProvider?.requires_base_url || draft.baseUrl.trim());
  const isSaveDisabled =
    loading ||
    saving ||
    deleting ||
    !draft.name.trim() ||
    !draft.provider.trim() ||
    !draft.modelId.trim();

  useEffect(() => {
    if (editorMode === 'create') {
      if (!providers.length || providers.some((provider) => provider.id === draft.provider)) {
        return;
      }

      const nextProvider = defaultProvider;
      setDraft((prev) => ({
        ...prev,
        provider: nextProvider?.id ?? prev.provider,
        modelId: getRecommendedModelId(nextProvider, prev.modelId),
        baseUrl: nextProvider?.requires_base_url
          ? (nextProvider.default_base_url ?? prev.baseUrl)
          : prev.baseUrl,
      }));
      return;
    }

    if (modelConfigs.length === 0) {
      setSelectedModelId(null);
      setEditorMode('create');
      setDraft(buildEmptyDraft(defaultProvider, effectiveConfig));
      return;
    }

    const resolvedModel =
      modelConfigs.find((item) => item.id === selectedModelId) ??
      modelConfigs.find((item) => item.is_default) ??
      modelConfigs[0];

    if (!resolvedModel) {
      return;
    }

    if (selectedModelId !== resolvedModel.id) {
      setSelectedModelId(resolvedModel.id);
    }
    setDraft(buildDraftFromModel(resolvedModel));
  }, [defaultProvider, editorMode, effectiveConfig, modelConfigs, providers, selectedModelId]);

  const handleSelectExisting = (model: ModelConfigRecord) => {
    setEditorMode('edit');
    setSelectedModelId(model.id);
    setDraft(buildDraftFromModel(model));
    setSaved(false);
    setSheetOpen(true);
  };

  const handleCreateNew = () => {
    setEditorMode('create');
    setSelectedModelId(null);
    setDraft(buildEmptyDraft(activeProvider ?? defaultProvider, effectiveConfig));
    setSaved(false);
    setSheetOpen(true);
  };

  const handleProviderChange = (providerId: string) => {
    const provider = providers.find((item) => item.id === providerId) ?? null;

    setDraft((prev) => ({
      ...prev,
      provider: providerId,
      modelId: getRecommendedModelId(provider, prev.modelId),
      baseUrl: provider?.requires_base_url ? (provider.default_base_url ?? prev.baseUrl) : '',
    }));
  };

  const syncDefaultModelToGlobal = async (model: ModelConfigRecord, submittedDraft: ModelDraft) => {
    if (!submittedDraft.isDefault) {
      return true;
    }

    const nextOutputPreference = {
      ...(effectiveConfig?.output_preference ?? {}),
    };
    const nextMaxTokens = parseMaxTokens(submittedDraft.maxTokens);

    if (nextMaxTokens) {
      nextOutputPreference.max_tokens = nextMaxTokens;
    } else {
      delete nextOutputPreference.max_tokens;
    }

    const trimmedBaseUrl = submittedDraft.baseUrl.trim();
    if (trimmedBaseUrl) {
      nextOutputPreference.base_url = trimmedBaseUrl;
    } else {
      delete nextOutputPreference.base_url;
    }

    const payload: Parameters<typeof saveGlobalConfig>[0] = {
      llm_model: model.model_id,
      llm_temperature: submittedDraft.temperature,
      output_preference: nextOutputPreference,
    };

    const apiKey = getChangedApiKey(submittedDraft);
    if (apiKey) {
      payload.api_keys = { [model.provider]: apiKey };
    }

    return saveGlobalConfig(payload);
  };

  const handleSave = async () => {
    const apiKey = getChangedApiKey(draft);
    const payload: ModelConfigPayload = {
      name: draft.name.trim(),
      provider: draft.provider.trim(),
      model_id: draft.modelId.trim(),
      base_url: draft.baseUrl.trim() || null,
      temperature: draft.temperature,
      max_tokens: parseMaxTokens(draft.maxTokens),
      purpose_tags: parsePurposeTags(draft.purposeTagsText),
      is_enabled: draft.isEnabled,
      is_default: draft.isDefault,
      extra_params: null,
    };

    if (apiKey) {
      payload.api_key = apiKey;
    }

    const submittedDraft = { ...draft };
    const result =
      editorMode === 'edit' && selectedModelId
        ? await updateModelConfig(selectedModelId, payload)
        : await createModelConfig(payload);

    if (!result) {
      return;
    }

    const synced = await syncDefaultModelToGlobal(result, submittedDraft);
    if (!synced) {
      return;
    }

    setEditorMode('edit');
    setSelectedModelId(result.id);
    setDraft(buildDraftFromModel(result));
    setSaved(true);
    setSheetOpen(false);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async () => {
    if (!selectedModelId) {
      return;
    }

    setDeleting(true);
    const ok = await deleteModelConfig(selectedModelId);
    setDeleting(false);
    if (!ok) {
      return;
    }

    setSelectedModelId(null);
    setEditorMode('edit');
    setSaved(false);
    setSheetOpen(false);
  };

  const handleRevealKey = async () => {
    if (!selectedModelId) return;
    if (draft.apiKeyVisible) {
      setDraft((prev) => ({ ...prev, apiKeyVisible: false }));
      return;
    }
    setRevealingKey(true);
    try {
      const data = await api.get<{ api_key: string }>(`/ai-config/models/${selectedModelId}/reveal-key`);
      setDraft((prev) => ({ ...prev, apiKey: data.api_key, apiKeyVisible: true }));
    } catch {
      toast.error('无法获取 API Key，请检查服务器配置');
    } finally {
      setRevealingKey(false);
    }
  };

  return (
    <>
      <div>
        <div className="sec-header">
          <Bot className="h-4 w-4 text-sy-accent" />
          <span className="sec-title">AI 模型配置</span>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-sy-danger/20 bg-sy-danger/8 px-3 py-2 text-[12.5px] text-sy-danger">
            {error}
          </div>
        )}

        <div className="mb-6">
          <div className="card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold text-sy-text">模型配置列表</p>
                <p className="mt-1 text-[11px] text-sy-text-3">
                  区分分析、生成等不同用途的 LLM 配置。
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateNew}
                className="inline-flex items-center gap-1.5 rounded-md border border-sy-border bg-sy-bg-2 px-3 py-1.5 text-[12px] font-medium text-sy-text transition-colors hover:border-sy-accent/35 hover:text-sy-accent"
              >
                <Plus className="h-3.5 w-3.5" />
                新建模型配置
              </button>
            </div>

            <div className="space-y-2">
              {modelConfigs.map((model) => {
                const isActive = editorMode === 'edit' && model.id === selectedModelId;

                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSelectExisting(model)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                      isActive
                        ? 'border-sy-accent/40 bg-sy-accent/8 shadow-[0_0_0_1px_rgba(0,217,163,0.15)]'
                        : 'border-sy-border bg-sy-bg-2 hover:border-sy-border-2'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-sy-text">
                          {model.name}
                        </p>
                        <p className="mt-1 text-[11px] text-sy-text-3">
                          {model.provider} / {model.model_id}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {model.is_default && (
                          <span className="rounded-full border border-sy-accent/30 bg-sy-accent/10 px-2 py-0.5 text-[10px] font-mono text-sy-accent">
                            默认
                          </span>
                        )}
                        {!model.is_enabled && (
                          <span className="rounded-full border border-sy-border bg-sy-bg-3 px-2 py-0.5 text-[10px] font-mono text-sy-text-3">
                            已停用
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {model.purpose_tags.length > 0 ? (
                        model.purpose_tags.map((tag) => (
                          <span
                            key={`${model.id}-${tag}`}
                            className="rounded-full border border-sy-info/25 bg-sy-info/10 px-2 py-0.5 text-[10px] font-mono text-sy-info"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-sy-text-3">未设置用途标签</span>
                      )}
                    </div>
                  </button>
                );
              })}

              {modelConfigs.length === 0 && (
                <div className="rounded-xl border border-dashed border-sy-border-2 bg-sy-bg-2 px-3 py-6 text-center">
                  <p className="text-[12px] font-medium text-sy-text-2">还没有模型配置</p>
                  <p className="mt-1 text-[11px] text-sy-text-3">
                    先创建分析模型和用例生成模型，再逐步切换设置页使用方式。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Model Config Sheet Overlay */}
        {sheetOpen && (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            onClick={() => setSheetOpen(false)}
          >
            <div
              className="relative flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-l border-sy-border bg-sy-bg-1 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sheet Header */}
              <div className="flex items-start justify-between gap-3 border-b border-sy-border px-6 py-4">
                <div>
                  <p className="text-[14px] font-semibold text-sy-text">
                    {editorMode === 'create' ? '新建模型配置' : selectedModel?.name || '编辑模型配置'}
                  </p>
                  <p className="mt-1 text-[11px] text-sy-text-3">
                    保存后配置出现在列表；设为默认时会同步更新全局生效模型。
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedModel?.id && (
                    <ConnectionTestButton
                      testUrl={`/api/ai-config/models/${selectedModel.id}/test`}
                      label="测试连接"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-sy-border text-sy-text-3 hover:border-sy-border-2 hover:text-sy-text"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Sheet Body (form) */}
              <div className="flex-1 px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="model-config-name"
                  className="mb-1 block text-[12px] text-sy-text-2"
                >
                  配置名称
                </label>
                <input
                  id="model-config-name"
                  type="text"
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 text-[12.5px] text-sy-text outline-none transition-colors focus:border-sy-accent/50"
                  placeholder="例如：分析主模型"
                />
              </div>

              <div>
                <label
                  htmlFor="model-config-provider"
                  className="mb-1 block text-[12px] text-sy-text-2"
                >
                  Provider
                </label>
                <div className="relative">
                  <select
                    id="model-config-provider"
                    value={draft.provider}
                    onChange={(event) => handleProviderChange(event.target.value)}
                    disabled={loading || saving || providersLoading}
                    className="w-full appearance-none rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 pr-9 text-[12.5px] text-sy-text outline-none transition-colors focus:border-sy-accent/50 disabled:opacity-60"
                  >
                    {(providers.length > 0
                      ? providers
                      : [
                          {
                            id: draft.provider,
                            name: draft.provider || DEFAULT_PROVIDER_ID,
                            description: '',
                            api_key_placeholder: '',
                            models: [],
                          },
                        ]
                    ).map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sy-text-3" />
                </div>
                {activeProvider?.description && (
                  <p className="mt-1 text-[11px] text-sy-text-3">{activeProvider.description}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="model-config-model-id"
                  className="mb-1 block text-[12px] text-sy-text-2"
                >
                  模型版本
                </label>
                {activeProvider?.models.length ? (
                  <div className="relative">
                    <select
                      id="model-config-model-id"
                      value={draft.modelId}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, modelId: event.target.value }))
                      }
                      className="w-full appearance-none rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 pr-9 text-[12.5px] text-sy-text outline-none transition-colors focus:border-sy-accent/50"
                    >
                      {activeProvider.models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                          {model.recommended ? ' · 推荐' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sy-text-3" />
                  </div>
                ) : (
                  <input
                    id="model-config-model-id"
                    type="text"
                    value={draft.modelId}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, modelId: event.target.value }))
                    }
                    className="w-full rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 text-[12.5px] text-sy-text outline-none transition-colors focus:border-sy-accent/50"
                    placeholder="例如：glm-5 / qwen-max"
                  />
                )}
                {activeModelOption?.description && (
                  <p className="mt-1 text-[11px] text-sy-text-3">{activeModelOption.description}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="model-config-purpose-tags"
                  className="mb-1 block text-[12px] text-sy-text-2"
                >
                  用途标签
                </label>
                <input
                  id="model-config-purpose-tags"
                  type="text"
                  value={draft.purposeTagsText}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, purposeTagsText: event.target.value }))
                  }
                  className="w-full rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 text-[12.5px] text-sy-text outline-none transition-colors focus:border-sy-accent/50"
                  placeholder="例如：diagnosis, generation"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="model-config-api-key"
                  className="mb-1 block text-[12px] text-sy-text-2"
                >
                  API Key
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id="model-config-api-key"
                      type={draft.apiKeyVisible ? 'text' : 'password'}
                      value={draft.apiKey}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, apiKey: event.target.value, apiKeyVisible: true }))
                      }
                      className="w-full rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 font-mono text-[12.5px] text-sy-text outline-none transition-colors focus:border-sy-accent/50"
                      placeholder={activeProvider?.api_key_placeholder || 'sk-xxxxxxxx'}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRevealKey()}
                    disabled={revealingKey || (!selectedModelId && editorMode === 'edit')}
                    title={draft.apiKeyVisible ? '隐藏 API Key' : '显示完整 API Key'}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-sy-border bg-sy-bg-2 text-sy-text-3 transition-colors hover:border-sy-border-2 hover:text-sy-text disabled:opacity-40"
                  >
                    {revealingKey ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : draft.apiKeyVisible ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-sy-text-3">
                  {draft.apiKeyMasked
                    ? '保留遮罩值表示沿用已保存密钥；直接输入新值可替换。'
                    : '只在需要替换或新增密钥时填写。'}
                </p>
              </div>

              {showBaseUrl && (
                <div className="md:col-span-2">
                  <label
                    htmlFor="model-config-base-url"
                    className="mb-1 block text-[12px] text-sy-text-2"
                  >
                    Base URL
                  </label>
                  <input
                    id="model-config-base-url"
                    type="text"
                    value={draft.baseUrl}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, baseUrl: event.target.value }))
                    }
                    className="w-full rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 font-mono text-[12.5px] text-sy-text outline-none transition-colors focus:border-sy-accent/50"
                    placeholder={
                      activeProvider?.default_base_url || 'https://your-api.example.com/v1'
                    }
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="model-config-temperature"
                  className="mb-1 block text-[12px] text-sy-text-2"
                >
                  Temperature
                </label>
                <input
                  id="model-config-temperature"
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={draft.temperature}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      temperature: Number(event.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 font-mono text-[12.5px] text-sy-text outline-none transition-colors focus:border-sy-accent/50"
                />
              </div>

              <div>
                <label
                  htmlFor="model-config-max-tokens"
                  className="mb-1 block text-[12px] text-sy-text-2"
                >
                  Max Tokens
                </label>
                <input
                  id="model-config-max-tokens"
                  type="number"
                  min={256}
                  step={256}
                  value={draft.maxTokens}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, maxTokens: event.target.value }))
                  }
                  className="w-full rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 font-mono text-[12.5px] text-sy-text outline-none transition-colors focus:border-sy-accent/50"
                  placeholder="例如：4096"
                />
              </div>
            </div>
          </div>

              {/* Sheet Footer */}
              <div className="border-t border-sy-border px-6 py-4">
                <div className="flex flex-wrap items-center gap-4 pb-3">
                  <label className="inline-flex items-center gap-2 text-[12px] text-sy-text-2">
                    <input
                      type="checkbox"
                      checked={draft.isEnabled}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, isEnabled: event.target.checked }))
                      }
                      className="h-4 w-4 rounded border-sy-border bg-sy-bg-2 accent-sy-accent"
                    />
                    启用此配置
                  </label>
                  <label className="inline-flex items-center gap-2 text-[12px] text-sy-text-2">
                    <input
                      type="checkbox"
                      checked={draft.isDefault}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, isDefault: event.target.checked }))
                      }
                      className="h-4 w-4 rounded border-sy-border bg-sy-bg-2 accent-sy-accent"
                    />
                    设为默认模型
                  </label>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] text-sy-text-3">
                    生效：<span className="text-sy-text-2">{effectiveConfig?.llm_model ?? '未设置'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {editorMode === 'edit' && selectedModelId && (
                      <button
                        type="button"
                        onClick={() => void handleDelete()}
                        disabled={saving || deleting}
                        className="inline-flex items-center gap-1.5 rounded-md border border-sy-danger/30 bg-sy-danger/10 px-3 py-1.5 text-[12px] font-medium text-sy-danger transition-colors hover:bg-sy-danger/15 disabled:opacity-60"
                      >
                        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        删除
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={isSaveDisabled}
                      className="inline-flex items-center gap-1.5 rounded-md bg-sy-accent px-3 py-1.5 text-[12px] font-semibold text-black transition-colors hover:bg-sy-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                      {saved ? '已保存' : saving ? '保存中...' : '保存配置'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sy-accent" />
            <span className="text-[13px] font-semibold text-sy-text">当前生效概览</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-sy-border bg-sy-bg-2 px-3 py-3">
              <p className="text-[11px] uppercase tracking-wide text-sy-text-3">Default Model</p>
              <p className="mt-1 text-[13px] font-semibold text-sy-text">
                {effectiveConfig?.llm_model ?? '未设置'}
              </p>
            </div>
            <div className="rounded-lg border border-sy-border bg-sy-bg-2 px-3 py-3">
              <p className="text-[11px] uppercase tracking-wide text-sy-text-3">Temperature</p>
              <p className="mt-1 font-mono text-[13px] text-sy-text">
                {effectiveConfig?.llm_temperature ?? '—'}
              </p>
            </div>
            <div className="rounded-lg border border-sy-border bg-sy-bg-2 px-3 py-3">
              <p className="text-[11px] uppercase tracking-wide text-sy-text-3">已配置模型数</p>
              <p className="mt-1 font-mono text-[13px] text-sy-text">{modelConfigs.length}</p>
            </div>
          </div>
        </div>
      </div>

      <VectorModelSettings
        vectorConfig={(effectiveConfig?.vector_config ?? null) as Record<string, unknown> | null}
        onSave={saveGlobalConfig}
        saving={saving}
      />
    </>
  );
}
