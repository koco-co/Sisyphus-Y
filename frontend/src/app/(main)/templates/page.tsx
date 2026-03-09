'use client';

import { useState } from 'react';

/* ── categories ── */
const tabs = ['全部', '功能测试', '接口测试', '性能测试', '安全测试'] as const;

/* ── demo templates ── */
interface Template {
  icon: string;
  name: string;
  desc: string;
  category: string;
  uses: number;
  rating: number;
  tags: string[];
}

const templates: Template[] = [
  {
    icon: '🧪',
    name: '标准功能测试模板',
    desc: '覆盖正常流程、异常流程和边界值的通用功能测试模板，适用于大多数业务场景。',
    category: '功能测试',
    uses: 1247,
    rating: 4.8,
    tags: ['功能', '通用', '推荐'],
  },
  {
    icon: '🔌',
    name: 'RESTful API 测试模板',
    desc: '针对 REST 接口的参数校验、状态码、幂等性、限流等维度的标准化测试模板。',
    category: '接口测试',
    uses: 986,
    rating: 4.7,
    tags: ['API', 'REST', '接口'],
  },
  {
    icon: '⚡',
    name: '性能基线测试模板',
    desc: '包含并发、吞吐量、响应时间、资源占用等性能指标的基线测试用例模板。',
    category: '性能测试',
    uses: 654,
    rating: 4.5,
    tags: ['性能', '基线', '并发'],
  },
  {
    icon: '🔐',
    name: 'OWASP Top 10 安全模板',
    desc: '基于 OWASP Top 10 安全风险清单的安全测试用例模板，覆盖注入、XSS、CSRF 等。',
    category: '安全测试',
    uses: 523,
    rating: 4.9,
    tags: ['安全', 'OWASP', '渗透'],
  },
  {
    icon: '📊',
    name: '数据迁移验证模板',
    desc: '数据迁移场景的完整性、一致性、回滚验证测试模板，含字段映射校验。',
    category: '功能测试',
    uses: 412,
    rating: 4.3,
    tags: ['数据', '迁移', 'ETL'],
  },
  {
    icon: '🔄',
    name: '消息队列集成测试模板',
    desc: 'Kafka / RabbitMQ 消息投递、消费、重试、死信队列等场景的集成测试模板。',
    category: '接口测试',
    uses: 378,
    rating: 4.6,
    tags: ['MQ', 'Kafka', '集成'],
  },
];

/* ── page ── */
export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState('全部');

  const filtered =
    activeTab === '全部' ? templates : templates.filter((t) => t.category === activeTab);

  return (
    <div className="no-sidebar">
      <div className="page-watermark">P11 · TEMPLATE LIBRARY</div>

      {/* Topbar */}
      <div className="topbar">
        <h1>模板库</h1>
        <div className="spacer" />
        <input className="input" placeholder="🔍  搜索模板..." style={{ width: 220 }} />
        <button type="button" className="btn btn-primary">
          ＋ 新建模板
        </button>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map((t) => (
          <button
            type="button"
            key={t}
            className={`btn btn-sm${t === activeTab ? ' btn-primary' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid-3">
        {filtered.map((t) => (
          <div className="card card-hover" key={t.name}>
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg2)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              >
                {t.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text)',
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'var(--text3)',
                    marginTop: 2,
                  }}
                >
                  {t.category}
                </div>
              </div>
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--text2)',
                lineHeight: 1.6,
                marginBottom: 12,
                minHeight: 40,
              }}
            >
              {t.desc}
            </div>

            {/* Stats row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 12,
                fontSize: 12,
                color: 'var(--text3)',
              }}
            >
              <span>
                📊 使用{' '}
                <span className="mono" style={{ color: 'var(--text2)' }}>
                  {t.uses}
                </span>{' '}
                次
              </span>
              <span>
                ⭐{' '}
                <span className="mono" style={{ color: 'var(--accent)' }}>
                  {t.rating}
                </span>
              </span>
            </div>

            {/* Tags + action */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
              }}
            >
              {t.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
              <div className="spacer" />
              <button type="button" className="btn btn-sm btn-primary">
                使用
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
