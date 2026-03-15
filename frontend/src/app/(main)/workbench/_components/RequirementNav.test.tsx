import { expect, mock, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

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
  toggleProduct: () => void;
  toggleIteration: () => void;
} = {
  products: [{ id: 'product-001', name: '订单中心' }],
  iterationsLoading: {},
  requirementsLoading: {},
  iterations: {
    'product-001': [{ id: 'iteration-001', name: 'Sprint 1' }],
  },
  requirements: {
    'iteration-001': [],
  },
  expandedProducts: new Set(['product-001']),
  expandedIterations: new Set(['iteration-001']),
  toggleProduct: () => {},
  toggleIteration: () => {},
};

mock.module('@/hooks/useRequirementTree', () => ({
  useRequirementTree: () => mockTreeState,
}));

test('RequirementNav shows loading state while iteration requirements are loading', async () => {
  mockTreeState.requirementsLoading = {
    'iteration-001': true,
  };
  mockTreeState.requirements = {};

  const module = await import('./RequirementNav');
  const RequirementNav = module.RequirementNav;

  const html = renderToStaticMarkup(
    <RequirementNav
      sessions={[]}
      activeSessionId={null}
      selectedReqId={null}
      onSelectRequirement={() => {}}
      onSelectSession={() => {}}
      onCreateSession={() => {}}
    />,
  );

  expect(html).toContain('需求加载中...');
});

test('RequirementNav shows empty state when an expanded iteration has no requirements', async () => {
  mockTreeState.requirementsLoading = {
    'iteration-001': false,
  };
  mockTreeState.requirements = {
    'iteration-001': [],
  };

  const module = await import('./RequirementNav');
  const RequirementNav = module.RequirementNav;

  const html = renderToStaticMarkup(
    <RequirementNav
      sessions={[]}
      activeSessionId={null}
      selectedReqId={null}
      onSelectRequirement={() => {}}
      onSelectSession={() => {}}
      onCreateSession={() => {}}
    />,
  );

  expect(html).toContain('当前迭代暂无需求');
});
