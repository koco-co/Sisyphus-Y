"use client";

/* ── Demo data ── */

const projects = [
  {
    id: "p1",
    name: "离线开发平台",
    icon: "📦",
    iteration: "Sprint 24-W03",
    status: "active" as const,
    cases: 324,
    coverage: 91,
    pending: 5,
    members: ["陈", "王", "李"],
    alert: null,
  },
  {
    id: "p2",
    name: "实时计算引擎",
    icon: "⚡",
    iteration: "Sprint 24-W02",
    status: "active" as const,
    cases: 218,
    coverage: 87,
    pending: 8,
    members: ["张", "刘"],
    alert: "3 条诊断待处理",
  },
  {
    id: "p3",
    name: "数据资产中心",
    icon: "🗂️",
    iteration: "Sprint 24-W03",
    status: "active" as const,
    cases: 156,
    coverage: 78,
    pending: 12,
    members: ["赵", "周", "吴", "孙"],
    alert: null,
  },
  {
    id: "p4",
    name: "数据治理平台",
    icon: "🛡️",
    iteration: "Sprint 24-W01",
    status: "paused" as const,
    cases: 149,
    coverage: 95,
    pending: 2,
    members: ["郑", "冯"],
    alert: null,
  },
];

const activities = [
  { time: "10:32", action: "生成 14 条用例", user: "陈默", project: "离线开发平台" },
  { time: "09:58", action: "完成需求健康诊断", user: "王磊", project: "实时计算引擎" },
  { time: "09:15", action: "更新场景地图", user: "李娜", project: "数据资产中心" },
  { time: "昨天 17:40", action: "导出测试报告", user: "张伟", project: "离线开发平台" },
  { time: "昨天 15:22", action: "新建迭代 Sprint 24-W04", user: "赵敏", project: "数据资产中心" },
];

const filters = ["全部", "离线开发", "实时开发", "数据资产", "数据治理", "BI 分析"];

/* ── Page ── */

export default function ProjectListPage() {
  return (
    <div className="no-sidebar">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* ── Top bar ── */}
        <div className="topbar">
          <div>
            <div className="page-watermark">SISYPHUS · 项目列表</div>
            <h1>全部项目</h1>
            <div className="sub">6 个子产品 · 12 个活跃迭代</div>
          </div>
          <div className="spacer" />
          <input className="input" placeholder="🔍  搜索项目..." style={{ width: 220 }} />
          <button className="btn">筛选</button>
          <button className="btn btn-primary">＋ 新建项目</button>
        </div>

        {/* ── Stat row ── */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card" style={{ borderLeft: "3px solid var(--accent)" }}>
            <div className="stat-val">847</div>
            <div className="stat-label">本周生成用例</div>
            <div className="stat-delta">↑ 23% 较上周</div>
          </div>
          <div className="card">
            <div className="stat-val">12</div>
            <div className="stat-label">进行中迭代</div>
            <div className="stat-delta" style={{ color: "var(--amber)" }}>
              3 个 Sprint 本周截止
            </div>
          </div>
          <div className="card">
            <div className="stat-val">94%</div>
            <div className="stat-label">平均用例覆盖率</div>
            <div className="progress-bar" style={{ marginTop: 10 }}>
              <div className="progress-fill" style={{ width: "94%" }} />
            </div>
          </div>
          <div className="card">
            <div className="stat-val" style={{ color: "var(--red)" }}>18</div>
            <div className="stat-label">待处理健康诊断</div>
            <div className="stat-delta" style={{ color: "var(--red)" }}>
              需要补充场景
            </div>
          </div>
        </div>

        {/* ── Product filter buttons ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {filters.map((f, i) => (
            <button key={f} className={i === 0 ? "btn btn-primary btn-sm" : "btn btn-sm"}>
              {f}
            </button>
          ))}
        </div>

        {/* ── Project cards grid ── */}
        <div className="grid-3" style={{ marginBottom: 32 }}>
          {projects.map((p) => (
            <div key={p.id} className="card card-hover" style={{ cursor: "pointer" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    background: "linear-gradient(135deg, var(--bg3), var(--bg2))",
                  }}
                >
                  {p.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--text3)" }}>
                    {p.iteration}
                  </div>
                </div>
                <span className={`pill ${p.status === "active" ? "pill-green" : "pill-amber"}`}>
                  {p.status === "active" ? "进行中" : "已暂停"}
                </span>
              </div>

              {/* Stats mini grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{p.cases}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text3)" }}>用例数</div>
                </div>
                <div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{p.coverage}%</div>
                  <div style={{ fontSize: 10.5, color: "var(--text3)" }}>覆盖率</div>
                </div>
                <div>
                  <div
                    className="mono"
                    style={{ fontSize: 16, fontWeight: 600, color: p.pending > 5 ? "var(--amber)" : undefined }}
                  >
                    {p.pending}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text3)" }}>待处理</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="progress-bar">
                <div
                  className={`progress-fill${p.coverage < 80 ? " amber" : ""}`}
                  style={{ width: `${p.coverage}%` }}
                />
              </div>

              {/* Footer */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
                {p.members.map((m) => (
                  <span
                    key={m}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--bg3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      color: "var(--text3)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {m}
                  </span>
                ))}
                <div className="spacer" />
                {p.alert && (
                  <span className="pill pill-red" style={{ fontSize: 10 }}>{p.alert}</span>
                )}
              </div>
            </div>
          ))}

          {/* New project card */}
          <div
            className="card"
            style={{
              border: "1px dashed var(--border2)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              color: "var(--text3)",
              minHeight: 180,
              transition: "border-color 0.15s, color 0.15s",
            }}
          >
            <span style={{ fontSize: 28 }}>＋</span>
            <span style={{ fontSize: 12.5 }}>新建项目</span>
          </div>
        </div>

        {/* ── Recent activity ── */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>最近活动</h2>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>操作</th>
                  <th>用户</th>
                  <th>项目</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a, i) => (
                  <tr key={i}>
                    <td className="mono">{a.time}</td>
                    <td>{a.action}</td>
                    <td>{a.user}</td>
                    <td>{a.project}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
