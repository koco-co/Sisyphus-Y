import { expect, mock, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

const mockWorkbenchState: {
  sessions: unknown[];
  activeSessionId: string | null;
  selectedReqId: string | null;
  selectedReqTitle: string;
  selectedMode: string;
  messages: unknown[];
  testCases: unknown[];
  contextItems: unknown[];
  priorityFilter: string | null;
  typeFilter: string | null;
  sse: {
    content: string;
    thinking: string;
    cases: unknown[];
    isStreaming: boolean;
  };
  stopStream: () => void;
  selectRequirement: () => void;
  selectSession: () => void;
  createSession: () => void;
  sendMessage: () => void;
  addContextItem: () => void;
  removeContextItem: () => void;
  setMode: () => void;
  setPriorityFilter: () => void;
  setTypeFilter: () => void;
  exportCases: () => void;
} = {
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

const mockSceneMapState: {
  selectedReqId: string | null;
  selectedReqTitle: string;
  testPoints: unknown[];
  selectedPointId: string | null;
  checkedPointIds: Set<string>;
  searchQuery: string;
  isLocked: boolean;
  stats: {
    total: number;
    document: number;
    supplemented: number;
    missing: number;
    pending: number;
    confirmed: number;
    unhandledMissing: number;
  };
  sse: {
    isStreaming: boolean;
  };
  selectRequirement: () => Promise<void>;
  generateTestPoints: () => Promise<void>;
  selectPoint: () => void;
  toggleCheckPoint: () => void;
  setSearchQuery: () => void;
  addPoint: () => Promise<void>;
  confirmPoint: () => Promise<void>;
} = {
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

const mockWorkspaceStore = {
  lastGeneratedPointIds: new Set<string>(),
  setLastGeneratedPointIds: () => {},
  appendTestCases: () => {},
  setTestCases: () => {},
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

mock.module('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

mock.module('@/stores/workspace-store', () => ({
  useWorkspaceStore: () => mockWorkspaceStore,
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

mock.module('./_components/ChatArea', () => ({
  ChatArea: () => <div>ChatArea</div>,
}));

mock.module('./_components/ChatInput', () => ({
  ChatInput: () => <div>ChatInput</div>,
}));

mock.module('./_components/ContextPanel', () => ({
  ContextPanel: () => <div>ContextPanel</div>,
}));

mock.module('./_components/GeneratedCases', () => ({
  GeneratedCases: () => <div>GeneratedCases</div>,
}));

mock.module('./_components/TestPointGroupList', () => ({
  default: () => <div>TestPointGroupList</div>,
}));

mock.module('./_components/ModeSelector', () => ({
  ModeSelector: () => <div>ModeSelector</div>,
}));

mock.module('./_components/QuickCommands', () => ({
  QuickCommands: () => <div>QuickCommands</div>,
}));

test('workbench page renders step 1 and step 2 progress labels', async () => {
  mockWorkbenchState.selectedReqId = null;
  mockWorkbenchState.activeSessionId = null;
  mockSceneMapState.selectedReqId = null;
  mockSceneMapState.checkedPointIds = new Set();
  mockWorkspaceStore.lastGeneratedPointIds = new Set();

  const module = await import('./page');
  const WorkbenchPage = module.default;

  const html = renderToStaticMarkup(<WorkbenchPage />);

  expect(html).toContain('Step 1');
  expect(html).toContain('Step 2');
});

test('workbench page shows step 1 guidance after selecting a requirement', async () => {
  mockWorkbenchState.selectedReqId = 'req-001';
  mockWorkbenchState.activeSessionId = null;
  mockSceneMapState.selectedReqId = 'req-001';
  mockSceneMapState.checkedPointIds = new Set();
  mockWorkspaceStore.lastGeneratedPointIds = new Set();

  const module = await import('./page');
  const WorkbenchPage = module.default;

  const html = renderToStaticMarkup(<WorkbenchPage />);

  expect(html).toContain('Step 1：确认测试点');
  expect(html).toContain('勾选至少 1 个测试点后，才能进入 Step 2 生成用例。');
  expect(html).not.toContain('请从左侧选择需求');
});

test('workbench page renders test point draft tools in step 1', async () => {
  mockWorkbenchState.selectedReqId = 'req-001';
  mockWorkbenchState.activeSessionId = null;
  mockSceneMapState.selectedReqId = 'req-001';
  mockSceneMapState.checkedPointIds = new Set();
  mockWorkspaceStore.lastGeneratedPointIds = new Set();

  const module = await import('./page');
  const WorkbenchPage = module.default;

  const html = renderToStaticMarkup(<WorkbenchPage />);

  expect(html).toContain('AI 生成测试点');
  expect(html).toContain('TestPointGroupList');
});

test('workbench page shows append-generation guidance after existing generation history', async () => {
  mockWorkbenchState.selectedReqId = 'req-001';
  mockWorkbenchState.activeSessionId = null;
  mockSceneMapState.selectedReqId = 'req-001';
  mockSceneMapState.checkedPointIds = new Set(['tp-001']);
  mockWorkspaceStore.lastGeneratedPointIds = new Set(['tp-001']);

  const module = await import('./page');
  const WorkbenchPage = module.default;

  const html = renderToStaticMarkup(<WorkbenchPage />);

  expect(html).toContain('可继续勾选新测试点，点「追加生成」只生成新增部分。');
});

test('workbench page shows AI config banner when no model is configured', async () => {
  mockWorkbenchState.selectedReqId = 'req-001';
  mockWorkbenchState.activeSessionId = null;
  mockSceneMapState.selectedReqId = 'req-001';
  mockSceneMapState.checkedPointIds = new Set();
  mockWorkspaceStore.lastGeneratedPointIds = new Set();
  mockAiConfigState.effectiveConfig = {
    llm_model: '',
  };
  mockAiConfigState.modelConfigs = [];

  const module = await import('./page');
  const WorkbenchPage = module.default;

  const html = renderToStaticMarkup(<WorkbenchPage />);

  expect(html).toContain('AiConfigBanner');
});
