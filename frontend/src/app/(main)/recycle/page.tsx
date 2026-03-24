'use client';

import {
  AlertTriangle,
  BookOpen,
  ClipboardList,
  FileText,
  Filter,
  LayoutTemplate,
  Loader2,
  type LucideIcon,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { ApiError, type RecycleItem, recycleApi } from '@/lib/api';

type RecycleType = 'product' | 'iteration' | 'requirement' | 'testcase' | 'template' | 'knowledge';
type FilterType = 'all' | RecycleType;

const typeConfig: Partial<Record<RecycleType, { label: string; icon: LucideIcon; pill: string }>> =
  {
    requirement: { label: '需求', icon: FileText, pill: 'pill-blue' },
    testcase: { label: '用例', icon: ClipboardList, pill: 'pill-green' },
    template: { label: '模板', icon: LayoutTemplate, pill: 'pill-purple' },
    knowledge: { label: '知识库', icon: BookOpen, pill: 'pill-amber' },
  };

const filterOptions: Array<{ value: FilterType; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'requirement', label: '需求' },
  { value: 'testcase', label: '用例' },
  { value: 'template', label: '模板' },
  { value: 'knowledge', label: '知识库' },
];

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message || `请求失败（${error.status}）`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '操作失败，请稍后重试。';
}

