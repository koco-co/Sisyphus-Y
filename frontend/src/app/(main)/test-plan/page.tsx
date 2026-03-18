'use client';

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { Iteration, Product } from '@/lib/api';
import { productsApi } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TestPlan {
  id: string;
  iteration_id: string;
  title: string;
  description: string | null;
  status: string;
  planned_cases: number;
  executed_cases: number;
  passed_cases: number;
  failed_cases: number;
  blocked_cases: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface PlanStats {
  total_plans: number;
  draft: number;
  active: number;
  completed: number;
  total_planned: number;
  total_executed: number;
  total_passed: number;
  total_failed: number;
  pass_rate: number;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'bg-sy-bg-3 text-sy-text-3 border border-sy-border' },
  active: { label: '进行中', cls: 'bg-sy-info/10 text-sy-info border border-sy-info/30' },
  completed: {
    label: '已完成',
    cls: 'bg-sy-accent/10 text-sy-accent border border-sy-accent/30',
  },
  cancelled: {
    label: '已取消',
    cls: 'bg-sy-danger/10 text-sy-danger border border-sy-danger/30',
  },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${m.cls}`}>{m.label}</span>
  );
}

// ── Create Plan Sheet ─────────────────────────────────────────────────────────

function CreatePlanSheet({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [productId, setProductId] = useState('');
  const [form, setForm] = useState({
    iteration_id: '',
    title: '',
    description: '',
    status: 'draft',
    planned_cases: '',
    start_date: '',
    end_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    productsApi.list().then((r) => r.data && setProducts(r.data));
  }, []);

  useEffect(() => {
    setIterations([]);
    setForm((p) => ({ ...p, iteration_id: '' }));
    if (!productId) return;
    productsApi.listIterations(productId).then((r) => r.data && setIterations(r.data));
  }, [productId]);

  const handleSubmit = async () => {
    if (!form.iteration_id || !form.title) {
      setError('迭代和计划名称为必填项');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/test-plans/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iteration_id: form.iteration_id,
          title: form.title,
          description: form.description || undefined,
          status: form.status,
          planned_cases: Number(form.planned_cases) || 0,
          start_date: form.start_date || undefined,
          end_date: form.end_date || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '创建失败');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="relative flex h-full w-full max-w-[480px] flex-col border-l border-sy-border bg-sy-bg-1 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-sy-border px-6 py-4">
          <span className="text-[14px] font-semibold text-sy-text">新建测试计划</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-sy-border text-sy-text-3 hover:text-sy-text"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-sy-danger/30 bg-sy-danger/10 px-3 py-2 text-[12px] text-sy-danger">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] text-sy-text-2">子产品</label>
            <div className="relative">
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full appearance-none rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 pr-8 text-[12px] text-sy-text outline-none focus:border-sy-accent/50"
              >
                <option value="">选择子产品…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sy-text-3" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-sy-text-2">
              迭代 <span className="text-sy-danger">*</span>
            </label>
            <div className="relative">
              <select
                value={form.iteration_id}
                onChange={(e) => setForm((p) => ({ ...p, iteration_id: e.target.value }))}
                disabled={!productId}
                className="w-full appearance-none rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 pr-8 text-[12px] text-sy-text outline-none focus:border-sy-accent/50 disabled:opacity-40"
              >
                <option value="">选择迭代…</option>
                {iterations.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sy-text-3" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-sy-text-2">
              计划名称 <span className="text-sy-danger">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="例如：v2.5 回归测试计划"
              className="w-full rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 text-[12px] text-sy-text outline-none focus:border-sy-accent/50"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-sy-text-2">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="可选说明…"
              className="w-full resize-none rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 text-[12px] text-sy-text outline-none focus:border-sy-accent/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] text-sy-text-2">开始日期</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                className="w-full rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 text-[12px] text-sy-text outline-none focus:border-sy-accent/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-sy-text-2">结束日期</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                className="w-full rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 text-[12px] text-sy-text outline-none focus:border-sy-accent/50"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-sy-text-2">计划用例数</label>
            <input
              type="number"
              min={0}
              value={form.planned_cases}
              onChange={(e) => setForm((p) => ({ ...p, planned_cases: e.target.value }))}
              placeholder="0"
              className="w-full rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 font-mono text-[12px] text-sy-text outline-none focus:border-sy-accent/50"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-sy-text-2">状态</label>
            <div className="relative">
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full appearance-none rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 pr-8 text-[12px] text-sy-text outline-none focus:border-sy-accent/50"
              >
                <option value="draft">草稿</option>
                <option value="active">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sy-text-3" />
            </div>
          </div>
        </div>

        <div className="border-t border-sy-border px-6 py-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-sy-border px-4 py-2 text-[12px] text-sy-text-2 hover:border-sy-border-2"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-sy-accent px-4 py-2 text-[12px] font-semibold text-black hover:bg-sy-accent-2 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            创建
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, onDeleted }: { plan: TestPlan; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const passRate =
    plan.executed_cases > 0
      ? Math.round((plan.passed_cases / plan.executed_cases) * 100)
      : null;

  const handleDelete = async () => {
    if (!confirm(`确定要删除「${plan.title}」吗？`)) return;
    setDeleting(true);
    await fetch(`/api/test-plans/${plan.id}`, { method: 'DELETE' });
    onDeleted();
  };

  return (
    <div className="card mb-3 hover:-translate-y-px hover:border-sy-border-2 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={plan.status} />
            <h3 className="text-[13px] font-semibold text-sy-text truncate">{plan.title}</h3>
          </div>
          {plan.description && (
            <p className="text-[11px] text-sy-text-2 mb-2 line-clamp-2">{plan.description}</p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-sy-text-3">
            {plan.start_date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {plan.start_date}
                {plan.end_date ? ` → ${plan.end_date}` : ''}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={deleting}
          className="flex h-7 w-7 items-center justify-center rounded border border-sy-border text-sy-text-3 hover:border-sy-danger/40 hover:text-sy-danger transition-colors disabled:opacity-40"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex justify-between mb-1 text-[10px] text-sy-text-3">
          <span>
            执行进度：{plan.executed_cases} / {plan.planned_cases}
          </span>
          {passRate !== null && (
            <span className="text-sy-accent">通过率 {passRate}%</span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-sy-bg-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-sy-accent transition-all"
            style={{
              width: `${plan.planned_cases > 0 ? Math.min(100, (plan.executed_cases / plan.planned_cases) * 100) : 0}%`,
            }}
          />
        </div>
        <div className="mt-1.5 flex gap-3 text-[10px]">
          {plan.passed_cases > 0 && (
            <span className="flex items-center gap-1 text-sy-accent">
              <CheckCircle2 className="h-3 w-3" />
              通过 {plan.passed_cases}
            </span>
          )}
          {plan.failed_cases > 0 && (
            <span className="flex items-center gap-1 text-sy-danger">
              <AlertCircle className="h-3 w-3" />
              失败 {plan.failed_cases}
            </span>
          )}
          {plan.blocked_cases > 0 && (
            <span className="text-sy-warn">阻塞 {plan.blocked_cases}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TestPlanPage() {
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [stats, setStats] = useState<PlanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [plansRes, statsRes] = await Promise.all([
      fetch('/api/test-plans/?page=1&page_size=50'),
      fetch('/api/test-plans/stats'),
    ]);
    if (plansRes.ok) {
      const d = (await plansRes.json()) as { items: TestPlan[] };
      setPlans(d.items ?? []);
    }
    if (statsRes.ok) {
      setStats((await statsRes.json()) as PlanStats);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-sy-accent" />
          <h1 className="text-[18px] font-bold text-sy-text">迭代测试计划</h1>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-sy-accent px-3 py-2 text-[12px] font-semibold text-black hover:bg-sy-accent-2"
        >
          <Plus className="h-3.5 w-3.5" />
          新建测试计划
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: '全部', value: stats.total_plans, cls: 'text-sy-text' },
            { label: '进行中', value: stats.active, cls: 'text-sy-info' },
            { label: '已完成', value: stats.completed, cls: 'text-sy-accent' },
            {
              label: '总体通过率',
              value: `${Math.round(stats.pass_rate * 100)}%`,
              cls: 'text-sy-accent',
            },
          ].map(({ label, value, cls }) => (
            <div key={label} className="card">
              <p className="text-[10px] uppercase tracking-wide text-sy-text-3">{label}</p>
              <p className={`mt-1 text-[20px] font-bold font-mono ${cls}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Plan List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-sy-text-3" />
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <ClipboardList className="h-10 w-10 text-sy-text-3/40" />
          <p className="text-[13px] text-sy-text-2">暂无测试计划</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1 text-[12px] text-sy-accent hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            创建第一个测试计划
          </button>
        </div>
      ) : (
        <div>
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onDeleted={() => void loadData()} />
          ))}
        </div>
      )}

      {/* Create Sheet */}
      {createOpen && (
        <CreatePlanSheet onClose={() => setCreateOpen(false)} onCreated={() => void loadData()} />
      )}
    </div>
  );
}
