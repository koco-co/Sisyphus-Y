'use client';

import { ChevronLeft, ChevronRight, ClipboardList, Search, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface TestCase {
  id: string;
  case_id: string;
  title: string;
  priority: string;
  case_type: string;
  status: string;
  source: string;
  version: number;
  created_at: string;
}

const priorityPill = (p: string) =>
  p === 'P0'
    ? 'pill pill-red'
    : p === 'P1'
      ? 'pill pill-amber'
      : p === 'P2'
        ? 'pill pill-blue'
        : 'pill pill-gray';

const statusPill = (s: string) =>
  s === 'active' ? 'pill pill-green' : s === 'draft' ? 'pill pill-amber' : 'pill pill-red';

export default function TestCasesPage() {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCases = async () => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    try {
      const res = await fetch(`${API}/testcases/?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCases(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [page, statusFilter, priorityFilter]);

  const deleteCase = async (id: string) => {
    if (!confirm('确定删除？')) return;
    await fetch(`${API}/testcases/${id}`, { method: 'DELETE' });
    fetchCases();
  };

  const filtered = searchTerm
    ? cases.filter((c) => c.title.includes(searchTerm) || c.case_id.includes(searchTerm))
    : cases;
  const totalPages = Math.ceil(total / pageSize);
  const activeCount = cases.filter((c) => c.status === 'active').length;
  const aiCount = cases.filter((c) => c.source === 'ai').length;
  const manualCount = cases.filter((c) => c.source === 'manual').length;

  return (
    <div>
      {/* Header */}
      <div className="topbar">
        <ClipboardList size={20} style={{ color: 'var(--accent)' }} />
        <h1>用例管理中心</h1>
        <span className="sub">Test Case Management</span>
        <div className="spacer" />
        <span className="page-watermark">M06 · TESTCASES</span>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text3)',
              pointerEvents: 'none',
            }}
          />
          <input
            className="input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索用例..."
            style={{ paddingLeft: 32, width: 220 }}
          />
        </div>
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="active">有效</option>
          <option value="deprecated">废弃</option>
        </select>
        <select
          className="input"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">全部优先级</option>
          <option value="P0">P0</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="P3">P3</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: '总用例数', value: total, color: 'var(--accent)' },
          { label: '有效', value: activeCount, color: 'var(--accent)' },
          { label: 'AI 生成', value: aiCount, color: 'var(--amber)' },
          { label: '手动创建', value: manualCount, color: 'var(--purple)' },
        ].map((s) => (
          <div className="card" key={s.label} style={{ textAlign: 'center' }}>
            <div className="stat-val" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>用例编号</th>
              <th>标题</th>
              <th>优先级</th>
              <th>类型</th>
              <th>状态</th>
              <th>来源</th>
              <th>版本</th>
              <th style={{ width: 60 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tc) => (
              <tr key={tc.id}>
                <td>
                  <span className="mono" style={{ color: 'var(--accent)' }}>
                    {tc.case_id}
                  </span>
                </td>
                <td
                  style={{
                    maxWidth: 300,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tc.title}
                </td>
                <td>
                  <span className={priorityPill(tc.priority)}>{tc.priority}</span>
                </td>
                <td>
                  <span className="pill pill-gray">{tc.case_type}</span>
                </td>
                <td>
                  <span className={statusPill(tc.status)}>{tc.status}</span>
                </td>
                <td>
                  <span className={tc.source === 'ai' ? 'pill pill-blue' : 'pill pill-gray'}>
                    {tc.source === 'ai' ? 'AI' : '手动'}
                  </span>
                </td>
                <td>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
                    v{tc.version}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-danger"
                    onClick={() => deleteCase(tc.id)}
                    title="删除"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <ClipboardList size={40} />
                    <p>暂无用例数据</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span style={{ color: 'var(--text3)', fontSize: 12 }}>…</span>
                )}
                <button
                  type="button"
                  className={p === page ? 'active' : ''}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
