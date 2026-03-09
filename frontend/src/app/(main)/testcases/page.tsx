"use client";

interface TestCaseRow {
  id: string;
  caseId: string;
  title: string;
  sourcePoint: string;
  type: string;
  typePill: string;
  priority: string;
  priorityPill: string;
  steps: number;
  status: string;
  statusPill: string;
}

const demoRows: TestCaseRow[] = [
  { id: "1", caseId: "TC-0601", title: "离线任务提交-正常参数校验", sourcePoint: "TP-042", type: "功能", typePill: "pill-blue", priority: "P0", priorityPill: "pill-red", steps: 8, status: "已评审", statusPill: "pill-green" },
  { id: "2", caseId: "TC-0602", title: "DAG 依赖解析-循环依赖检测", sourcePoint: "TP-043", type: "异常", typePill: "pill-amber", priority: "P0", priorityPill: "pill-red", steps: 6, status: "已评审", statusPill: "pill-green" },
  { id: "3", caseId: "TC-0603", title: "任务重试策略-指数退避验证", sourcePoint: "TP-044", type: "功能", typePill: "pill-blue", priority: "P1", priorityPill: "pill-amber", steps: 10, status: "待确认", statusPill: "pill-amber" },
  { id: "4", caseId: "TC-0604", title: "资源隔离-内存超限自动 Kill", sourcePoint: "TP-045", type: "边界", typePill: "pill-purple", priority: "P0", priorityPill: "pill-red", steps: 5, status: "AI 生成", statusPill: "pill-blue" },
  { id: "5", caseId: "TC-0605", title: "自动保存草稿-网络断开恢复", sourcePoint: "TP-046", type: "功能", typePill: "pill-blue", priority: "P1", priorityPill: "pill-amber", steps: 7, status: "需重写", statusPill: "pill-red" },
  { id: "6", caseId: "TC-0606", title: "批量导入 CSV-编码兼容性", sourcePoint: "TP-047", type: "兼容", typePill: "pill-gray", priority: "P2", priorityPill: "pill-gray", steps: 4, status: "已评审", statusPill: "pill-green" },
  { id: "7", caseId: "TC-0607", title: "并发任务调度-死锁预防机制", sourcePoint: "TP-048", type: "并发", typePill: "pill-purple", priority: "P0", priorityPill: "pill-red", steps: 12, status: "AI 生成", statusPill: "pill-blue" },
  { id: "8", caseId: "TC-0608", title: "权限校验-跨租户数据隔离", sourcePoint: "TP-049", type: "安全", typePill: "pill-red", priority: "P0", priorityPill: "pill-red", steps: 9, status: "待确认", statusPill: "pill-amber" },
];

export default function TestCasesPage() {
  return (
    <>
      {/* ── Sidebar ── */}
      <aside className="sidebar-panel">
        <div className="sb-section">
          <div className="sb-label">子产品</div>
          <div className="sb-item active">
            <span className="sb-dot" style={{ background: "var(--accent)" }} />
            离线开发
          </div>
          <div className="sb-item">
            <span className="sb-dot" style={{ background: "var(--blue)" }} />
            实时开发
          </div>
          <div className="sb-item">
            <span className="sb-dot" style={{ background: "var(--amber)" }} />
            数据资产
          </div>
        </div>

        <div className="sb-section">
          <div className="sb-label">迭代</div>
          <div className="sb-item active">
            <span className="icon">🏃</span>Sprint 2025-Q2-3
          </div>
          <div className="sb-item">
            <span className="icon">📦</span>Sprint 2025-Q2-2
          </div>
          <div className="sb-item">
            <span className="icon">📦</span>Sprint 2025-Q2-1
          </div>
        </div>

        <hr className="divider" />

        <div className="sb-section">
          <div className="sb-label">快速筛选</div>
          <div className="sb-item active">
            <span className="icon">📋</span>全部用例<span className="sb-count">312</span>
          </div>
          <div className="sb-item">
            <span className="icon">❓</span>待确认<span className="sb-count">24</span>
          </div>
          <div className="sb-item">
            <span className="icon">🤖</span>AI生成<span className="sb-count">198</span>
          </div>
          <div className="sb-item">
            <span className="icon">✏️</span>手动创建<span className="sb-count">114</span>
          </div>
          <div className="sb-item">
            <span className="icon">⚠️</span>需要重写
            <span className="sb-count" style={{ color: "var(--red)" }}>8</span>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="main-with-sidebar">
        <span className="page-watermark">P6 · TESTCASES</span>

        {/* Alert Banner */}
        <div className="alert-banner">
          ⚠ 检测到 3 条需求已更新（Diff），8 条用例可能需要重写
          <span className="spacer" />
          <a href="/diff" style={{ color: "var(--amber)", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
            查看 Diff →
          </a>
        </div>

        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="sub">离线开发 · Sprint 2025-Q2-3 · 用例管理</div>
            <h1>用例管理</h1>
            <div className="sub">312 条用例</div>
          </div>
          <span className="spacer" />
          <input className="input" placeholder="🔍  搜索用例ID / 标题..." style={{ width: 220 }} />
          <button type="button" className="btn">🔽 筛选</button>
          <button type="button" className="btn">批量操作</button>
          <button type="button" className="btn btn-primary">＋ 新建用例</button>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" /></th>
                <th>用例ID</th>
                <th>标题</th>
                <th>来源测试点</th>
                <th>类型</th>
                <th>优先级</th>
                <th>步骤数</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {demoRows.map((row) => (
                <tr key={row.id}>
                  <td><input type="checkbox" /></td>
                  <td><span className="mono" style={{ color: "var(--accent)", fontSize: 11 }}>{row.caseId}</span></td>
                  <td style={{ color: "var(--text)" }}>{row.title}</td>
                  <td><span className="mono" style={{ fontSize: 11, color: "var(--text3)" }}>{row.sourcePoint}</span></td>
                  <td><span className={`pill ${row.typePill}`}>{row.type}</span></td>
                  <td><span className={`pill ${row.priorityPill}`}>{row.priority}</span></td>
                  <td><span className="mono" style={{ fontSize: 11 }}>{row.steps}</span></td>
                  <td><span className={`pill ${row.statusPill}`}>{row.status}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" className="btn btn-ghost btn-sm">✏️ 编辑</button>
                      <button type="button" className="btn btn-ghost btn-sm">👁 查看</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <button type="button">«</button>
          <button type="button">‹</button>
          <button type="button" className="active">1</button>
          <button type="button">2</button>
          <button type="button">3</button>
          <button type="button">...</button>
          <button type="button">16</button>
          <button type="button">›</button>
          <button type="button">»</button>
        </div>
      </div>
    </>
  );
}
