'use client';

/* ── Static demo data ── */

const treeData = [
  { id: 's1', label: '1. 需求概述', children: [] },
  {
    id: 's2',
    label: '2. 自动保存功能',
    children: [
      {
        id: 'TP-001',
        label: 'TP-001 正常自动保存触发',
        dot: 'green',
        count: 3,
        checked: true,
        active: false,
      },
      {
        id: 'TP-002',
        label: 'TP-002 手动保存优先级',
        dot: 'green',
        count: 2,
        checked: true,
        active: false,
      },
      {
        id: 'TP-003',
        label: 'TP-003 草稿恢复交互',
        dot: 'yellow',
        count: 3,
        checked: false,
        active: false,
      },
      {
        id: 'TP-004',
        label: 'TP-004 localStorage暂存',
        dot: 'yellow',
        count: 4,
        checked: false,
        active: true,
      },
    ],
  },
  {
    id: 's3',
    label: '3. 并发编辑',
    children: [
      {
        id: 'TP-005',
        label: 'TP-005 并发编辑冲突',
        dot: 'red',
        count: 5,
        checked: false,
        active: false,
      },
    ],
  },
  {
    id: 's4',
    label: '4. 权限控制',
    children: [
      {
        id: 'TP-006',
        label: 'TP-006 角色权限校验',
        dot: 'gray',
        count: 0,
        checked: false,
        active: false,
      },
      {
        id: 'TP-007',
        label: 'TP-007 越权操作拦截',
        dot: 'gray',
        count: 0,
        checked: false,
        active: false,
      },
    ],
  },
];

const chatMessages = [
  {
    id: 'm1',
    role: 'system' as const,
    content: '正在为 TP-004 生成测试用例…',
    time: '14:32',
  },
  {
    id: 'm2',
    role: 'ai' as const,
    time: '14:32',
    caseCard: {
      caseId: 'TC-004-01',
      title: 'localStorage 暂存写入验证',
      priority: 'P1',
      preconditions: '用户已登录，编辑器处于草稿状态',
      expectedResult: 'localStorage 中存在对应草稿键值，内容与编辑区一致',
      steps: [
        { no: 1, action: '打开编辑器并输入 200 字内容', expected: '编辑区正常显示内容' },
        { no: 2, action: '等待 5 秒触发自动暂存', expected: '控制台输出暂存日志' },
        {
          no: 3,
          action: '打开 DevTools → Application → LocalStorage',
          expected: '存在 draft_{docId} 键',
        },
        { no: 4, action: '对比 localStorage 值与编辑区内容', expected: '内容完全一致' },
      ],
    },
  },
  {
    id: 'm3',
    role: 'ai' as const,
    time: '14:33',
    content: '已为您生成 TC-004-02「暂存数据过期清理」，验证超过 72 小时的草稿是否自动清除',
    streaming: true,
  },
];

const generatedCases = [
  {
    id: 'TC-001',
    title: '正常编辑触发自动保存',
    status: 'confirmed' as const,
    brief: '验证用户在编辑器中输入内容后，系统在 5 秒内自动触发保存操作并反馈成功状态。',
    tp: 'TP-001',
    steps: 4,
    priority: 'P1',
    type: '正常',
  },
  {
    id: 'TC-002',
    title: '手动保存覆盖自动保存',
    status: 'confirmed' as const,
    brief: '验证用户手动点击保存时，取消当前自动保存定时器并立即执行保存。',
    tp: 'TP-002',
    steps: 3,
    priority: 'P1',
    type: '正常',
  },
  {
    id: 'TC-003',
    title: '草稿恢复弹窗交互',
    status: 'pending' as const,
    brief: '验证用户重新打开含未保存草稿的文档时，系统弹窗提示是否恢复草稿内容。',
    tp: 'TP-003',
    steps: 5,
    priority: 'P2',
    type: '正常',
  },
  {
    id: 'TC-004',
    title: 'localStorage 暂存写入验证',
    status: 'pending' as const,
    brief: '验证自动暂存功能将草稿内容正确写入 localStorage，且内容与编辑区一致。',
    tp: 'TP-004',
    steps: 4,
    priority: 'P1',
    type: '正常',
  },
  {
    id: 'TC-005',
    title: '暂存容量超限降级',
    status: 'pending' as const,
    brief: '验证当 localStorage 容量接近上限时，系统降级为仅暂存标题和摘要。',
    tp: 'TP-004',
    steps: 3,
    priority: 'P2',
    type: '边界',
  },
];

