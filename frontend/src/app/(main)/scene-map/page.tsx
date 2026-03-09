"use client";

import { Target, ClipboardList, Map, List, TreePine, Undo2 } from "lucide-react";

const steps = [
  { label: "需求录入", done: true },
  { label: "健康诊断", done: true },
  { label: "测试点确认", active: true },
  { label: "生成用例", done: false },
];

const testPoints = [
  { id: "TP-001", title: "正常自动保存触发", dot: "dot-green", cases: 3, checked: true, group: "正常流程" },
  { id: "TP-002", title: "手动保存优先级高于自动", dot: "dot-green", cases: 2, checked: true, group: "正常流程" },
  { id: "TP-003", title: "草稿恢复弹窗交互", dot: "dot-green", cases: 3, checked: true, group: "正常流程" },
  { id: "TP-004", title: "localStorage 暂存", dot: "dot-yellow", cases: 4, checked: false, group: "异常场景" },
  { id: "TP-005", title: "网络恢复后同步策略", dot: "dot-yellow", cases: 3, checked: false, group: "异常场景" },
  { id: "TP-006", title: "并发编辑冲突", dot: "dot-red", cases: 5, checked: false, group: "异常场景" },
  { id: "TP-007", title: "草稿存储上限", dot: "dot-red", cases: 3, checked: false, group: "边界值" },
  { id: "TP-008", title: "保存间隔边界值", dot: "dot-yellow", cases: 4, checked: false, group: "边界值" },
  { id: "TP-009", title: "只读用户权限边界", dot: "dot-red", cases: 2, checked: false, group: "权限 & 安全" },
  { id: "TP-010", title: "草稿可见范围", dot: "dot-gray", cases: 0, checked: false, group: "权限 & 安全" },
];

const groups = [...new Set(testPoints.map((t) => t.group))];

