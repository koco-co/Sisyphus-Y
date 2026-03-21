import { expect, mock, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

mock.module('@/hooks/useAiConfig', () => ({
  useAiConfig: () => ({
    config: null,
    effectiveConfig: {
      llm_model: 'glm-5',
      llm_temperature: 0.4,
      output_preference: { max_tokens: 4096, top_p: 0.95, concurrency: 3 },
      api_keys: null,
      vector_config: null,
    },
    modelConfigs: [
      {
        id: 'model-001',
        name: '分析主模型',
        provider: 'zhipu',
        model_id: 'glm-5',
        base_url: null,
        api_key_masked: 'zk-***',
        temperature: 0.4,
        max_tokens: 4096,
        purpose_tags: ['diagnosis'],
        is_enabled: true,
        is_default: true,
        extra_params: null,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'model-002',
        name: '用例生成模型',
        provider: 'dashscope',
        model_id: 'qwen-max',
        base_url: null,
        api_key_masked: 'sk-***',
        temperature: 0.3,
        max_tokens: 8192,
        purpose_tags: ['generation'],
        is_enabled: true,
        is_default: false,
        extra_params: null,
        created_at: '',
        updated_at: '',
      },
    ],
    loading: false,
    saving: false,
    error: null,
    refresh: async () => {},
    saveGlobalConfig: async () => true,
    createModelConfig: async () => null,
    updateModelConfig: async () => null,
    deleteModelConfig: async () => true,
  }),
}));

mock.module('@/lib/api', () => ({
  api: {
    get: async () => ({
      providers: [],
    }),
  },
  diagnosisApi: {
    getReport: async () => ({ status: 'completed' }),
  },
  requirementsApi: {
    get: async () => ({
      id: 'req-001',
      title: '订单中心需求',
    }),
  },
}));

mock.module('@/components/ui/ConnectionTestButton', () => ({
  ConnectionTestButton: () => <div>ConnectionTestButton</div>,
}));

mock.module('@/components/ui/ParamTooltip', () => ({
  ParamTooltip: () => <span>ParamTooltip</span>,
}));

mock.module('./VectorModelSettings', () => ({
  VectorModelSettings: () => <div>VectorModelSettings</div>,
}));

test('AIModelSettings renders multiple model configs as a list', async () => {
  const module = await import('./AIModelSettings');
  const AIModelSettings = module.AIModelSettings;

  const html = renderToStaticMarkup(<AIModelSettings />);

  expect(html).toContain('模型配置列表');
  expect(html).toContain('分析主模型');
  expect(html).toContain('用例生成模型');
});
