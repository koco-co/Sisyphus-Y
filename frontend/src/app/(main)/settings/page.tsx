'use client';

import { useState } from 'react';

/* ── sidebar items ── */
const sidebarItems = [
  { icon: '🤖', label: 'AI模型配置' },
  { icon: '🔗', label: '外部系统集成' },
  { icon: '👥', label: '团队权限' },
  { icon: '📋', label: '必问清单' },
  { icon: '📄', label: '模板库' },
  { icon: '📚', label: '知识库' },
  { icon: '🔒', label: '安全审计' },
];

/* ── model cards ── */
interface ModelInfo {
  name: string;
  provider: string;
  id: string;
  speed: number;
  quality: number;
  cost: number;
  active: boolean;
}

const models: ModelInfo[] = [
  {
    name: 'GLM-4-Flash',
    provider: '智谱AI',
    id: 'glm-4-flash',
    speed: 5,
    quality: 4,
    cost: 5,
    active: true,
  },
  {
    name: 'GPT-4o',
    provider: 'OpenAI',
    id: 'gpt-4o-2024-08-06',
    speed: 3,
    quality: 5,
    cost: 2,
    active: false,
  },
  {
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    id: 'claude-3-5-sonnet',
    speed: 4,
    quality: 5,
    cost: 3,
    active: false,
  },
];

/* ── slider parameters ── */
interface Param {
  label: string;
  key: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  fmt: (v: number) => string;
}

const params: Param[] = [
  {
    label: 'Temperature',
    key: 'temperature',
    min: 0,
    max: 2,
    step: 0.1,
    initial: 0.7,
    fmt: (v) => v.toFixed(1),
  },
  {
    label: 'Max Tokens',
    key: 'maxTokens',
    min: 256,
    max: 8192,
    step: 256,
    initial: 4096,
    fmt: (v) => String(v),
  },
  {
    label: 'Top-P',
    key: 'topP',
    min: 0,
    max: 1,
    step: 0.05,
    initial: 0.95,
    fmt: (v) => v.toFixed(2),
  },
];

/* ── integrations / feature toggles ── */
const integrations = [
  { label: 'Jira', desc: '同步需求与缺陷', on: true },
  { label: 'GitLab', desc: '代码变更 Diff 源', on: true },
  { label: 'Jenkins', desc: 'CI 执行回流', on: false },
];

const features = [
  { label: '自动 Diff 检测', desc: '需求变更时自动触发影响分析', on: true },
  { label: '智能推荐', desc: '基于历史数据推荐测试策略', on: true },
  { label: '批量生成', desc: '允许一次生成多组测试用例', on: false },
];

/* ── star helper ── */
function Stars({ count, max = 5 }: { count: number; max?: number }) {
  const stars = Array.from({ length: max }, (_, i) => ({
    id: `s${i + 1}`,
    filled: i < count,
  }));
  return (
    <span style={{ letterSpacing: 2, fontSize: 12 }}>
      {stars.map((s) => (
        <span key={s.id} style={{ color: s.filled ? 'var(--accent)' : 'var(--text3)' }}>
          ★
        </span>
      ))}
    </span>
  );
}

/* ── toggle row ── */
function ToggleRow({
  label,
  desc,
  on,
  onToggle,
}: {
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>{desc}</div>
      </div>
      <button
        type="button"
        className={`toggle${on ? ' on' : ''}`}
        onClick={onToggle}
        aria-label={`Toggle ${label}`}
      />
    </div>
  );
}

/* ── page ── */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('AI模型配置');
  const [activeModel, setActiveModel] = useState('GLM-4-Flash');
  const [paramVals, setParamVals] = useState<Record<string, number>>(
    Object.fromEntries(params.map((p) => [p.key, p.initial])),
  );
  const [intToggles, setIntToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(integrations.map((i) => [i.label, i.on])),
  );
  const [featToggles, setFeatToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(features.map((f) => [f.label, f.on])),
  );

  return (
    <>
      {/* Sidebar */}
      <aside className="sidebar-panel">
        <div className="sb-section">
          <div className="sb-label">设置</div>
          {sidebarItems.map((item) => (
            <button
              type="button"
              key={item.label}
              className={`sb-item${activeTab === item.label ? ' active' : ''}`}
              onClick={() => setActiveTab(item.label)}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="main-with-sidebar">
        <div className="page-watermark">P9 · SETTINGS</div>

        {/* ── AI 模型配置 ── */}
        <div className="sec-header">
          <span className="sec-title">AI 模型配置</span>
        </div>

        <div className="grid-3" style={{ marginBottom: 24 }}>
          {models.map((m) => (
            <button
              type="button"
              key={m.name}
              className={`model-card${activeModel === m.name ? ' active' : ''}`}
              style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
              onClick={() => setActiveModel(m.name)}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text)',
                    }}
                  >
                    {m.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text3)',
                      marginTop: 2,
                    }}
                  >
                    {m.provider}
                  </div>
                </div>
                {m.active && <span className="pill pill-green">当前</span>}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 11.5, color: 'var(--text3)', width: 36 }}>速度</span>
                  <Stars count={m.speed} />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 11.5, color: 'var(--text3)', width: 36 }}>质量</span>
                  <Stars count={m.quality} />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 11.5, color: 'var(--text3)', width: 36 }}>成本</span>
                  <Stars count={m.cost} />
                </div>
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text3)' }}>
                {m.id}
              </div>
            </button>
          ))}
        </div>

        <hr className="divider" />

        {/* ── 参数调整 ── */}
        <div className="sec-header">
          <span className="sec-title">参数调整</span>
        </div>
        <div
          className="card"
          style={{
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {params.map((p) => (
            <div key={p.key}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 12.5, color: 'var(--text2)' }}>{p.label}</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>
                  {p.fmt(paramVals[p.key])}
                </span>
              </div>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={paramVals[p.key]}
                onChange={(e) =>
                  setParamVals((prev) => ({
                    ...prev,
                    [p.key]: Number(e.target.value),
                  }))
                }
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>
          ))}
        </div>

        <hr className="divider" />

        {/* ── 外部系统集成 ── */}
        <div className="sec-header">
          <span className="sec-title">外部系统集成</span>
        </div>
        <div className="card" style={{ marginBottom: 24 }}>
          {integrations.map((it, i) => (
            <div key={it.label}>
              <ToggleRow
                label={it.label}
                desc={it.desc}
                on={!!intToggles[it.label]}
                onToggle={() =>
                  setIntToggles((prev) => ({
                    ...prev,
                    [it.label]: !prev[it.label],
                  }))
                }
              />
              {i < integrations.length - 1 && <hr className="divider" />}
            </div>
          ))}
        </div>

        <hr className="divider" />

        {/* ── 功能开关 ── */}
        <div className="sec-header">
          <span className="sec-title">功能开关</span>
        </div>
        <div className="card">
          {features.map((ft, i) => (
            <div key={ft.label}>
              <ToggleRow
                label={ft.label}
                desc={ft.desc}
                on={!!featToggles[ft.label]}
                onToggle={() =>
                  setFeatToggles((prev) => ({
                    ...prev,
                    [ft.label]: !prev[ft.label],
                  }))
                }
              />
              {i < features.length - 1 && <hr className="divider" />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
