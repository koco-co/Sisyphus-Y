'use client';

/* ── 静态 Demo 数据 ── */

const highRisks = [
  {
    id: 'H-1',
    title: '网络中断恢复策略缺失',
    tags: ['异常流程', '网络'],
    status: '待补全',
  },
  {
    id: 'H-2',
    title: '并发编辑冲突未说明',
    tags: ['并发', '数据一致性'],
    status: '对话中',
  },
  {
    id: 'H-3',
    title: '草稿存储上限未定义',
    tags: ['边界值', '存储'],
    status: '待补全',
  },
];

const medRisks = [
  {
    id: 'M-1',
    title: '权限边界未说明',
    tags: ['权限', '安全'],
    status: '待补全',
  },
  {
    id: 'M-2',
    title: '保存间隔最小值',
    tags: ['性能', '边界值'],
    status: '已处理',
  },
  {
    id: 'M-3',
    title: '草稿恢复入口位置',
    tags: ['交互', 'UI'],
    status: '待补全',
  },
];

const industryItems = [
  {
    id: 'I-1',
    title: '幂等性保障',
    tags: ['行业规范', '接口'],
    status: '已采纳',
  },
  {
    id: 'I-2',
    title: '断网期间本地存储策略',
    tags: ['行业规范', '离线'],
    status: '已采纳',
  },
];

const chatMessages: {
  role: 'ai' | 'user';
  time: string;
  content: string;
  streaming?: boolean;
}[] = [
  {
    role: 'ai',
    time: '10:32',
    content:
      '我注意到需求文档中未提及网络中断时的恢复策略。当用户正在编辑草稿时，如果网络突然断开，系统应该如何处理？具体来说：\n\n1. 是否需要本地缓存未保存的内容？\n2. 网络恢复后，如何与服务端数据合并？\n3. 是否需要提示用户网络状态变更？',
  },
  {
    role: 'user',
    time: '10:34',
    content:
      '网络断开时需要本地缓存，恢复后自动同步。如果有冲突以本地版本为准，但需要弹窗让用户确认。',
  },
  {
    role: 'ai',
    time: '10:34',
    content:
      '已记录。接下来关于「并发编辑冲突」——当两个用户同时编辑同一份文档时，系统应采用什么策略？\n\n常见方案有：\n• **悲观锁**：先到先得，后者只读\n• **乐观锁**：允许同时编辑，提交时检测冲突\n• **实时协同**：类似 Google Docs 的 OT/CRDT',
  },
  {
    role: 'user',
    time: '10:36',
    content: '采用乐观锁，提交时如果版本号不一致就提示冲突，让用户选择保留哪个版本。',
  },
  {
    role: 'ai',
    time: '10:36',
    content:
      '明白，已将并发策略更新为「乐观锁 + 版本号校验 + 用户手动选择」。\n\n现在来看第三个高风险项——草稿存储上限。当前需求未定义单个用户可以保存多少份草稿。建议从以下维度考虑：',
    streaming: true,
  },
];

const sceneGroups = [
  {
    label: '正常流程',
    nodes: [
      { name: '创建草稿', color: 'green' as const },
      { name: '自动保存', color: 'green' as const },
      { name: '手动提交', color: 'green' as const },
    ],
  },
  {
    label: '异常场景',
    nodes: [
      { name: '网络中断恢复', color: 'yellow' as const },
      { name: '并发冲突处理', color: 'yellow' as const },
      { name: '存储空间不足', color: 'red' as const },
    ],
  },
  {
    label: '边界值',
    nodes: [
      { name: '草稿数量上限', color: 'red' as const },
      { name: '最小保存间隔', color: 'yellow' as const },
    ],
  },
  {
    label: '权限 & 安全',
    nodes: [
      { name: '越权访问草稿', color: 'red' as const },
      { name: '已删除用户草稿', color: 'gray' as const },
      { name: '草稿数据加密', color: 'gray' as const },
    ],
  },
];

