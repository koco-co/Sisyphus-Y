"use client";

const requirements = [
  { id: "REQ-001", title: "用户数据源接入管理", status: "draft", priority: "P1", testPoints: 5, cases: 12 },
  { id: "REQ-002", title: "数据同步调度引擎", status: "reviewed", priority: "P0", testPoints: 8, cases: 24 },
  { id: "REQ-003", title: "实时数据流处理", status: "draft", priority: "P1", testPoints: 3, cases: 0 },
  { id: "REQ-004", title: "数据质量检测规则", status: "diagnosed", priority: "P2", testPoints: 6, cases: 18 },
  { id: "REQ-005", title: "元数据自动采集", status: "draft", priority: "P1", testPoints: 4, cases: 8 },
];

const iterations = [
  { name: "Sprint 2025-Q2-3", active: true, count: 5 },
  { name: "Sprint 2025-Q2-2", active: false, count: 8 },
  { name: "Sprint 2025-Q2-1", active: false, count: 12 },
];

const statusMap: Record<string, { label: string; cls: string }> = {
  draft: { label: "草稿", cls: "pill-gray" },
  reviewed: { label: "已评审", cls: "pill-green" },
  diagnosed: { label: "已诊断", cls: "pill-blue" },
};

export default function RequirementsPage() {
  return (
    <>
      <div className="sidebar-panel">
        <div className="sb-section">
          <div className="sb-label">子产品</div>
          <div className="sb-item active">
            <span className="icon">⚡</span>离线开发平台<span className="sb-count">25</span>
          </div>
          <div className="sb-item">
            <span className="icon">🔴</span>实时开发平台<span className="sb-count">18</span>
          </div>
          <div className="sb-item">
            <span className="icon">🗂</span>数据资产管理<span className="sb-count">12</span>
          </div>
        </div>
        <hr className="divider" style={{ margin: "4px 0" }} />
        <div className="sb-section">
          <div className="sb-label">迭代</div>
          {iterations.map((it) => (
            <div key={it.name} className={`sb-item${it.active ? " active" : ""}`}>
              <span className="icon">📅</span>{it.name}<span className="sb-count">{it.count}</span>
            </div>
          ))}
        </div>
        <hr className="divider" style={{ margin: "4px 0" }} />
        <div className="sb-section">
          <div className="sb-label">需求列表</div>
          {requirements.map((r) => (
            <div key={r.id} className="sb-item">
              <span
                className="sb-dot"
                style={{
                  background:
                    r.status === "reviewed"
                      ? "var(--accent)"
                      : r.status === "diagnosed"
                        ? "var(--blue)"
                        : "var(--text3)",
                }}
              />
              <span style={{ flex: 1, fontSize: 12 }}>{r.title}</span>
              <span className="sb-count">{r.id}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="main-with-sidebar">
        <div className="topbar">
          <div>
            <div className="page-watermark">离线开发平台 · Sprint 2025-Q2-3</div>
            <h1>需求卡片</h1>
            <div className="sub">{requirements.length} 条需求 · 选择左侧需求查看详情</div>
          </div>
          <div className="spacer" />
          <input className="input" placeholder="🔍  搜索需求..." style={{ width: 220 }} />
          <button className="btn btn-primary">＋ 新建需求</button>
        </div>

        <div className="grid-3">
          {requirements.map((r) => {
            const pct = r.cases > 0 ? Math.min((r.cases / (r.testPoints * 4)) * 100, 100) : 0;
            return (
              <div key={r.id} className="card card-hover" style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>{r.id}</span>
                  <span className={`pill ${statusMap[r.status].cls}`}>{statusMap[r.status].label}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>{r.title}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--text3)" }}>
                  <span>🎯 {r.testPoints} 个测试点</span>
                  <span>📋 {r.cases} 条用例</span>
                  <span
                    className={`pill ${r.priority === "P0" ? "pill-red" : r.priority === "P1" ? "pill-amber" : "pill-gray"}`}
                    style={{ fontSize: 10 }}
                  >
                    {r.priority}
                  </span>
                </div>
                <div className="progress-bar" style={{ marginTop: 10, height: 3 }}>
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 32 }}>
          <div className="sec-header">
            <span className="sec-title">需求详情预览</span>
            <span style={{ fontSize: 11.5, color: "var(--text3)" }}>选择左侧需求查看完整内容</span>
          </div>
          <div
            className="card"
            style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)" }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
              <div>点击左侧需求查看详情</div>
              <div style={{ fontSize: 11.5, marginTop: 4 }}>
                支持富文本编辑、前置条件标注、验收标准管理
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
