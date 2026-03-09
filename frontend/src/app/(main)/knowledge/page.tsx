'use client';

import { useState } from 'react';
import { Folder, Ruler, Compass, PenLine, Wrench, Search, Upload, Check, Clock, type LucideIcon } from 'lucide-react';

/* ── sidebar categories ── */
const categories: { icon: LucideIcon; label: string; count: number }[] = [
  { icon: Folder, label: '全部文档', count: 48 },
  { icon: Ruler, label: '测试规范', count: 12 },
  { icon: Compass, label: '行业标准', count: 8 },
  { icon: PenLine, label: '历史用例', count: 18 },
  { icon: Wrench, label: '自定义', count: 10 },
];

/* ── stats ── */
const stats = [
  { label: '文档总数', value: '48' },
  { label: '已向量化', value: '42' },
  { label: '本月命中', value: '1,247' },
  { label: '平均相关度', value: '87%' },
];

/* ── demo documents ── */
interface Doc {
  name: string;
  category: string;
  categoryPill: string;
  vectorized: boolean;
  uploadTime: string;
  hits: number;
}

const docs: Doc[] = [
  {
    name: '接口测试规范 v3.2.pdf',
    category: '测试规范',
    categoryPill: 'pill-blue',
    vectorized: true,
    uploadTime: '2024-01-15',
    hits: 342,
  },
  {
    name: 'GB/T 25000.51 软件质量标准.pdf',
    category: '行业标准',
    categoryPill: 'pill-purple',
    vectorized: true,
    uploadTime: '2024-01-10',
    hits: 218,
  },
  {
    name: '数据集成平台历史回归用例.xlsx',
    category: '历史用例',
    categoryPill: 'pill-amber',
    vectorized: true,
    uploadTime: '2024-01-08',
    hits: 189,
  },
  {
    name: '性能测试基线指标.md',
    category: '测试规范',
    categoryPill: 'pill-blue',
    vectorized: true,
    uploadTime: '2024-01-05',
    hits: 156,
  },
  {
    name: '安全测试 Checklist.docx',
    category: '测试规范',
    categoryPill: 'pill-blue',
    vectorized: false,
    uploadTime: '2024-01-03',
    hits: 97,
  },
  {
    name: 'OAuth 2.0 集成测试方案.pdf',
    category: '自定义',
    categoryPill: 'pill-gray',
    vectorized: true,
    uploadTime: '2023-12-28',
    hits: 134,
  },
  {
    name: '数据开发工作台 UAT 报告.pdf',
    category: '历史用例',
    categoryPill: 'pill-amber',
    vectorized: true,
    uploadTime: '2023-12-20',
    hits: 78,
  },
  {
    name: 'ISO 27001 信息安全指引.pdf',
    category: '行业标准',
    categoryPill: 'pill-purple',
    vectorized: false,
    uploadTime: '2023-12-15',
    hits: 33,
  },
];

/* ── page ── */
export default function KnowledgePage() {
  const [activeCategory, setActiveCategory] = useState('全部文档');

  return (
    <>
      {/* Sidebar */}
      <aside className="sidebar-panel">
        <div className="sb-section">
          <div className="sb-label">分类</div>
          {categories.map((c) => {
            const CatIcon = c.icon;
            return (
              <button
                type="button"
                key={c.label}
                className={`sb-item${activeCategory === c.label ? ' active' : ''}`}
                onClick={() => setActiveCategory(c.label)}
              >
                <CatIcon size={14} />
                {c.label}
                <span className="sb-count">{c.count}</span>
              </button>
            );
          })}
        </div>

        <div className="sb-section" style={{ marginTop: 16 }}>
          <div className="sb-label">RAG 状态</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
            }}
          >
            <div className="sb-dot" style={{ background: 'var(--accent)' }} />
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>引擎运行中</span>
          </div>
          <div
            style={{
              padding: '4px 12px',
              fontSize: 11,
              color: 'var(--text3)',
            }}
          >
            Qdrant · 42/48 已索引
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-with-sidebar">
        <div className="page-watermark">P10 · KNOWLEDGE BASE</div>

        {/* Topbar */}
        <div className="topbar">
          <h1>知识库管理</h1>
          <div className="spacer" />
          <input className="input" placeholder="搜索文档..." style={{ width: 220 }} />
          <button type="button" className="btn btn-primary">
            <Upload size={12} /> 上传文档
          </button>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {stats.map((s) => (
            <div className="card" key={s.label}>
              <div className="stat-val">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Document table */}
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>文档名称</th>
                <th>分类</th>
                <th>向量化状态</th>
                <th>上传时间</th>
                <th>命中次数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.name}>
                  <td style={{ fontWeight: 500, color: 'var(--text)' }}>{d.name}</td>
                  <td>
                    <span className={`pill ${d.categoryPill}`}>{d.category}</span>
                  </td>
                  <td>
                    <span className={`pill ${d.vectorized ? 'pill-green' : 'pill-amber'}`}>
                      {d.vectorized ? <><Check size={10} /> 已完成</> : <><Clock size={10} /> 处理中</>}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {d.uploadTime}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 12 }}>
                      {d.hits}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="btn btn-ghost btn-sm">
                        查看
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm btn-danger">
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
