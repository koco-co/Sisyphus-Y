export interface TestCaseStep {
  no: number;
  action: string;
  expected_result: string;
}

export interface TestCaseDetail {
  id: string;
  requirement_id: string;
  scene_node_id: string | null;
  case_id: string;
  title: string;
  priority: string;
  status: string;
  case_type: string;
  source: string;
  ai_score: number | null;
  precondition: string | null;
  module_path: string | null;
  version: number;
  steps: TestCaseStep[];
  tags?: string[];
  requirement_title?: string;
  test_point_title?: string;
  created_at: string;
  updated_at: string;
}

export type SortField = 'title' | 'priority' | 'status' | 'case_type' | 'source' | 'updated_at';

export type SortDirection = 'asc' | 'desc';

export interface CaseFilters {
  priority: string;
  status: string;
  caseType: string;
  source: string;
}

export const priorityVariant: Record<string, 'danger' | 'warning' | 'info' | 'gray'> = {
  P0: 'danger',
  P1: 'warning',
  P2: 'info',
  P3: 'gray',
};

export const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'gray'> = {
  approved: 'success',
  review: 'warning',
  rejected: 'danger',
  active: 'success',
  pending_review: 'warning',
  deprecated: 'danger',
  draft: 'gray',
};

export const statusLabel: Record<string, string> = {
  approved: '通过',
  review: '待审',
  rejected: '驳回',
  active: '通过',
  pending_review: '待审',
  deprecated: '废弃',
  draft: '草稿',
};

export const typeLabel: Record<string, string> = {
  normal: '功能',
  functional: '功能',
  boundary: '边界',
  exception: '异常',
  performance: '性能',
  security: '安全',
  compatibility: '兼容',
};

export const sourceLabel: Record<string, string> = {
  ai_generated: 'AI 生成',
  ai: 'AI 生成',
  manual: '手动',
  imported: '导入',
};

export function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}