const quickCommands = ['/生成全部', '/优化', '/换一种思路', '/调整粒度'];
const modeButtons = [
  { key: 'tp', label: '🎯 测试点驱动', active: false },
  { key: 'doc', label: '📄 文档驱动', active: true },
  { key: 'chat', label: '💬 对话引导', active: false },
  { key: 'tpl', label: '📋 模板填充', active: false },
];
const caseFilters = ['全部', '正常', '异常', '边界'];

export default function Page() {
  return (
    <div className="no-sidebar">
      {/* ── Top bar ── */}
      <div className="topbar" style={{ flexWrap: 'wrap' }}>
        <div style={{ width: '100%' }}>
          <span className="page-watermark">REQ-089 · 生成工作台</span>
        </div>
        <h1>用例生成工作台</h1>
        <span className="sub" style={{ whiteSpace: 'nowrap' }}>
          文档驱动模式 · 3/8 测试点已生成
        </span>
        <div className="spacer" />
        <div style={{ display: 'flex', gap: 4 }}>
          {modeButtons.map((m) => (
            <button
              type="button"
              key={m.key}
              className={m.active ? 'btn btn-primary btn-sm' : 'btn btn-sm'}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn" style={{ marginLeft: 8 }}>
          📤 导出
        </button>
        <button type="button" className="btn btn-primary">
          提交到用例库
        </button>
      </div>

      {/* ── Three-column layout ── */}
      <div className="three-col">
        {/* ── Left: Requirement navigation ── */}
        <div className="col-left">
          <div className="col-header">
            <span>📄 需求文档</span>
            <div className="spacer" />
            <button type="button" className="btn btn-ghost btn-sm">
              ⏴
            </button>
          </div>
          <div style={{ padding: '8px 10px' }}>
            {treeData.map((section) => (
              <div key={section.id} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text2)',
                    padding: '6px 4px',
                    cursor: 'pointer',
                  }}
                >
                  {section.label}
                </div>
                {section.children.map((tp) => (
                  <div
                    key={tp.id}
                    className={`tp-item${tp.active ? ' active' : ''}`}
                    style={{ marginLeft: 8, fontSize: 11.5 }}
                  >
                    <span className={`tp-checkbox${tp.checked ? ' checked' : ''}`}>
                      {tp.checked && '✓'}
                    </span>
                    <span className={`scene-dot dot-${tp.dot}`} />
                    <span style={{ flex: 1, color: tp.active ? 'var(--accent)' : 'var(--text2)' }}>
                      {tp.label}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--text3)' }}>
                      ~{tp.count}条
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Middle: AI chat ── */}
        <div className="col-mid" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="col-header" style={{ background: 'var(--bg)' }}>
            <span>💬 AI 生成对话</span>
            <span className="pill pill-blue" style={{ fontSize: 10 }}>
              TP-004
            </span>
            <div className="spacer" />
            <span className="pill pill-amber" style={{ fontSize: 10 }}>
              ⏳ 生成中...
            </span>
          </div>

          {/* Chat area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {chatMessages.map((msg) => {
              if (msg.role === 'system') {
                return (
                  <div
                    key={msg.id}
                    style={{
                      textAlign: 'center',
                      fontSize: 11,
                      color: 'var(--text3)',
                      margin: '12px 0',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    ⚙ {msg.content}
                  </div>
                );
              }

              return (
                <div key={msg.id} className="chat-msg">
                  <div className="chat-avatar chat-ai">AI</div>
                  <div style={{ flex: 1 }}>
                    {msg.caseCard ? (
                      <div className="chat-bubble ai-bubble" style={{ maxWidth: 520 }}>
                        <div style={{ marginBottom: 8 }}>已为您生成以下用例：</div>
                        {/* Case preview card */}
                        <div
                          className="case-card"
                          style={{
                            background: 'var(--bg)',
                            borderColor: 'rgba(0, 217, 163, 0.2)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 8,
                            }}
                          >
                            <span className="case-id">{msg.caseCard.caseId}</span>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
                              {msg.caseCard.title}
                            </span>
                            <div className="spacer" />
                            <span className="pill pill-red" style={{ fontSize: 10 }}>
                              {msg.caseCard.priority}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
                            <strong>前置条件：</strong>
                            {msg.caseCard.preconditions}
                          </div>
                          <table className="tbl" style={{ marginBottom: 8 }}>
                            <thead>
                              <tr>
                                <th style={{ width: 40 }}>步骤</th>
                                <th>操作</th>
                                <th>预期结果</th>
                              </tr>
                            </thead>
                            <tbody>
                              {msg.caseCard.steps.map((s) => (
                                <tr key={s.no}>
                                  <td className="mono" style={{ textAlign: 'center' }}>
                                    {s.no}
                                  </td>
                                  <td>{s.action}</td>
                                  <td>{s.expected}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                            <strong>预期结果：</strong>
                            {msg.caseCard.expectedResult}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="chat-bubble ai-bubble">
                        {msg.content}
                        {msg.streaming && <span className="streaming-cursor" />}
                      </div>
                    )}
                    <div className="chat-time">{msg.time}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick commands */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: '6px 16px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg)',
            }}
          >
            {quickCommands.map((cmd) => (
              <button type="button" key={cmd} className="btn btn-ghost btn-sm mono">
                {cmd}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '10px 16px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg)',
            }}
          >
            <textarea
              className="input"
              placeholder="输入指令或描述需要生成的用例场景…"
              rows={2}
              style={{ flex: 1, resize: 'none' }}
            />
            <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
              发送 ↵
            </button>
          </div>
        </div>

        {/* ── Right: Generated cases ── */}
        <div className="col-right" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="col-header">
            <span>📋 已生成用例</span>
            <div className="spacer" />
            <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
              12/38
            </span>
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 4, padding: '8px 12px' }}>
            {caseFilters.map((f, i) => (
              <button
                type="button"
                key={f}
                className={i === 0 ? 'btn btn-primary btn-sm' : 'btn btn-sm'}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Case cards list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 12px' }}>
            {generatedCases.map((c) => (
              <div key={c.id} className="case-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="case-id">{c.id}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
                    {c.title}
                  </span>
                  <span
                    className={`pill ${c.status === 'confirmed' ? 'pill-green' : 'pill-amber'}`}
                    style={{ fontSize: 10 }}
                  >
                    {c.status === 'confirmed' ? '已确认' : '待确认'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'var(--text3)',
                    lineHeight: 1.5,
                    marginBottom: 8,
                  }}
                >
                  {c.brief}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5 }}>
                  <span className="tag">{c.tp}</span>
                  <span style={{ color: 'var(--text3)' }}>{c.steps} 步骤</span>
                  <div className="spacer" />
                  <span className="pill pill-gray" style={{ fontSize: 10 }}>
                    {c.priority}
                  </span>
                  <span className="tag">{c.type}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Batch actions */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '10px 12px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <button type="button" className="btn btn-sm" style={{ flex: 1 }}>
              批量确认
            </button>
            <button type="button" className="btn btn-sm" style={{ flex: 1 }}>
              导出选中
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
