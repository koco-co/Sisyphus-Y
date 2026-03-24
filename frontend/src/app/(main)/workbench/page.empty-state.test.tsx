import { expect, mock, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

const mockWorkbenchState = {
  sessions: [],
  activeSessionId: null,
  selectedReqId: null as string | null,
  selectedReqTitle: '',
  selectedMode: 'test_point_driven',
  messages: [],
  testCases: [],
  contextItems: [],
  priorityFilter: null,
  typeFilter: null,
  sse: {
    content: '',
    thinking: '',
    cases: [],
    isStreaming: false,
  },
  stopStream: () => {},
  selectRequirement: () => {},
  selectSession: () => {},
  createSession: () => {},
  sendMessage: () => {},
  addContextItem: () => {},
  removeContextItem: () => {},
  setMode: () => {},
  setPriorityFilter: () => {},
  setTypeFilter: () => {},
  exportCases: () => {},
};

const mockSceneMapState = {
  selectedReqId: null as string | null,
  selectedReqTitle: '',
  testPoints: [],
  selectedPointId: null as string | null,
  checkedPointIds: new Set<string>(),
  searchQuery: '',
  isLocked: false,
  stats: {
    total: 0,
    document: 0,
    supplemented: 0,
    missing: 0,
    pending: 0,
    confirmed: 0,
    unhandledMissing: 0,
  },
  sse: {
    isStreaming: false,
  },
  selectRequirement: async () => {},
  generateTestPoints: async () => {},
  selectPoint: () => {},
  toggleCheckPoint: () => {},
  bulkCheckPoints: () => {},
  setSearchQuery: () => {},
  addPoint: async () => {},
  confirmPoint: async () => {},
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

mock.module('@/hooks/useWorkbench', () => ({
  useWorkbench: () => mockWorkbenchState,
}));

mock.module('@/hooks/useSceneMap', () => ({
  useSceneMap: () => mockSceneMapState,
}));

mock.module('@/hooks/useAiConfig', () => ({
  useAiConfig: () => mockAiConfigState,
}));

mock.module('@/stores/workspace-store', () => ({
  useWorkspaceStore: () => ({
    selectedReqId: null,
    activeSessionId: null,
  }),
}));

mock.module('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

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

mock.module('@/components/layout/ThreeColLayout', () => ({
  ThreeColLayout: ({
    left,
    center,
    right,
  }: {
    left: React.ReactNode;
    center: React.ReactNode;
    right: React.ReactNode;
  }) => (
    <div>
      <div>{left}</div>
      <div>{center}</div>
      <div>{right}</div>
    </div>
  ),
}));

mock.module('./_components/RequirementNav', () => ({
  RequirementNav: () => <div>RequirementNav</div>,
}));

mock.module('./_components/GeneratedCases', () => ({
  GeneratedCases: () => <div>GeneratedCases</div>,
}));

mock.module('./_components/GeneratedCasesByPoint', () => ({
  GeneratedCasesByPoint: () => <div>GeneratedCasesByPoint</div>,
}));

mock.module('./_components/GenerationPanel', () => ({
  GenerationPanel: () => <div>GenerationPanel</div>,
}));

mock.module('./_components/TestPointGroupList', () => ({
  default: () => <div>TestPointGroupList</div>,
}));

mock.module('./_components/WorkbenchStepBar', () => ({
  default: () => <div>WorkbenchStepBar</div>,
}));

mock.module('./_components/ContextPanel', () => ({
  ContextPanel: () => <div>ContextPanel</div>,
}));

mock.module('@/components/ui/AiConfigBanner', () => ({
  AiConfigBanner: () => <div>AiConfigBanner</div>,
}));

test('workbench empty state guides users to requirement entry and sample data', async () => {
  const module = await import('./page');
  const WorkbenchPage = module.default;

  const html = renderToStaticMarkup(<WorkbenchPage />);

  expect(html).toContain('前往需求录入');
  expect(html).toContain('查看示例用例');
  expect(html).toContain('href="/analysis"');
  expect(html).toContain('href="/testcases"');
});
