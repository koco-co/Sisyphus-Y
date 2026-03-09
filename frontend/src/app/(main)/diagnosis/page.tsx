'use client';

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  FolderOpen,
  Globe,
  IterationCw,
  Loader2,
  Lock,
  Send,
  Shield,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface Iteration {
  id: string;
  name: string;
  status: string;
}

interface Requirement {
  id: string;
  req_id: string;
  title: string;
  status: string;
}

interface DiagnosisReport {
  id: string;
  requirement_id: string;
  status: string;
  overall_score: number | null;
  summary: string | null;
  risk_count_high: number;
  risk_count_medium: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking_content?: string;
  created_at: string;
}

export default function DiagnosisPage() {
  // Tree state
  const [products, setProducts] = useState<Product[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [iterations, setIterations] = useState<Record<string, Iteration[]>>({});
  const [expandedIterations, setExpandedIterations] = useState<Set<string>>(new Set());
  const [requirements, setRequirements] = useState<Record<string, Requirement[]>>({});

  // Selection
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [selectedReqTitle, setSelectedReqTitle] = useState<string>('');

  // Diagnosis state
  const [report, setReport] = useState<DiagnosisReport | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load products on mount
  useEffect(() => {
    fetch(`${API}/products/`)
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : data.items || []))
      .catch(console.error);
  }, []);

  // Load iterations when product expanded
  const toggleProduct = async (productId: string) => {
    const next = new Set(expandedProducts);
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
      if (!iterations[productId]) {
        try {
          const res = await fetch(`${API}/products/${productId}/iterations`);
          const data = await res.json();
          setIterations((prev) => ({
            ...prev,
            [productId]: Array.isArray(data) ? data : data.items || [],
          }));
        } catch (e) {
          console.error(e);
        }
      }
    }
    setExpandedProducts(next);
  };

  // Load requirements when iteration expanded
  const toggleIteration = async (iterationId: string) => {
    const next = new Set(expandedIterations);
    if (next.has(iterationId)) {
      next.delete(iterationId);
    } else {
      next.add(iterationId);
      if (!requirements[iterationId]) {
        try {
          const res = await fetch(`${API}/products/iterations/${iterationId}/requirements`);
          const data = await res.json();
          setRequirements((prev) => ({
            ...prev,
            [iterationId]: Array.isArray(data) ? data : data.items || [],
          }));
        } catch (e) {
          console.error(e);
        }
      }
    }
    setExpandedIterations(next);
  };

  // Select requirement → load diagnosis
  const selectRequirement = async (req: Requirement) => {
    setSelectedReqId(req.id);
    setSelectedReqTitle(req.title);
    setMessages([]);
    setReport(null);

    try {
      const reportRes = await fetch(`${API}/diagnosis/${req.id}/create`, { method: 'POST' });
      if (reportRes.ok) {
        const reportData = await reportRes.json();
        setReport(reportData);
      }

      const msgRes = await fetch(`${API}/diagnosis/${req.id}/messages`);
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setMessages(Array.isArray(msgData) ? msgData : []);
      }
    } catch (e) {
      console.error('Failed to load diagnosis:', e);
    }
  };

  // SSE streaming chat
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !selectedReqId || isStreaming) return;

    const userMsg = inputText.trim();
    setInputText('');
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userMsg,
        created_at: new Date().toISOString(),
      },
    ]);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      abortRef.current = new AbortController();
      const res = await fetch(`${API}/diagnosis/${selectedReqId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.delta) {
                fullContent += data.delta;
                setStreamingContent(fullContent);
              }
            } catch {
              const text = line.slice(6);
              if (text && text !== '[DONE]') {
                fullContent += text;
                setStreamingContent(fullContent);
              }
            }
          } else if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim();
            if (eventType === 'done') {
              break;
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: fullContent || '诊断完成',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        console.error('Chat error:', e);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `错误: ${e.message}`,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [inputText, selectedReqId, isStreaming]);

  // Auto-scroll on new messages or streaming updates
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll must trigger on content changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Complete diagnosis
  const completeDiagnosis = async () => {
    if (!selectedReqId) return;
    try {
      const res = await fetch(`${API}/diagnosis/${selectedReqId}/complete`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const scoreColor = (score: number | null) => {
    if (!score) return 'var(--text-secondary, var(--text3))';
    if (score >= 80) return '#00d9a3';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const diagnosisDimensions = [
    { icon: Shield, label: '功能边界', desc: '功能边界遗漏检测' },
    { icon: AlertTriangle, label: '异常场景', desc: '异常场景缺失扫描' },
    { icon: Database, label: '数据约束', desc: '数据约束模糊识别' },
    { icon: Zap, label: '性能指标', desc: '性能指标缺失检查' },
    { icon: Globe, label: '兼容性', desc: '兼容性未提及发现' },
    { icon: Lock, label: '安全风险', desc: '安全风险忽略扫描' },
  ];

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', gap: 0 }}>
      {/* Left Sidebar - Requirement Tree */}
      <aside
        style={{
          width: 260,
          minWidth: 260,
          borderRight: '1px solid var(--border)',
          background: 'var(--bg1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            <Activity size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            需求健康诊断
          </h3>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {products.map((product) => (
            <div key={product.id}>
              <button
                type="button"
                onClick={() => toggleProduct(product.id)}
                className="card-hover"
                style={{
                  all: 'unset',
                  boxSizing: 'border-box',
                  width: '100%',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 6,
                  fontSize: 13,
                  color: 'var(--text)',
                }}
              >
                {expandedProducts.has(product.id) ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                <FolderOpen size={14} style={{ color: 'var(--accent)' }} />
                {product.name}
              </button>
              {expandedProducts.has(product.id) &&
                (iterations[product.id] || []).map((iter) => (
                  <div key={iter.id} style={{ paddingLeft: 20 }}>
                    <button
                      type="button"
                      onClick={() => toggleIteration(iter.id)}
                      className="card-hover"
                      style={{
                        all: 'unset',
                        boxSizing: 'border-box',
                        width: '100%',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        borderRadius: 6,
                        fontSize: 12,
                        color: 'var(--text3, var(--text-secondary))',
                      }}
                    >
                      {expandedIterations.has(iter.id) ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronRight size={12} />
                      )}
                      <IterationCw size={12} />
                      {iter.name}
                    </button>
                    {expandedIterations.has(iter.id) &&
                      (requirements[iter.id] || []).map((req) => (
                        <button
                          type="button"
                          key={req.id}
                          onClick={() => selectRequirement(req)}
                          className="card-hover"
                          style={{
                            all: 'unset',
                            boxSizing: 'border-box',
                            width: '100%',
                            padding: '6px 12px',
                            marginLeft: 20,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            borderRadius: 6,
                            fontSize: 12,
                            background:
                              selectedReqId === req.id
                                ? 'var(--accent-d, rgba(0,217,163,0.1))'
                                : undefined,
                            color:
                              selectedReqId === req.id
                                ? 'var(--accent)'
                                : 'var(--text3, var(--text-secondary))',
                          }}
                        >
                          <FileText size={12} />
                          {req.title || req.req_id}
                        </button>
                      ))}
                  </div>
                ))}
            </div>
          ))}
          {products.length === 0 && (
            <div
              style={{
                padding: 16,
                textAlign: 'center',
                color: 'var(--text3, var(--text-secondary))',
                fontSize: 13,
              }}
            >
              暂无产品数据
            </div>
          )}
        </div>

        {/* Report Summary */}
        {report && (
          <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  border: `3px solid ${scoreColor(report.overall_score)}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 700,
                  color: scoreColor(report.overall_score),
                }}
              >
                {report.overall_score ?? '—'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text3, var(--text-secondary))',
                  marginTop: 4,
                }}
              >
                健康评分
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 12 }}>
              <span className="pill pill-red">高风险 {report.risk_count_high}</span>
              <span className="pill pill-amber">中风险 {report.risk_count_medium}</span>
            </div>
          </div>
        )}
      </aside>

      {/* Center - Diagnosis Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedReqId ? (
          <>
            {/* Diagnosis Dimensions */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text)' }}>
                诊断维度 — {selectedReqTitle}
              </h4>
              <div className="grid-3" style={{ gap: 8 }}>
                {diagnosisDimensions.map((dim) => (
                  <div
                    key={dim.label}
                    className="card"
                    style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <dim.icon size={16} style={{ color: 'var(--accent)' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                        {dim.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3, var(--text-secondary))' }}>
                        {dim.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              {messages.length === 0 && !isStreaming && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: 40,
                    color: 'var(--text3, var(--text-secondary))',
                  }}
                >
                  <Activity size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                  <p style={{ fontSize: 14 }}>选择需求后，开始 AI 健康诊断对话</p>
                  <p style={{ fontSize: 12 }}>
                    试试输入：&quot;请对这个需求进行全面的健康诊断&quot;
                  </p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: 12,
                  }}
                >
                  <div
                    className="card"
                    style={{
                      maxWidth: '70%',
                      padding: '10px 14px',
                      background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg2)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text)',
                      borderRadius:
                        msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      fontSize: 13,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isStreaming && streamingContent && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                  <div
                    className="card"
                    style={{
                      maxWidth: '70%',
                      padding: '10px 14px',
                      background: 'var(--bg2)',
                      borderRadius: '12px 12px 12px 2px',
                      fontSize: 13,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {streamingContent}
                    <span style={{ animation: 'pulse 1s infinite' }}>▊</span>
                  </div>
                </div>
              )}
              {isStreaming && !streamingContent && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                  <div
                    className="card"
                    style={{
                      padding: '10px 14px',
                      background: 'var(--bg2)',
                      borderRadius: '12px 12px 12px 2px',
                    }}
                  >
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 13,
                        color: 'var(--text3, var(--text-secondary))',
                      }}
                    >
                      AI 正在分析...
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: 8,
              }}
            >
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="输入诊断问题，如：请对这个需求进行健康诊断..."
                style={{
                  flex: 1,
                  resize: 'none',
                  height: 40,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg2)',
                  color: 'var(--text)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={sendMessage}
                disabled={isStreaming || !inputText.trim()}
                style={{ padding: '8px 16px' }}
              >
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text3, var(--text-secondary))' }}>
              <Activity size={64} style={{ opacity: 0.2, marginBottom: 16 }} />
              <p style={{ fontSize: 16 }}>请从左侧选择一个需求</p>
              <p style={{ fontSize: 13 }}>开始 AI 驱动的需求健康诊断</p>
            </div>
          </div>
        )}
      </main>

      {/* Right Panel */}
      <aside
        style={{
          width: 280,
          minWidth: 280,
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg1)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <h4 style={{ margin: 0, fontSize: 14, color: 'var(--text)' }}>快速操作</h4>
        {selectedReqId ? (
          <>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={completeDiagnosis}
            >
              <CheckCircle size={16} style={{ marginRight: 8 }} />
              完成诊断
            </button>
            <div className="card" style={{ padding: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text3, var(--text-secondary))',
                  marginBottom: 8,
                }}
              >
                诊断状态
              </div>
              <span
                className={`pill ${report?.status === 'completed' ? 'pill-green' : 'pill-amber'}`}
              >
                {report?.status === 'completed' ? '已完成' : '进行中'}
              </span>
            </div>
            {report?.summary && (
              <div className="card" style={{ padding: 12 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text3, var(--text-secondary))',
                    marginBottom: 8,
                  }}
                >
                  诊断摘要
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text)',
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {report.summary}
                </p>
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text3, var(--text-secondary))' }}>
            选择需求后显示操作面板
          </div>
        )}
      </aside>
    </div>
  );
}