export default function SceneMapPage() {
  return (
    <div className="no-sidebar" style={{ padding: 0 }}>
      {/* Sub-nav progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "12px 24px", background: "var(--bg1)", borderBottom: "1px solid var(--border)" }}>
        {steps.map((s, i) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
                background: s.done ? "var(--accent)" : s.active ? "var(--accent-d)" : "var(--bg3)",
                color: s.done ? "#000" : s.active ? "var(--accent)" : "var(--text3)",
                border: s.active ? "1px solid rgba(0,217,163,.4)" : "1px solid transparent",
              }}
            >
              {s.done ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 12.5, fontWeight: s.active ? 600 : 400, color: s.active ? "var(--accent)" : s.done ? "var(--text2)" : "var(--text3)" }}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div style={{ width: 40, height: 1, background: s.done ? "var(--accent)" : "var(--border)", marginLeft: 8 }} />
            )}
          </div>
        ))}
        <div className="spacer" />
        <span className="pill pill-green">8/10 已确认</span>
        <button className="btn btn-sm"><Undo2 size={12} /> 返回诊断</button>
        <button className="btn btn-sm btn-primary">确认，进入用例生成 →</button>
      </div>

      {/* Content */}
      <div style={{ padding: 24 }}>
        <div className="topbar">
          <div>
            <div className="page-watermark">REQ-089 · 测试点确认</div>
            <h1>测试点确认</h1>
            <div className="sub">确认测试场景覆盖范围，调整粒度后进入用例生成</div>
          </div>
          <div className="spacer" />
          <button className="btn btn-sm">全选</button>
          <button className="btn btn-sm">反选</button>
          <button className="btn btn-sm">调整粒度</button>
        </div>

        <div className="three-col">
          {/* Left: Test Point Tree */}
          <div className="col-left">
            <div className="col-header">
              <Target size={14} /> 测试点列表
              <span className="mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--text3)" }}>10 个测试点</span>
            </div>
            <div style={{ padding: 10 }}>
              {groups.map((g) => (
                <div key={g}>
                  <div style={{ fontSize: 10.5, color: "var(--text3)", fontFamily: "var(--font-mono)", margin: "8px 0 6px" }}>{g}</div>
                  {testPoints.filter((t) => t.group === g).map((tp) => (
                    <div key={tp.id} className={`tp-item${tp.id === "TP-004" ? " active" : ""}`}>
                      <div className={`tp-checkbox${tp.checked ? " checked" : ""}`}>
                        {tp.checked && "✓"}
                      </div>
                      <span className={`scene-dot ${tp.dot}`} />
                      <span style={{ flex: 1, fontSize: 12 }}>{tp.title}</span>
                      <span className="mono" style={{ fontSize: 10, color: "var(--text3)" }}>~{tp.cases}条</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Middle: Detail */}
          <div className="col-mid">
            <div className="col-header" style={{ background: "var(--bg)" }}>
              <ClipboardList size={14} /> 测试点详情
              <span className="mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--accent)" }}>TP-004</span>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="scene-dot dot-yellow" />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>localStorage 暂存</span>
                  <span className="pill pill-amber">待确认</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.7, marginBottom: 12 }}>
                  当网络中断时，系统将未保存的草稿数据写入浏览器的 localStorage 进行暂存。
                  网络恢复后自动将最新版本同步到服务端，同步成功后清除 localStorage 中的旧版本。
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  <span className="tag">异常路径</span>
                  <span className="tag">网络容错</span>
                  <span className="tag">数据持久化</span>
                </div>
              </div>

              <div className="sec-header">
                <span className="sec-title">粒度建议</span>
              </div>
              <div className="card" style={{ marginBottom: 16, fontSize: 12.5 }}>
                <div style={{ color: "var(--text2)", marginBottom: 8 }}>AI 建议将此测试点拆分为 4 条用例：</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="scene-dot dot-yellow" />
                    <span>首次网络中断触发暂存</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="scene-dot dot-yellow" />
                    <span>多次编辑后 localStorage 版本管理</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="scene-dot dot-yellow" />
                    <span>网络恢复自动同步成功</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="scene-dot dot-yellow" />
                    <span>同步后 localStorage 清理验证</span>
                  </div>
                </div>
              </div>

              <div className="sec-header">
                <span className="sec-title">预览用例</span>
                <span style={{ fontSize: 11.5, color: "var(--text3)" }}>确认后将生成以下用例</span>
              </div>
              <div className="case-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span className="case-id">TC-004-01</span>
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>首次网络中断时自动暂存到 localStorage</span>
                </div>
                <table className="tbl" style={{ fontSize: 11.5 }}>
                  <thead>
                    <tr><th>步骤</th><th>操作</th><th>预期结果</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>1</td><td>正常编辑任务内容</td><td>内容可输入</td></tr>
                    <tr><td>2</td><td>断开网络连接</td><td>系统检测到断网</td></tr>
                    <tr><td>3</td><td>等待自动保存触发</td><td>数据写入 localStorage</td></tr>
                    <tr><td>4</td><td>检查 localStorage</td><td>包含最新草稿数据</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="case-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span className="case-id">TC-004-02</span>
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>网络恢复后自动同步到服务端</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>前置条件：已有 localStorage 暂存数据</div>
              </div>
            </div>
          </div>

          {/* Right: Scene Map */}
          <div className="col-right">
            <div className="col-header">
              <Map size={14} /> 场景地图
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}><List size={12} /> 列表</button>
                <button className="btn btn-sm btn-primary" style={{ fontSize: 10 }}><TreePine size={12} /> 图形</button>
              </div>
            </div>
            <div style={{ padding: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4, marginBottom: 12, textAlign: "center" }}>
                <div style={{ padding: 6, background: "rgba(0,217,163,.08)", borderRadius: 5, border: "1px solid rgba(0,217,163,.2)" }}>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--accent)" }}>3</div>
                  <div style={{ fontSize: 9.5, color: "var(--text3)" }}>已确认</div>
                </div>
                <div style={{ padding: 6, background: "rgba(245,158,11,.08)", borderRadius: 5, border: "1px solid rgba(245,158,11,.2)" }}>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--amber)" }}>3</div>
                  <div style={{ fontSize: 9.5, color: "var(--text3)" }}>待确认</div>
                </div>
                <div style={{ padding: 6, background: "rgba(244,63,94,.08)", borderRadius: 5, border: "1px solid rgba(244,63,94,.2)" }}>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--red)" }}>3</div>
                  <div style={{ fontSize: 9.5, color: "var(--text3)" }}>高风险</div>
                </div>
                <div style={{ padding: 6, background: "var(--bg2)", borderRadius: 5, border: "1px solid var(--border)" }}>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--text3)" }}>1</div>
                  <div style={{ fontSize: 9.5, color: "var(--text3)" }}>未知</div>
                </div>
              </div>
              {groups.map((g) => (
                <div key={g}>
                  <div style={{ fontSize: 10.5, color: "var(--text3)", fontFamily: "var(--font-mono)", margin: "8px 0 6px" }}>{g}</div>
                  {testPoints.filter((t) => t.group === g).map((tp) => (
                    <div key={tp.id} className="scene-node" style={tp.dot === "dot-red" ? { borderColor: "rgba(244,63,94,.3)" } : {}}>
                      <span className={`scene-dot ${tp.dot}`} />
                      <span style={{ fontSize: 12, flex: 1 }}>{tp.title}</span>
                      <span className="mono" style={{ fontSize: 10, color: tp.dot === "dot-red" ? "var(--red)" : "var(--text3)" }}>
                        {tp.cases > 0 ? `~${tp.cases}条` : "?"}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              <div style={{ marginTop: 12, padding: 8, background: "var(--bg2)", borderRadius: 6, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>预计生成用例总数</div>
                <div className="mono" style={{ fontSize: 22, fontWeight: 600, margin: "2px 0" }}>~30 条</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>确认所有测试点后方可生成</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
