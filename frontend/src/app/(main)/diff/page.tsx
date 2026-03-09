'use client';

import { AlertTriangle, ArrowRight, FileText, GitCompare, History, Target } from 'lucide-react';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const impactPill = (level: string) =>
  level === 'high'
    ? 'pill pill-red'
    : level === 'medium'
      ? 'pill pill-amber'
      : level === 'low'
        ? 'pill pill-green'
        : 'pill pill-gray';

export default function DiffPage() {
  const [reqId, setReqId] = useState('');
  const [versionFrom, setVersionFrom] = useState(1);
  const [versionTo, setVersionTo] = useState(2);
  const [diffResult, setDiffResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const computeDiff = async () => {
    if (!reqId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/diff/${reqId}/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_from: versionFrom,
          version_to: versionTo,
        }),
      });
      if (res.ok) setDiffResult(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadHistory = async () => {
    if (!reqId) return;
    try {
      const res = await fetch(`${API}/diff/${reqId}/history`);
      if (res.ok) setHistory(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const renderDiffLines = (text: string) =>
    text.split('\n').map((line, i) => {
      const cls = line.startsWith('+')
        ? 'diff-line diff-add'
        : line.startsWith('-')
          ? 'diff-line diff-del'
          : 'diff-line diff-ctx';
      return (
        <div key={i} className={cls}>
          {line}
        </div>
      );
    });

  return (
    <div>
      {/* Header */}
      <div className="topbar">
        <GitCompare size={20} style={{ color: 'var(--accent)' }} />
        <h1>需求变更 Diff</h1>
        <span className="sub">Requirement Change Diff</span>
        <div className="spacer" />
        <span className="page-watermark">M07 · DIFF</span>
      </div>

      {/* Input Bar */}
      <div
        className="card"
        style={{
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text3)',
              display: 'block',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            需求 ID
          </span>
          <input
            className="input"
            value={reqId}
            onChange={(e) => setReqId(e.target.value)}
            placeholder="输入需求 UUID"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text3)',
              display: 'block',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            从版本
          </span>
          <input
            className="input mono"
            type="number"
            value={versionFrom}
            onChange={(e) => setVersionFrom(Number(e.target.value))}
            style={{ width: 80 }}
          />
        </div>
        <ArrowRight size={16} style={{ color: 'var(--text3)', marginBottom: 8 }} />
        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text3)',
              display: 'block',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            到版本
          </span>
          <input
            className="input mono"
            type="number"
            value={versionTo}
            onChange={(e) => setVersionTo(Number(e.target.value))}
            style={{ width: 80 }}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={computeDiff}
          disabled={loading || !reqId}
        >
          {loading ? '分析中...' : '计算 Diff'}
        </button>
        <button type="button" className="btn" onClick={loadHistory} disabled={!reqId}>
          <History size={14} /> 历史
        </button>
      </div>

      {/* Impact Summary */}
      {diffResult && (
        <div className="grid-3" style={{ marginBottom: 20 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="stat-label">
              <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              影响等级
            </div>
            <div
              className="stat-val"
              style={{
                marginTop: 8,
                color:
                  diffResult.impact_level === 'high'
                    ? 'var(--red)'
                    : diffResult.impact_level === 'medium'
                      ? 'var(--amber)'
                      : 'var(--accent)',
              }}
            >
              {diffResult.impact_level?.toUpperCase()}
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="stat-label">
              <FileText size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              文本变更
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
              <span
                className="mono"
                style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}
              >
                +{diffResult.text_diff?.additions || 0}
              </span>
              <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)' }}>
                −{diffResult.text_diff?.deletions || 0}
              </span>
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="stat-label">
              <Target size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              受影响范围
            </div>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 8 }}>
              <div>
                <div className="stat-val" style={{ fontSize: 20, color: 'var(--amber)' }}>
                  {diffResult.affected_test_points?.count || 0}
                </div>
                <div className="stat-label">测试点</div>
              </div>
              <div>
                <div className="stat-val" style={{ fontSize: 20, color: 'var(--blue)' }}>
                  {diffResult.affected_test_cases?.count || 0}
                </div>
                <div className="stat-label">用例</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diff Detail */}
      {diffResult?.text_diff?.diff_text && (
        <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
          <div className="col-header">
            <FileText size={14} />
            Diff 详情
          </div>
          <div
            style={{
              maxHeight: 400,
              overflow: 'auto',
              padding: '8px 0',
              background: 'var(--bg2)',
            }}
          >
            {renderDiffLines(diffResult.text_diff.diff_text)}
          </div>
        </div>
      )}

      {/* Summary */}
      {diffResult?.summary && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="sec-header">
            <span className="frame-label">AI 摘要</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.7 }}>
            {diffResult.summary}
          </p>
        </div>
      )}

      {/* History Table */}
      {history.length > 0 && (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div className="col-header">
            <History size={14} />
            变更历史
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>版本</th>
                <th>影响等级</th>
                <th>摘要</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h: any) => (
                <tr key={h.id}>
                  <td>
                    <span className="mono">
                      v{h.version_from} → v{h.version_to}
                    </span>
                  </td>
                  <td>
                    <span className={impactPill(h.impact_level)}>{h.impact_level}</span>
                  </td>
                  <td>{h.summary}</td>
                  <td>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {h.created_at?.slice(0, 16)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state when no results */}
      {!diffResult && !loading && (
        <div className="card">
          <div className="empty-state">
            <GitCompare size={48} />
            <p style={{ fontWeight: 500 }}>输入需求 ID 并选择版本范围</p>
            <p>系统将进行文本级 + 语义级两阶段 Diff 分析</p>
          </div>
        </div>
      )}
    </div>
  );
}
