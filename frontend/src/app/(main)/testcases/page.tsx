'use client';

import { ClipboardList, LayoutGrid, Table2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatCard } from '@/components/ui/StatCard';
import { CaseCard } from '@/components/workspace/CaseCard';
import { api } from '@/lib/api';
import { BatchActions } from './_components/BatchActions';
import { CaseDetailDrawer } from './_components/CaseDetailDrawer';
import { CaseEditForm } from './_components/CaseEditForm';
import { CaseTable } from './_components/CaseTable';
import { ChangeAlert } from './_components/ChangeAlert';
import { FilterToolbar } from './_components/FilterToolbar';
import type {
  CaseFilters,
  SortDirection,
  SortField,
  TestCaseDetail,
  TestCaseStep,
} from './_components/types';
import { sourceLabel, statusLabel, typeLabel } from './_components/types';

const PAGE_SIZE = 20;

interface ApiTestCaseStep {
  step?: number;
  no?: number;
  action: string;
  expected?: string;
  expected_result?: string;
}

interface ApiTestCaseDetail
  extends Omit<TestCaseDetail, 'steps' | 'status' | 'case_type' | 'source'> {
  steps: ApiTestCaseStep[];
  status: string;
  case_type: string;
  source: string;
}

const priorityRank: Record<string, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

function normalizeStatus(status: string): string {
  if (status === 'active') return 'approved';
  if (status === 'pending_review') return 'review';
  return status;
}

function normalizeCaseType(caseType: string): string {
  return caseType === 'normal' ? 'functional' : caseType;
}

function normalizeSource(source: string): string {
  return source === 'ai' ? 'ai_generated' : source;
}

function normalizeSteps(steps: ApiTestCaseStep[]): TestCaseStep[] {
  return steps.map((step, index) => ({
    no: step.no ?? step.step ?? index + 1,
    action: step.action,
    expected_result: step.expected_result ?? step.expected ?? '',
  }));
}

function normalizeCase(testCase: ApiTestCaseDetail): TestCaseDetail {
  return {
    ...testCase,
    status: normalizeStatus(testCase.status),
    case_type: normalizeCaseType(testCase.case_type),
    source: normalizeSource(testCase.source),
    steps: normalizeSteps(testCase.steps ?? []),
  };
}

function toApiSteps(steps: TestCaseStep[]) {
  return steps.map((step, index) => ({
    step: step.no || index + 1,
    action: step.action,
    expected: step.expected_result,
  }));
}

function sortCases(cases: TestCaseDetail[], field: SortField | null, direction: SortDirection) {
  if (!field) return cases;

  return [...cases].sort((left, right) => {
    let result = 0;

    if (field === 'priority') {
      result = (priorityRank[left.priority] ?? 999) - (priorityRank[right.priority] ?? 999);
    } else if (field === 'updated_at') {
      result = new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime();
    } else {
      result = String(left[field] ?? '').localeCompare(String(right[field] ?? ''), 'zh-CN');
    }

    return direction === 'asc' ? result : -result;
  });
}

