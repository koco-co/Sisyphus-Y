import { expect, mock, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

type MockRisk = {
  id: string;
  category: string;
  severity: string;
  description: string;
  status: string;
};

type MockTreeNode = {
  id: string;
  name: string;
};

const mockTreeState: {
  products: MockTreeNode[];
  iterationsLoading: Record<string, boolean>;
  requirementsLoading: Record<string, boolean>;
  iterations: Record<string, MockTreeNode[]>;
  requirements: Record<string, MockTreeNode[]>;
  expandedProducts: Set<string>;
  expandedIterations: Set<string>;
  selectedReqId: string;
  selectedReqTitle: string;
  toggleProduct: () => void;
  toggleIteration: () => void;
  selectRequirement: () => void;
} = {
  products: [],
  iterationsLoading: {},
  requirementsLoading: {},
  iterations: {},
  requirements: {},
  expandedProducts: new Set<string>(),
  expandedIterations: new Set<string>(),
  selectedReqId: 'req-001',
  selectedReqTitle: '订单中心需求',
  toggleProduct: () => {},
  toggleIteration: () => {},
  selectRequirement: () => {},
};

const mockDiagnosisState: {
  report: {
    id: string;
    requirement_id: string;
    status: string;
    risks: MockRisk[];
    created_at: string;
    updated_at: string;
  };
  messages: unknown[];
  loading: boolean;
  sse: {
    isStreaming: boolean;
  };
  sendMessage: () => void;
  startDiagnosis: () => void;
} = {
  report: {
    id: 'report-001',
    requirement_id: 'req-001',
    status: 'completed',
    risks: [],
    created_at: '',
    updated_at: '',
  },
  messages: [],
  loading: false,
  sse: {
    isStreaming: false,
  },
  sendMessage: () => {},
  startDiagnosis: () => {},
};

const mockAiConfigState = {
  effectiveConfig: {
    llm_model: 'glm-5-flash',
  },
  modelConfigs: [
    {
      id: 'model-001',
      is_enabled: true,
      model_id: 'glm-5-flash',
    },
  ],
  loading: false,
};

mock.module('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

mock.module('@/hooks/useRequirementTree', () => ({
  useRequirementTree: () => mockTreeState,
}));

mock.module('@/hooks/useDiagnosis', () => ({
  useDiagnosis: () => mockDiagnosisState,
}));

mock.module('@/hooks/useAiConfig', () => ({
  useAiConfig: () => mockAiConfigState,
}));

mock.module('@/lib/api', () => ({
  api: {
    get: async () => ({}),
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

mock.module('./_components/AnalysisTab', () => ({
  AnalysisTab: () => <div>AnalysisTab</div>,
}));

mock.module('./_components/CoverageMatrix', () => ({
  CoverageMatrix: () => <div>CoverageMatrix</div>,
}));

mock.module('./_components/RequirementDetailTab', () => ({
  RequirementDetailTab: () => <div>RequirementDetailTab</div>,
}));

test('diagnosis page carries selected requirement into workbench link', async () => {
  mockDiagnosisState.report.risks = [];

  const module = await import('./page');
  const DiagnosisPage = module.default;

  const html = renderToStaticMarkup(<DiagnosisPage />);

  expect(html).toContain('href="/workbench?reqId=req-001"');
});

test('diagnosis page blocks entering workbench when high risk items remain open', async () => {
  mockDiagnosisState.report.risks = [
    {
      id: 'risk-001',
      category: 'scope',
      severity: 'high',
      description: '存在高风险遗漏项',
      status: 'open',
    },
  ];

  const module = await import('./page');
  const DiagnosisPage = module.default;

  const html = renderToStaticMarkup(<DiagnosisPage />);

  expect(html).toContain('aria-disabled="true"');
  expect(html).toContain('请先处理高风险遗漏项');
});

test('diagnosis page shows AI config banner when no model is configured', async () => {
  mockDiagnosisState.report.risks = [];
  mockAiConfigState.effectiveConfig = {
    llm_model: '',
  };
  mockAiConfigState.modelConfigs = [];

  const module = await import('./page');
  const DiagnosisPage = module.default;

  const html = renderToStaticMarkup(<DiagnosisPage />);

  expect(html).toContain('尚未配置可用 AI 模型');
  expect(html).toContain('href="/settings"');
});

test('diagnosis page shows requirement loading state for expanded iteration', async () => {
  mockTreeState.products = [{ id: 'product-001', name: '订单中心' }];
  mockTreeState.expandedProducts = new Set(['product-001']);
  mockTreeState.iterations = {
    'product-001': [{ id: 'iteration-001', name: 'Sprint 1' }],
  };
  mockTreeState.expandedIterations = new Set(['iteration-001']);
  mockTreeState.requirements = {};
  mockTreeState.requirementsLoading = {
    'iteration-001': true,
  };

  const module = await import('./page');
  const DiagnosisPage = module.default;

  const html = renderToStaticMarkup(<DiagnosisPage />);

  expect(html).toContain('需求加载中...');
});

test('diagnosis page shows empty state when expanded iteration has no requirements', async () => {
  mockTreeState.products = [{ id: 'product-001', name: '订单中心' }];
  mockTreeState.expandedProducts = new Set(['product-001']);
  mockTreeState.iterations = {
    'product-001': [{ id: 'iteration-001', name: 'Sprint 1' }],
  };
  mockTreeState.expandedIterations = new Set(['iteration-001']);
  mockTreeState.requirements = {
    'iteration-001': [],
  };
  mockTreeState.requirementsLoading = {
    'iteration-001': false,
  };

  const module = await import('./page');
  const DiagnosisPage = module.default;

  const html = renderToStaticMarkup(<DiagnosisPage />);

  expect(html).toContain('当前迭代暂无需求');
});
