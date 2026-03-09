"use client";

const diffLines: { type: "add" | "del" | "ctx"; text: string }[] = [
  { type: "ctx", text: "  3.2 数据保存" },
  { type: "ctx", text: "  用户在编辑器中修改内容后，系统应提供保存功能。" },
  { type: "del", text: "- 用户点击「保存」按钮后，系统将当前内容持久化到数据库。" },
  { type: "del", text: "- 保存成功后提示「保存成功」，失败时提示「保存失败，请重试」。" },
  { type: "add", text: "+ 系统应支持自动保存功能，每 30 秒自动保存一次草稿。" },
  { type: "add", text: "+ 用户也可点击「保存」按钮手动触发即时保存。" },
  { type: "add", text: "+ 自动保存时应在状态栏显示「已自动保存 HH:mm:ss」。" },
  { type: "ctx", text: "  保存前需校验必填字段完整性。" },
  { type: "ctx", text: "" },
  { type: "ctx", text: "  3.3 版本管理" },
  { type: "del", text: "- 每次保存生成新版本号，支持版本回退。" },
  { type: "add", text: "+ 自动保存生成草稿版本（draft），手动保存生成正式版本。" },
  { type: "add", text: "+ 草稿版本保留最近 10 个，正式版本永久保留。" },
  { type: "add", text: "+ 支持版本对比与一键回退到任意正式版本。" },
  { type: "ctx", text: "  版本记录中应包含修改人、修改时间和变更摘要。" },
];

const impactItems = [
  { level: "high" as const, icon: "🔴", title: "新增自动保存机制", desc: "原需求仅支持手动保存，现新增 30s 定时自动保存，涉及前端定时器、后端草稿接口、并发冲突处理" },
  { level: "high" as const, icon: "🔴", title: "版本模型变更", desc: "版本号语义从递增整数改为 draft/formal 双轨制，影响版本回退和对比逻辑" },
  { level: "med" as const, icon: "🟡", title: "UI 状态栏新增", desc: "需新增自动保存状态指示器，影响编辑器顶部布局" },
  { level: "med" as const, icon: "🟡", title: "草稿清理策略", desc: "草稿版本仅保留最近 10 个，需增加定时清理任务" },
];

const mustRewriteCases = [
  { caseId: "TC-0605", title: "手动保存-正常流程验证", reason: "原用例仅覆盖手动保存，未包含自动保存触发条件与状态栏显示验证" },
  { caseId: "TC-0611", title: "版本回退-回退到上一版本", reason: "版本模型已从单一序列改为 draft/formal 双轨制，回退逻辑需重写" },
  { caseId: "TC-0613", title: "保存失败-网络异常处理", reason: "自动保存场景下的失败处理策略与手动保存不同，需区分静默重试和用户提示" },
];

const keepCases = [
  { caseId: "TC-0606", title: "必填字段校验-空值拦截" },
  { caseId: "TC-0607", title: "保存内容完整性-富文本格式保留" },
  { caseId: "TC-0609", title: "并发编辑-乐观锁冲突提示" },
  { caseId: "TC-0612", title: "版本记录-修改人和时间展示" },
  { caseId: "TC-0614", title: "大文件保存-超时降级处理" },
];

const suggestedPoints = [
  { id: "TP-NEW-01", title: "自动保存定时触发验证", desc: "验证编辑器空闲 30s 后自动触发保存，保存期间用户继续编辑应重置计时器" },
  { id: "TP-NEW-02", title: "草稿版本滚动清理", desc: "验证草稿超过 10 个时自动清理最旧版本，且正式版本不受影响" },
  { id: "TP-NEW-03", title: "自动保存状态栏指示器", desc: "验证自动保存成功/失败/进行中三种状态的 UI 展示与时间戳更新" },
];