function formatDeletedAt(value: string): string {
  if (!value) {
    return '--';
  }
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getExpiresIn(value: string): { text: string; urgent: boolean } {
  if (!value) {
    return { text: '--', urgent: false };
  }
  const diffDays = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  const remainingDays = Math.max(30 - diffDays, 0);
  return { text: `${remainingDays} 天`, urgent: remainingDays <= 3 };
}

function getTypeConfig(type: string) {
  return (
    typeConfig[type as RecycleType] || {
      label: type,
      icon: Trash2,
      pill: 'pill-gray',
    }
  );
}

export default function RecyclePage() {
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingDeleteIds = useRef<string[]>([]);

  const loadItems = useCallback(async (activeFilter: FilterType) => {
    setLoading(true);
    setError(null);
    try {
      const data = await recycleApi.list({
        entityType: activeFilter === 'all' ? undefined : activeFilter,
        pageSize: 100,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initPage = async () => {
      setSelectedIds(new Set());
      // 先调用 cleanup 清理过期数据（失败不阻塞列表加载）
      try {
        await recycleApi.cleanup();
      } catch {
        // cleanup 失败静默处理，不影响用户体验
      }
      // 然后加载列表
      await loadItems(filter);
    };
    void initPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, loadItems]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!keyword) {
        return true;
      }
      return item.name.toLowerCase().includes(keyword);
    });
  }, [items, search]);

  const visibleCount = search.trim() ? filtered.length : total;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filtered.map((item) => item.id)));
  };

  const handleRestore = async (ids: string[]) => {
    if (ids.length === 0 || acting) {
      return;
    }
    const targets = filtered.filter((item) => ids.includes(item.id));
    setActing(true);
    setError(null);
    try {
      if (targets.length === 1) {
        await recycleApi.restore(targets[0].entity_type, targets[0].id);
        toast.success(`「${targets[0].name}」已恢复`);
      } else {
        const result = await recycleApi.batchRestore(
          targets.map((item) => ({
            entity_type: item.entity_type,
            id: item.id,
          })),
        );
        toast.success(`已恢复 ${result.restored} 项`);
      }
      setSelectedIds(new Set());
      await loadItems(filter);
    } catch (err) {
      const errMsg = getErrorMessage(err);
      // 检查是否是目录不存在错误
      if (errMsg.includes('folder not found') || errMsg.includes('目录不存在')) {
        toast.error('原目录已删除，无法恢复');
      } else {
        setError(errMsg);
      }
    } finally {
      setActing(false);
    }
  };

  const handlePermanentDelete = (ids: string[]) => {
    if (ids.length === 0 || acting) {
      return;
    }
    pendingDeleteIds.current = ids;
    setConfirmOpen(true);
  };

  const executePermanentDelete = async () => {
    const ids = pendingDeleteIds.current;
    setConfirmOpen(false);
    pendingDeleteIds.current = [];
    const targets = filtered.filter((item) => ids.includes(item.id));
    setActing(true);
    setError(null);
    try {
      await Promise.all(
        targets.map((item) => recycleApi.permanentDelete(item.entity_type, item.id)),
      );
      setSelectedIds(new Set());
      await loadItems(filter);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Trash2 className="w-5 h-5 text-text3" />
        <h1 className="font-display text-lg font-bold text-text">回收站</h1>
        <span className="pill pill-gray text-[10px]">{visibleCount} 项</span>
        {filtered.length > 0 && (
          <button
            type="button"
            className="btn btn-sm btn-danger ml-auto"
            onClick={() => void handlePermanentDelete(filtered.map((i) => i.id))}
            disabled={acting}
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空回收站
          </button>
        )}
      </div>

      <div className="alert-banner mb-6">
        <AlertTriangle />
        <span className="text-[12.5px]">
          回收站中的项目将在 30 天后自动永久删除，请及时恢复需要保留的数据
        </span>
      </div>

      {error && (
        <div className="alert-banner mb-6">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text3" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索已删除项..."
            className="input w-full pl-8"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-text3" />
          {filterOptions.map((item) => (
            <button
              type="button"
              key={item.value}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                filter === item.value
                  ? 'bg-sy-accent/10 text-sy-accent border border-sy-accent/25'
                  : 'text-text3 hover:text-text2 hover:bg-bg2 border border-transparent'
              }`}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {selectedIds.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-text3">{selectedIds.size} 项已选</span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => void handleRestore(Array.from(selectedIds))}
              disabled={acting}
            >
              {acting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              恢复
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => void handlePermanentDelete(Array.from(selectedIds))}
              disabled={acting}
            >
              {acting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              永久删除
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card overflow-hidden">
          <TableSkeleton rows={6} cols={6} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Trash2 className="w-12 h-12 text-text3 mx-auto mb-3 opacity-20" />
          <p className="text-[13px] text-text3">
            {search.trim() ? '暂无匹配的已删除项目' : '回收站是空的'}
          </p>
          <p className="text-[12px] text-text3/60 mt-1">已删除的内容会在这里保留 30 天</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-border accent-accent"
                  />
                </th>
                <th>名称</th>
                <th className="w-24">类型</th>
                <th className="w-36">删除时间</th>
                <th className="w-20">剩余保留</th>
                <th className="w-28">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const config = getTypeConfig(item.entity_type);
                const Icon = config.icon;
                return (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-3.5 h-3.5 rounded border-border accent-accent"
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-text3 shrink-0" />
                        <span className="text-text truncate">{item.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${config.pill} text-[10px]`}>{config.label}</span>
                    </td>
                    <td className="font-mono text-[11px]">{formatDeletedAt(item.deleted_at)}</td>
                    <td>
                      {(() => {
                        const expires = getExpiresIn(item.deleted_at);
                        return (
                          <span
                            className={`font-mono text-[11px] ${expires.urgent ? 'text-sy-danger font-semibold' : 'text-text3'}`}
                          >
                            {expires.text}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => void handleRestore([item.id])}
                          title="恢复"
                          disabled={acting}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost text-sy-danger"
                          onClick={() => void handlePermanentDelete([item.id])}
                          title="永久删除"
                          disabled={acting}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onConfirm={() => void executePermanentDelete()}
        onCancel={() => {
          setConfirmOpen(false);
          pendingDeleteIds.current = [];
        }}
        title="永久删除"
        description={`确认永久删除选中的 ${pendingDeleteIds.current.length} 项吗？此操作不可恢复。`}
        confirmText="永久删除"
        variant="danger"
      />
    </div>
  );
}