function escapeCsv(value: string | number | null | undefined): string {
  const stringValue = String(value ?? '');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

export default function TestCasesPage() {
  const router = useRouter();

  // ── Data ──
  const [cases, setCases] = useState<TestCaseDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const affectedCount = 0;
  const [showAlert, setShowAlert] = useState(true);

  // ── Pagination ──
  const [page, setPage] = useState(1);

  // ── Search & Filters ──
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CaseFilters>({
    priority: '',
    status: '',
    caseType: '',
    source: '',
  });

  // ── Sorting ──
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // ── Selection ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── View mode ──
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // ── Drawer / Edit ──
  const [selectedCase, setSelectedCase] = useState<TestCaseDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCaseDetail | null>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);

  // ── Delete confirmation ──
  const [deleteTarget, setDeleteTarget] = useState<{
    ids: string[];
    single: boolean;
  } | null>(null);

  // ── Fetch cases ──
  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        page_size: String(PAGE_SIZE),
      };
      if (search) params.keyword = search;
      if (filters.priority) params.priority = filters.priority;
      if (filters.status) params.status = filters.status;
      if (filters.caseType) params.case_type = filters.caseType;
      if (filters.source) params.source = filters.source;

      const qs = new URLSearchParams(params).toString();
      const data = await api.get<{ items: ApiTestCaseDetail[]; total: number }>(`/testcases?${qs}`);
      const items = sortCases((data.items ?? []).map(normalizeCase), sortField, sortDirection);
      setCases(items);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error('Failed to fetch test cases:', e);
      setCases([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, filters, sortField, sortDirection]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // ── Stats (page-level) ──
  const activeCount = cases.filter((c) => c.status === 'approved').length;
  const pendingCount = cases.filter((c) => c.status === 'review').length;
  const draftCount = cases.filter((c) => c.status === 'draft').length;

  // ── Handlers ──
  const handleFilterChange = <K extends keyof CaseFilters>(key: K, value: CaseFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ priority: '', status: '', caseType: '', source: '' });
    setPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (cases.every((c) => selectedIds.has(c.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cases.map((c) => c.id)));
    }
  };

  const handleRowClick = (tc: TestCaseDetail) => {
    setSelectedCase(tc);
    setDrawerOpen(true);
  };

  const handleEdit = (tc: TestCaseDetail) => {
    setEditingCase(tc);
    setEditFormOpen(true);
    setDrawerOpen(false);
  };

  const handleSave = async (data: {
    title: string;
    priority: string;
    status: string;
    case_type: string;
    precondition: string | null;
    steps: TestCaseStep[];
  }) => {
    if (!editingCase) return;
    try {
      await api.put(`/testcases/${editingCase.id}`, {
        ...data,
        steps: toApiSteps(data.steps),
      });
      setEditFormOpen(false);
      setEditingCase(null);
      await fetchCases();
    } catch (e) {
      console.error('Failed to save test case:', e);
    }
  };

  const handleDelete = async (ids: string[]) => {
    try {
      if (ids.length === 1) {
        await api.delete(`/testcases/${ids[0]}`);
      } else {
        await Promise.all(ids.map((id) => api.delete(`/testcases/${id}`)));
      }
      setSelectedIds(new Set());
      setDeleteTarget(null);
      setDrawerOpen(false);
      await fetchCases();
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const handleBatchStatusChange = async (status: string) => {
    try {
      await api.post('/testcases/batch-status', {
        case_ids: Array.from(selectedIds),
        status,
      });
      setSelectedIds(new Set());
      await fetchCases();
    } catch (e) {
      console.error('Failed to batch update:', e);
    }
  };

  const handleBatchExport = async () => {
    try {
      const selectedCases = cases.filter((testCase) => selectedIds.has(testCase.id));
      if (selectedCases.length === 0) return;

      const header = [
        'case_id',
        'title',
        'priority',
        'status',
        'case_type',
        'source',
        'precondition',
        'steps',
      ];
      const rows = selectedCases.map((testCase) =>
        [
          testCase.case_id,
          testCase.title,
          testCase.priority,
          statusLabel[testCase.status] ?? testCase.status,
          typeLabel[testCase.case_type] ?? testCase.case_type,
          sourceLabel[testCase.source] ?? testCase.source,
          testCase.precondition ?? '',
          testCase.steps
            .map((step) => `${step.no}. ${step.action} => ${step.expected_result}`)
            .join(' | '),
        ]
          .map(escapeCsv)
          .join(','),
      );
      const blob = new Blob([`\uFEFF${[header.join(','), ...rows].join('\n')}`], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'testcases-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export:', e);
    }
  };

  return (
    <div className="no-sidebar">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-5 h-5 text-accent" />
        <h1 className="font-display text-[20px] font-bold text-text">用例管理中心</h1>
        <span className="text-[12px] text-text3">Test Case Management</span>
        <div className="flex-1" />
        <span className="font-mono text-[10px] text-text3 tracking-wider">M06 · TESTCASES</span>
      </div>

      {/* ── Change Alert ── */}
      {showAlert && (
        <ChangeAlert
          count={affectedCount}
          onNavigate={() => router.push('/diff')}
          onDismiss={() => setShowAlert(false)}
        />
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard value={total} label="总用例数" highlighted />
        <StatCard value={activeCount} label="已通过" />
        <StatCard value={pendingCount} label="评审中" />
        <StatCard value={draftCount} label="草稿" />
      </div>

      {/* ── Search + Filters + View Toggle ── */}
      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="搜索用例编号或标题..."
          className="w-[260px]"
        />
        <FilterToolbar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearFilters}
        />
        <div className="flex-1" />
        <div className="flex items-center gap-1 p-0.5 bg-bg2 border border-border rounded-md">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'table' ? 'bg-bg3 text-text' : 'text-text3 hover:text-text2'
            }`}
            title="表格视图"
          >
            <Table2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'card' ? 'bg-bg3 text-text' : 'text-text3 hover:text-text2'
            }`}
            title="卡片视图"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Batch Actions ── */}
      {selectedIds.size > 0 && (
        <BatchActions
          selectedCount={selectedIds.size}
          onStatusChange={handleBatchStatusChange}
          onExport={handleBatchExport}
          onDelete={() =>
            setDeleteTarget({
              ids: Array.from(selectedIds),
              single: false,
            })
          }
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

      {/* ── Content ── */}
      {!loading && cases.length === 0 ? (
        <div className="bg-bg1 border border-border rounded-[10px]">
          <EmptyState
            icon={<ClipboardList className="w-12 h-12" />}
            title="暂无用例数据"
            description="当用例生成完成后，会自动出现在这里"
          />
        </div>
      ) : viewMode === 'table' ? (
        <CaseTable
          cases={cases}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onRowClick={handleRowClick}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          loading={loading}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {loading ? (
            <p className="col-span-2 py-16 text-center text-[12.5px] text-text3">加载中...</p>
          ) : (
            cases.map((tc) => (
              <button
                type="button"
                key={tc.id}
                className="cursor-pointer bg-transparent border-0 p-0 text-left"
                onClick={() => handleRowClick(tc)}
              >
                <CaseCard
                  caseId={tc.case_id}
                  title={tc.title}
                  priority={tc.priority as 'P0' | 'P1' | 'P2' | 'P3'}
                  type={typeLabel[tc.case_type] ?? tc.case_type}
                  status={statusLabel[tc.status] ?? tc.status}
                  steps={tc.steps ?? []}
                  aiScore={tc.ai_score ?? undefined}
                  className="mb-0"
                />
              </button>
            ))
          )}
        </div>
      )}

      {/* ── Pagination ── */}
      <Pagination current={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />

      {/* ── Detail Drawer ── */}
      <CaseDetailDrawer
        testCase={selectedCase}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedCase(null);
        }}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteTarget({ ids: [id], single: true })}
      />

      {/* ── Edit Form ── */}
      <CaseEditForm
        testCase={editingCase}
        open={editFormOpen}
        onSave={handleSave}
        onCancel={() => {
          setEditFormOpen(false);
          setEditingCase(null);
        }}
      />

      {/* ── Delete Confirmation ── */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={
          deleteTarget?.single ? '删除用例' : `批量删除 ${deleteTarget?.ids.length ?? 0} 个用例`
        }
        description={
          deleteTarget?.single
            ? '此操作将软删除该用例，确认继续？'
            : `将软删除选中的 ${deleteTarget?.ids.length ?? 0} 个用例，确认继续？`
        }
        variant="danger"
        confirmText="删除"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.ids)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