const statusPill = (s: string) => {
  if (s === '对话中') return 'pill pill-amber';
  if (s === '已处理' || s === '已采纳') return 'pill pill-green';
  return 'pill pill-gray';
};

/* ── 页面组件 ── */

export default function Page() {
  return (
    <>
      {/* ─── 左侧边栏 ─── */}
      <aside className="sidebar-panel">
        <div className="sb-section">
          <a
            href="/requirements"
            style={{
              fontSize: 12,
              color: 'var(--text3)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 4px',
            }}
          >
            ← 返回需求列表
          </a>
        </div>

        <hr className="divider" />

        <div className="sb-section">
          <div className="sb-label">诊断进度</div>
          <div className="sb-item active">
            <span className="icon">🔍</span>需求健康报告
          </div>
          <div className="sb-item">
            <span className="icon">💬</span>场景补全对话
          </div>
          <div className="sb-item" style={{ opacity: 0.4 }}>
            <span className="icon">🗺</span>测试点确认
          </div>
          <div className="sb-item" style={{ opacity: 0.4 }}>
            <span className="icon">⚡</span>生成用例
          </div>
        </div>

        <hr className="divider" />

        <div className="sb-section">
          <div className="sb-label">健康报告概览</div>
          <div
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '12px 14px',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: 'var(--text3)',
                marginBottom: 8,
              }}
            >
              总遗漏项
            </div>
            <div
              className="mono"
              style={{
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1,
                marginBottom: 12,
              }}
            >
              8
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                fontSize: 11,
              }}
            >
              {[
                { label: '高风险', count: 3, color: 'var(--red)' },
                { label: '中风险', count: 3, color: 'var(--amber)' },
                { label: '行业清单', count: 2, color: 'var(--blue)' },
                { label: '已处理', count: 2, color: 'var(--accent)' },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: s.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: 'var(--text3)' }}>{s.label}</span>
                  <span className="mono" style={{ marginLeft: 'auto', fontWeight: 600 }}>
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ─── 主内容区 ─── */}
      <div className="main-with-sidebar">
        {/* Topbar */}
        <div className="topbar" style={{ flexWrap: 'wrap' }}>
          <div style={{ width: '100%' }}>
            <span className="page-watermark">REQ-089 · 需求健康诊断</span>
          </div>
          <h1>草稿自动保存功能 — 健康诊断</h1>
          <span className="topbar sub">识别需求盲区，通过对话补全场景</span>
          <span className="pill pill-blue">第 2 轮 · 深度聚焦</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-sm">
              导出报告
            </button>
            <button type="button" className="btn btn-primary btn-sm">
              完成，进入测试点确认 →
            </button>
          </div>
        </div>

        {/* ─── 三栏诊断布局 ─── */}
        <div className="diag-col">
          {/* ── 左列: 健康报告 ── */}
          <div className="col-left">
            <div className="col-header">
              <span>🔍 需求健康报告</span>
              <span className="pill pill-red" style={{ marginLeft: 'auto' }}>
                8 处遗漏
              </span>
            </div>
            <div style={{ padding: 10 }}>
              {/* 高风险 */}
              <div className="sb-label" style={{ marginBottom: 6, marginTop: 4 }}>
                🔴 高风险 · 3
              </div>
              {highRisks.map((r) => (
                <div key={r.id} className="risk-item high">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      {r.title}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {r.tags.map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                      <span className={statusPill(r.status)}>{r.status}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* 中风险 */}
              <div className="sb-label" style={{ marginBottom: 6, marginTop: 14 }}>
                🟡 中风险 · 3
              </div>
              {medRisks.map((r) => (
                <div key={r.id} className="risk-item med">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      {r.title}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {r.tags.map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                      <span className={statusPill(r.status)}>{r.status}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* 行业清单 */}
              <div className="sb-label" style={{ marginBottom: 6, marginTop: 14 }}>
                🔵 行业清单 · 2
              </div>
              {industryItems.map((r) => (
                <div key={r.id} className="risk-item done">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      {r.title}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {r.tags.map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                      <span className={statusPill(r.status)}>{r.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 中列: 对话 ── */}
          <div className="col-mid">
            <div className="col-header">
              <span>💬 场景补全对话</span>
              <span className="pill pill-blue">第2轮 · 深度聚焦</span>
              <span
                className="mono"
                style={{
                  marginLeft: 'auto',
                  fontSize: 11,
                  color: 'var(--text3)',
                }}
              >
                3/8 已处理
              </span>
            </div>

            <div style={{ padding: 14 }}>
              {/* 轮次分隔 */}
              <div
                style={{
                  textAlign: 'center',
                  margin: '8px 0 18px',
                }}
              >
                <span className="pill pill-gray" style={{ fontSize: 10.5 }}>
                  第一轮 · 广度扫描完成
                </span>
              </div>

              {/* 聊天消息 */}
              {chatMessages.map((msg) => (
                <div key={`${msg.role}-${msg.time}`} className="chat-msg">
                  <div className={`chat-avatar ${msg.role === 'ai' ? 'chat-ai' : 'chat-user'}`}>
                    {msg.role === 'ai' ? 'AI' : '你'}
                  </div>
                  <div>
                    <div
                      className={`chat-bubble${msg.role === 'ai' ? ' ai-bubble' : ''}`}
                      style={{ whiteSpace: 'pre-wrap' }}
                    >
                      {msg.content}
                      {msg.streaming && <span className="streaming-cursor" />}
                    </div>
                    <div className="chat-time">{msg.time}</div>
                  </div>
                </div>
              ))}

              {/* 输入区 */}
              <div
                style={{
                  marginTop: 8,
                  borderTop: '1px solid var(--border)',
                  paddingTop: 12,
                }}
              >
                <textarea
                  className="input"
                  rows={3}
                  placeholder="输入回复，补全遗漏场景…"
                  style={{
                    width: '100%',
                    resize: 'vertical',
                    fontSize: 12.5,
                    marginBottom: 8,
                  }}
                />
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-sm">
                    跳过
                  </button>
                  <button type="button" className="btn btn-sm">
                    已知晓
                  </button>
                  <button type="button" className="btn btn-primary btn-sm">
                    发送
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── 右列: 场景地图预览 ── */}
          <div className="col-right">
            <div className="col-header">
              <span>🗺 场景地图实时预览</span>
              <div
                style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  gap: 2,
                }}
              >
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px 0 0 4px',
                    background: 'var(--bg3)',
                  }}
                >
                  列表
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    padding: '2px 8px',
                    borderRadius: '0 4px 4px 0',
                  }}
                >
                  树形
                </button>
              </div>
            </div>

            <div style={{ padding: 10 }}>
              {/* 统计迷你网格 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 6,
                  marginBottom: 14,
                }}
              >
                {[
                  { label: '绿色', count: 6, cls: 'dot-green' },
                  { label: '黄色', count: 4, cls: 'dot-yellow' },
                  { label: '红色', count: 5, cls: 'dot-red' },
                  { label: '灰色', count: 2, cls: 'dot-gray' },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      textAlign: 'center',
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '8px 4px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span className={`scene-dot ${s.cls}`} />
                    </div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
                      {s.count}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* 场景节点分组 */}
              {sceneGroups.map((g) => (
                <div key={g.label} style={{ marginBottom: 12 }}>
                  <div className="sb-label" style={{ marginBottom: 4 }}>
                    {g.label}
                  </div>
                  {g.nodes.map((n) => (
                    <div key={n.name} className="scene-node">
                      <span className={`scene-dot dot-${n.color}`} />
                      <span style={{ fontSize: 12 }}>{n.name}</span>
                    </div>
                  ))}
                </div>
              ))}

              {/* 汇总 */}
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 12px',
                  background: 'var(--accent-d)',
                  border: '1px solid rgba(0,217,163,0.2)',
                  borderRadius: 8,
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>预计生成用例总数</span>
                <div
                  className="mono"
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    marginTop: 2,
                  }}
                >
                  ~38 条
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
