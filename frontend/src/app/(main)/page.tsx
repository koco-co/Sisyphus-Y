"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Skeleton, Modal, Input, Form, message } from "antd";
import { Package, Zap, FolderOpen, Shield, Search, TrendingUp, Plus, Layers, FileText, TestTube } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── Inline API client ── */

const apiClient = {
  async get<T>(url: string): Promise<T> {
    const res = await fetch(`http://localhost:8000/api${url}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },
  async post<T>(url: string, data?: unknown): Promise<T> {
    const res = await fetch(`http://localhost:8000/api${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },
};

/* ── Types ── */

interface DashboardStats {
  product_count: number;
  iteration_count: number;
  requirement_count: number;
  testcase_count: number;
  coverage_rate: number;
  weekly_cases: number;
  pending_diagnosis: number;
}

interface ProductOverview {
  id: string;
  name: string;
  slug: string;
  description: string;
  iteration_count: number;
  requirement_count: number;
  testcase_count: number;
  status: string;
}

interface Activity {
  time: string;
  action: string;
  resource: string;
  resource_id: string;
  title: string;
}

/* ── Fallback demo data ── */

const ICON_MAP: Record<number, LucideIcon> = {
  0: Package,
  1: Zap,
  2: FolderOpen,
  3: Shield,
};

const fallbackProducts: ProductOverview[] = [
  { id: "p1", name: "离线开发平台", slug: "offline-dev", description: "离线数据开发", iteration_count: 3, requirement_count: 24, testcase_count: 324, status: "active" },
  { id: "p2", name: "实时计算引擎", slug: "realtime-engine", description: "实时流处理", iteration_count: 2, requirement_count: 18, testcase_count: 218, status: "active" },
  { id: "p3", name: "数据资产中心", slug: "data-asset", description: "数据资产管理", iteration_count: 4, requirement_count: 15, testcase_count: 156, status: "active" },
  { id: "p4", name: "数据治理平台", slug: "data-govern", description: "数据质量治理", iteration_count: 1, requirement_count: 12, testcase_count: 149, status: "paused" },
];

const fallbackActivities = [
  { time: "10:32", action: "生成 14 条用例", resource: "testcase", resource_id: "", title: "离线开发平台" },
  { time: "09:58", action: "完成需求健康诊断", resource: "requirement", resource_id: "", title: "实时计算引擎" },
  { time: "09:15", action: "更新场景地图", resource: "scene_map", resource_id: "", title: "数据资产中心" },
  { time: "昨天 17:40", action: "导出测试报告", resource: "testcase", resource_id: "", title: "离线开发平台" },
  { time: "昨天 15:22", action: "新建迭代 Sprint 24-W04", resource: "iteration", resource_id: "", title: "数据资产中心" },
];

const fallbackStats: DashboardStats = {
  product_count: 6, iteration_count: 12, requirement_count: 69, testcase_count: 847,
  coverage_rate: 94, weekly_cases: 847, pending_diagnosis: 18,
};

/* ── Helpers ── */

function formatTime(raw: string): string {
  if (!raw || raw.length < 5) return raw;
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    if (isToday) return time;
    if (isYesterday) return `昨天 ${time}`;
    return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
  } catch {
    return raw;
  }
}

/* ── Page ── */

export default function ProjectListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [filter, setFilter] = useState("全部");

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: () => apiClient.get("/dashboard/stats"),
  });

  const { data: rawProducts, isLoading: productsLoading } = useQuery<ProductOverview[]>({
    queryKey: ["dashboard", "products-overview"],
    queryFn: () => apiClient.get("/dashboard/products-overview"),
  });

  const { data: rawActivities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["dashboard", "activities"],
    queryFn: () => apiClient.get("/dashboard/activities?limit=10"),
  });

  const createMutation = useMutation({
    mutationFn: (values: { name: string; slug: string; description?: string }) =>
      apiClient.post("/products", values),
    onSuccess: () => {
      message.success("项目创建成功");
      setCreateOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => message.error("创建失败，请重试"),
  });

  const s = stats ?? fallbackStats;
  const products = rawProducts && rawProducts.length > 0 ? rawProducts : fallbackProducts;
  const activities = rawActivities && rawActivities.length > 0 ? rawActivities : fallbackActivities;

  const filters = ["全部", ...Array.from(new Set(products.map((p) => p.name)))];

  const filteredProducts = filter === "全部" ? products : products.filter((p) => p.name === filter);

  const isLoading = statsLoading || productsLoading;

  return (
    <div className="no-sidebar">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* ── Top bar ── */}
        <div className="topbar">
          <div>
            <div className="page-watermark">SISYPHUS · 项目列表</div>
            <h1>全部项目</h1>
            <div className="sub">{s.product_count} 个子产品 · {s.iteration_count} 个活跃迭代</div>
          </div>
          <div className="spacer" />
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)" }} />
            <input className="input" placeholder="搜索项目..." style={{ width: 220, paddingLeft: 32 }} />
          </div>
          <button className="btn">筛选</button>
          <button
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={14} /> 新建项目
          </button>
        </div>

        {/* ── Stat row ── */}
        {isLoading ? (
          <div className="grid-4" style={{ marginBottom: 24 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card"><Skeleton active paragraph={{ rows: 2 }} title={false} /></div>
            ))}
          </div>
        ) : (
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <div className="card" style={{ borderLeft: "3px solid var(--accent)" }}>
              <div className="stat-val">{s.weekly_cases}</div>
              <div className="stat-label">本周生成用例</div>
              <div className="stat-delta" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <TrendingUp size={12} /> {s.testcase_count} 总用例
              </div>
            </div>
            <div className="card">
              <div className="stat-val">{s.iteration_count}</div>
              <div className="stat-label">进行中迭代</div>
              <div className="stat-delta" style={{ color: "var(--amber)" }}>
                {s.requirement_count} 个需求
              </div>
            </div>
            <div className="card">
              <div className="stat-val">{s.coverage_rate}%</div>
              <div className="stat-label">平均用例覆盖率</div>
              <div className="progress-bar" style={{ marginTop: 10 }}>
                <div className="progress-fill" style={{ width: `${s.coverage_rate}%` }} />
              </div>
            </div>
            <div className="card">
              <div className="stat-val" style={{ color: s.pending_diagnosis > 0 ? "var(--red)" : undefined }}>{s.pending_diagnosis}</div>
              <div className="stat-label">待处理健康诊断</div>
              <div className="stat-delta" style={{ color: s.pending_diagnosis > 0 ? "var(--red)" : undefined }}>
                {s.pending_diagnosis > 0 ? "需要补充场景" : "全部已处理"}
              </div>
            </div>
          </div>
        )}

        {/* ── Product filter buttons ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {filters.map((f) => (
            <button
              key={f}
              className={f === filter ? "btn btn-primary btn-sm" : "btn btn-sm"}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* ── Project cards grid ── */}
        {productsLoading ? (
          <div className="grid-3" style={{ marginBottom: 32 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card"><Skeleton active paragraph={{ rows: 4 }} title={false} /></div>
            ))}
          </div>
        ) : (
          <div className="grid-3" style={{ marginBottom: 32 }}>
            {filteredProducts.map((p, idx) => {
              const Icon = ICON_MAP[idx % 4] ?? Package;
              const coverage = s.coverage_rate;
              return (
                <div
                  key={p.id}
                  className="card card-hover"
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/requirements?productId=${p.id}`)}
                >
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span
                      style={{
                        width: 36, height: 36, borderRadius: 8,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, background: "linear-gradient(135deg, var(--bg3), var(--bg2))",
                      }}
                    >
                      <Icon size={18} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--text3)" }}>{p.slug}</div>
                    </div>
                    <span className={`pill ${p.status === "active" ? "pill-green" : "pill-amber"}`}>
                      {p.status === "active" ? "进行中" : "已暂停"}
                    </span>
                  </div>

                  {/* Stats mini grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                    <div>
                      <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{p.testcase_count}</div>
                      <div style={{ fontSize: 10.5, color: "var(--text3)" }}>用例数</div>
                    </div>
                    <div>
                      <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{p.iteration_count}</div>
                      <div style={{ fontSize: 10.5, color: "var(--text3)" }}>迭代数</div>
                    </div>
                    <div>
                      <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{p.requirement_count}</div>
                      <div style={{ fontSize: 10.5, color: "var(--text3)" }}>需求数</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="progress-bar">
                    <div
                      className={`progress-fill${coverage < 80 ? " amber" : ""}`}
                      style={{ width: `${Math.min(coverage, 100)}%` }}
                    />
                  </div>

                  {/* Footer */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
                    <Layers size={12} style={{ color: "var(--text3)" }} />
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>{p.iteration_count} 迭代</span>
                    <FileText size={12} style={{ color: "var(--text3)", marginLeft: 8 }} />
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>{p.requirement_count} 需求</span>
                    <div className="spacer" />
                    <TestTube size={12} style={{ color: "var(--text3)" }} />
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>{p.testcase_count}</span>
                  </div>
                </div>
              );
            })}

            {/* New project card */}
            <div
              className="card"
              style={{
                border: "1px dashed var(--border2)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, cursor: "pointer", color: "var(--text3)", minHeight: 180,
                transition: "border-color 0.15s, color 0.15s",
              }}
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={28} />
              <span style={{ fontSize: 12.5 }}>新建项目</span>
            </div>
          </div>
        )}

        {/* ── Recent activity ── */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>最近活动</h2>
          {activitiesLoading ? (
            <div className="card"><Skeleton active paragraph={{ rows: 5 }} title={false} /></div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>操作</th>
                    <th>资源</th>
                    <th>标题</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a, i) => (
                    <tr key={i}>
                      <td className="mono">{formatTime(a.time)}</td>
                      <td>{a.action}</td>
                      <td>
                        <span className={`pill ${a.resource === "testcase" ? "pill-green" : a.resource === "requirement" ? "pill-blue" : "pill-gray"}`}>
                          {a.resource}
                        </span>
                      </td>
                      <td>{a.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Create project modal ── */}
      <Modal
        title="新建项目"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => createMutation.mutate(values)}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: "请输入项目名称" }]}>
            <Input placeholder="例如：离线开发平台" />
          </Form.Item>
          <Form.Item name="slug" label="项目标识" rules={[{ required: true, message: "请输入项目标识" }]}>
            <Input placeholder="例如：offline-dev" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="项目简介（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