export default function DiffPage() {
  return (
    <div className="no-sidebar">
      <span className="page-watermark">P7 · DIFF VIEW</span>

      {/* Topbar */}
      <div className="topbar">
        <div>
          <div className="sub">REQ-089 · 需求变更 Diff</div>
          <h1>数据保存功能重构 — 新增自动保存</h1>
          <div className="sub">变更时间 2025-06-14 14:32 · 变更人 张三</div>
        </div>
        <span className="spacer" />
        <span className="pill pill-red">−4 行删除</span>
        <span className="pill pill-green">+7 行新增</span>
        <span className="pill pill-amber">8 条用例受影响</span>
        <button type="button" className="btn">↩ 返回需求</button>
        <button type="button" className="btn btn-primary">✅ 确认变更</button>
      </div>

      {/* 2-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20, alignItems: "start" }}>

        {/* ── Left: Diff Content ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Text Diff Card */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 15 }}>📝</span>
              <span className="sec-title">文本级 Diff (Myers)</span>
              <span className="spacer" />
              <span className="pill pill-red">−4</span>
              <span className="pill pill-green">+7</span>
              <span className="pill pill-gray">5 ctx</span>
            </div>
            <div style={{ background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden" }}>
              {diffLines.map((line, i) => (
                <div
                  key={i}
                  className={`diff-line ${line.type === "add" ? "diff-add" : line.type === "del" ? "diff-del" : "diff-ctx"}`}
                >
                  <span className="mono" style={{ display: "inline-block", width: 32, textAlign: "right", marginRight: 12, opacity: 0.4, fontSize: 11 }}>
                    {i + 1}
                  </span>
                  {line.text}
                </div>
              ))}
            </div>
          </div>

          {/* AI Semantic Impact Card */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 15 }}>🤖</span>
              <span className="sec-title">AI 语义影响评估</span>
              <span className="spacer" />
              <span className="pill pill-green">置信度 92%</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {impactItems.map((item, i) => (
                <div key={i} className={`risk-item ${item.level}`}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--text)", marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Affected Cases ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Stats */}
          <div className="grid-3">
            <div className="card" style={{ textAlign: "center" }}>
              <div className="stat-val" style={{ color: "var(--amber)" }}>8</div>
              <div className="stat-label">影响用例</div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div className="stat-val" style={{ color: "var(--red)" }}>3</div>
              <div className="stat-label">需重写</div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div className="stat-val" style={{ color: "var(--accent)" }}>5</div>
              <div className="stat-label">可保留</div>
            </div>
          </div>

          {/* Must Rewrite */}
          <div>
            <div className="sec-header">
              <span style={{ fontSize: 14 }}>🔴</span>
              <span className="sec-title">必须重写</span>
              <span className="pill pill-red" style={{ marginLeft: 4 }}>3</span>
            </div>
            {mustRewriteCases.map((c) => (
              <div key={c.caseId} className="case-card" style={{ borderLeft: "3px solid var(--red)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span className="case-id">{c.caseId}</span>
                  <span className="pill pill-red" style={{ fontSize: 10 }}>需重写</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text)", marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--text3)", lineHeight: 1.5 }}>原因：{c.reason}</div>
              </div>
            ))}
          </div>

          {/* Can Keep */}
          <div>
            <div className="sec-header">
              <span style={{ fontSize: 14 }}>🟢</span>
              <span className="sec-title">可保留用例</span>
              <span className="pill pill-green" style={{ marginLeft: 4 }}>5</span>
            </div>
            {keepCases.map((c) => (
              <div key={c.caseId} className="case-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="case-id">{c.caseId}</span>
                  <span style={{ fontSize: 12.5, color: "var(--text2)" }}>{c.title}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Suggested New Test Points */}
          <div>
            <div className="sec-header">
              <span style={{ fontSize: 14 }}>💡</span>
              <span className="sec-title">新增测试点建议</span>
              <span className="pill pill-green" style={{ marginLeft: 4 }}>3</span>
            </div>
            {suggestedPoints.map((tp) => (
              <div key={tp.id} className="case-card" style={{ borderLeft: "3px solid var(--accent)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>{tp.id}</span>
                  <span style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 500 }}>{tp.title}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text3)", lineHeight: 1.5 }}>{tp.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
