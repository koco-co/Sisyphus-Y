'use client';

import {
  BookMarked,
  BookOpen,
  CheckSquare,
  Database,
  FileText,
  Lightbulb,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface KnowledgeDoc {
  id: string;
  title: string;
  doc_type: string;
  tags: any;
  source: string;
  version: number;
  status: string;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; pill: string; icon: React.ReactNode }> = {
  standard: {
    label: '标准规范',
    pill: 'pill pill-blue',
    icon: <BookMarked size={14} />,
  },
  checklist: {
    label: '检查清单',
    pill: 'pill pill-green',
    icon: <CheckSquare size={14} />,
  },
  best_practice: {
    label: '最佳实践',
    pill: 'pill pill-amber',
    icon: <Lightbulb size={14} />,
  },
  domain: {
    label: '领域知识',
    pill: 'pill pill-purple',
    icon: <Database size={14} />,
  },
};

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('standard');
  const [newContent, setNewContent] = useState('');

  const fetchDocs = async () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set('doc_type', typeFilter);
    try {
      const res = await fetch(`${API}/knowledge/?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocs(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [typeFilter]);

  const createDoc = async () => {
    if (!newTitle.trim()) return;
    try {
      await fetch(`${API}/knowledge/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          doc_type: newType,
          content: newContent,
        }),
      });
      setShowCreate(false);
      setNewTitle('');
      setNewContent('');
      fetchDocs();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm('确定删除？')) return;
    await fetch(`${API}/knowledge/${id}`, { method: 'DELETE' });
    fetchDocs();
  };

  return (
    <div>
      {/* Header */}
      <div className="topbar">
        <BookOpen size={20} style={{ color: 'var(--accent)' }} />
        <h1>知识库</h1>
        <span className="sub">Knowledge Base</span>
        <span className="pill pill-green" style={{ marginLeft: 4 }}>
          {total}
        </span>
        <div className="spacer" />
        <span className="page-watermark">M11 · KNOWLEDGE</span>
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
        <select
          className="input"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">全部类型</option>
          <option value="standard">标准规范</option>
          <option value="checklist">检查清单</option>
          <option value="best_practice">最佳实践</option>
          <option value="domain">领域知识</option>
        </select>
        <div className="spacer" />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? <X size={14} /> : <Plus size={14} />}
          {showCreate ? '取消' : '新建文档'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div
          className="card fade-in"
          style={{
            marginBottom: 20,
            borderColor: 'rgba(0, 179, 134, 0.3)',
          }}
        >
          <div className="sec-header" style={{ marginBottom: 12 }}>
            <span className="frame-label">新建文档</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <input
              className="input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="文档标题"
              style={{ flex: 1 }}
            />
            <select className="input" value={newType} onChange={(e) => setNewType(e.target.value)}>
              <option value="standard">标准规范</option>
              <option value="checklist">检查清单</option>
              <option value="best_practice">最佳实践</option>
              <option value="domain">领域知识</option>
            </select>
          </div>
          <textarea
            className="input"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="文档内容..."
            rows={4}
            style={{
              width: '100%',
              resize: 'vertical',
              marginBottom: 10,
              fontFamily: 'var(--font-sans)',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={createDoc}>
              创建
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setShowCreate(false);
                setNewTitle('');
                setNewContent('');
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Document List */}
      <div style={{ display: 'grid', gap: 8 }}>
        {docs.map((doc) => {
          const cfg = TYPE_CONFIG[doc.doc_type] || {
            label: doc.doc_type,
            pill: 'pill pill-gray',
            icon: <FileText size={14} />,
          };
          return (
            <div
              key={doc.id}
              className="card card-hover"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--accent-d)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                  flexShrink: 0,
                }}
              >
                {cfg.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {doc.title}
                  </span>
                  <span className={cfg.pill}>{cfg.label}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
                    v{doc.version}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {doc.created_at?.slice(0, 10)}
                  </span>
                  {doc.status && (
                    <span
                      className={`pill ${doc.status === 'active' ? 'pill-green' : 'pill-gray'}`}
                    >
                      {doc.status}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-danger"
                onClick={() => deleteDoc(doc.id)}
                title="删除"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}

        {docs.length === 0 && (
          <div className="card">
            <div className="empty-state">
              <BookOpen size={48} />
              <p style={{ fontWeight: 500 }}>暂无知识库文档</p>
              <p>点击「新建文档」添加标准规范、检查清单等知识文档</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
