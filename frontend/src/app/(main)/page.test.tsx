import { expect, mock, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

const mockDashboardState = {
  stats: {
    product_count: 6,
    iteration_count: 12,
    requirement_count: 42,
    testcase_count: 1247,
    coverage_rate: 78.3,
    weekly_cases: 203,
    pending_diagnosis: 4,
    requirement_delta: 8,
    testcase_delta: 203,
    coverage_delta: -2.1,
    selected_iteration_id: 'iter-003',
    selected_iteration_name: 'Sprint 3',
    selected_iteration_status: 'active',
    selected_iteration_product_name: '订单中心',
    previous_iteration_id: 'iter-002',
    previous_iteration_name: 'Sprint 2',
    available_iterations: [
      {
        id: 'iter-003',
        product_id: 'product-001',
        product_name: '订单中心',
        name: 'Sprint 3',
        status: 'active',
        start_date: '2026-03-01',
        end_date: '2026-03-14',
      },
      {
        id: 'iter-002',
        product_id: 'product-001',
        product_name: '订单中心',
        name: 'Sprint 2',
        status: 'completed',
        start_date: '2026-02-15',
        end_date: '2026-02-28',
      },
    ],
  },
  pendingItems: [],
  activities: [],
  loading: false,
  selectedIterationId: 'iter-003',
  setIterationId: () => {},
  refresh: () => {},
};

mock.module('@/hooks/useDashboard', () => ({
  useDashboard: () => mockDashboardState,
}));

mock.module('@/lib/api', () => ({
  api: {
    get: async () => ({
      total_cases: 0,
      by_priority: {},
      by_type: {},
      by_status: {},
      by_source: {},
      avg_ai_score: 0,
      coverage_rate: 0,
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

mock.module('./_components/ActivityTimeline', () => ({
  default: () => <div>ActivityTimeline</div>,
}));

mock.module('./_components/PendingItems', () => ({
  default: () => <div>PendingItems</div>,
}));

mock.module('./_components/QuickActions', () => ({
  default: () => <div>QuickActions</div>,
}));

test('dashboard page renders iteration selector and delta cards', async () => {
  const module = await import('./page');
  const DashboardPage = module.default;

  const html = renderToStaticMarkup(<DashboardPage />);

  expect(html).toContain('aria-label="选择迭代"');
  expect(html).toContain('订单中心 · Sprint 3');
  expect(html).toContain('较上一迭代 +8');
  expect(html).toContain('较上一迭代 +203');
  expect(html).toContain('较上一迭代 -2.1%');
  expect(html).toContain('Sprint 2');
});
