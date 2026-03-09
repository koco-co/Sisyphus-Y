'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, LayoutGrid, Table2 } from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatCard } from '@/components/ui/StatCard';
import { CaseCard } from '@/components/workspace/CaseCard';
import { api } from '@/lib/api';
import { ChangeAlert } from './_components/ChangeAlert';
import { FilterToolbar } from './_components/FilterToolbar';
import { CaseTable } from './_components/CaseTable';
import { CaseDetailDrawer } from './_components/CaseDetailDrawer';
import { CaseEditForm } from './_components/CaseEditForm';
import { BatchActions } from './_components/BatchActions';
import type {
  TestCaseDetail,
  TestCaseStep,
  CaseFilters,
  SortField,
  SortDirection,
} from './_components/types';

const PAGE_SIZE = 20;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function TestCasesPage() {
  const router = useRouter();

  // ── Data ──
  const [cases, setCases] = useState<TestCaseDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [affectedCount, setAffectedCount] = useState(0);
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
      if (search) params.search = search;
      if (filters.priority) params.priority = filters.priority;
      if (filters.status) params.status = filters.status;
      if (filters.caseType) params.case_type = filters.caseType;
      if (filters.source) params.source = filters.source;
      if (sortField) {
        params.sort_by = sortField;
        params.sort_dir = sortDirection;
      }

      const qs = new URLSearchParams(params).toString();
      const data = await api.get<{ items: TestCaseDetail[]; total: number }>(
        `/testcases/?${qs}`,
      );
      setCases(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error('Failed to fetch test cases:', e);
      setCases([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, filters, sortField, sortDirection]);

  const fetchAffectedCount = useCallback(async () => {
    try {
      const data = await api.get<{ count: number }>(
        '/testcases/affected-count',
      );
      setAffectedCount(data.count);
    } catch {
      setAffectedCount(0);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    fetchAffectedCount();
  }, [fetchAffectedCount]);

  // ── Stats (page-level) ──
  const activeCount = cases.filter((c) => c.status === 'active').length;
  const pendingCount = cases.filter(
    (c) => c.status === 'pending_review',
  ).length;
  const draftCount = cases.filter((c) => c.status === 'draft').length;

  // ── Handlers ──
  const handleFilterChange = <K extends keyof CaseFilters>(
    key: K,
    value: CaseFilters[K],
  ) => {
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
      await api.patch(`/testcases/${editingCase.id}`, data);
      setEditFormOpen(false);
      setEditingCase(null);
      fetchCases();
    } catch (e) {
      console.error('Failed to save test case:', e);
    }
  };

  const handleDelete = async (ids: string[]) => {
    try {
      if (ids.length === 1) {
        await api.delete(`/testcases/${ids[0]}`);
      } else {
        await api.post('/testcases/batch/delete', { ids });
      }
      setSelectedIds(new Set());
      setDeleteTarget(null);
      setDrawerOpen(false);
      fetchCases();
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const handleBatchStatusChange = async (status: string) => {
    try {
      await api.post('/testcases/batch/status', {
        ids: Array.from(selectedIds),
        status,
      });
      setSelectedIds(new Set());
      fetchCases();
    } catch (e) {
      console.error('Failed to batch update:', e);
    }
  };

  const handleBatchExport = async () => {
    try {
      const res = await fetch(`${API_BASE}/testcases/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'testcases-export.xlsx';
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
        <h1 className="font-display text-[20px] font-bold text-text">
          用例管理中心
        </h1>
        <span className="text-[12px] text-text3">Test Case Management</span>
        <div className="flex-1" />
        <span className="font-mono text-[10px] text-text3 tracking-wider">
          M06 · TESTCASES
        </span>
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
        <StatCard value={pendingCount} label="待审核" />
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
              viewMode === 'table'
                ? 'bg-bg3 text-text'
                : 'text-text3 hover:text-text2'
            }`}
            title="表格视图"
          >
            <Table2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'card'
                ? 'bg-bg3 text-text'
                : 'text-text3 hover:text-text2'
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
            <p className="col-span-2 py-16 text-center text-[12.5px] text-text3">
              加载中...
            </p>
          ) : (
            cases.map((tc) => (
              <div
                key={tc.id}
                className="cursor-pointer"
                onClick={() => handleRowClick(tc)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRowClick(tc);
                }}
                role="button"
                tabIndex={0}
              >
                <CaseCard
                  caseId={tc.case_id}
                  title={tc.title}
                  priority={tc.priority as 'P0' | 'P1' | 'P2' | 'P3'}
                  type={tc.case_type}
                  status={tc.status}
                  steps={tc.steps ?? []}
                  aiScore={tc.ai_score ?? undefined}
                />
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Pagination ── */}
      <Pagination
        current={page}
        total={total}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

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
          deleteTarget?.single
            ? '删除用例'
            : `批量删除 ${deleteTarget?.ids.length ?? 0} 个用例`
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
