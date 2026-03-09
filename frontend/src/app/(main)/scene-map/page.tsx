"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  FolderOpen,
  IterationCw,
  Map,
  Plus,
  Trash2,
  Check,
  CheckCircle,
  Loader2,
  Sparkles,
  GitBranch,
  Circle,
  ArrowRight,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface Product { id: string; name: string; }
interface Iteration { id: string; name: string; }
interface Requirement { id: string; req_id: string; title: string; }

interface TestPoint {
  id: string;
  group_name: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  estimated_cases: number;
  source: string;
}

export default function SceneMapPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [iterations, setIterations] = useState<Record<string, Iteration[]>>({});
  const [expandedIterations, setExpandedIterations] = useState<Set<string>>(new Set());
  const [requirements, setRequirements] = useState<Record<string, Requirement[]>>({});

  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [selectedReqTitle, setSelectedReqTitle] = useState("");
  const [testPoints, setTestPoints] = useState<TestPoint[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamOutput, setStreamOutput] = useState("");
  const [currentStep, setCurrentStep] = useState(0);

  // Load products
  useEffect(() => {
    fetch(`${API}/products/`)
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : data.items || []))
      .catch(console.error);
  }, []);

  const toggleProduct = async (productId: string) => {
    const next = new Set(expandedProducts);
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
      if (!iterations[productId]) {
        const res = await fetch(`${API}/products/${productId}/iterations`);
        const data = await res.json();
        setIterations((prev) => ({ ...prev, [productId]: Array.isArray(data) ? data : data.items || [] }));
      }
    }
    setExpandedProducts(next);
  };

  const toggleIteration = async (productId: string, iterationId: string) => {
    const next = new Set(expandedIterations);
    if (next.has(iterationId)) {
      next.delete(iterationId);
    } else {
      next.add(iterationId);
      if (!requirements[iterationId]) {
        const res = await fetch(`${API}/products/${productId}/iterations/${iterationId}/requirements`);
        const data = await res.json();
        setRequirements((prev) => ({ ...prev, [iterationId]: Array.isArray(data) ? data : data.items || [] }));
      }
    }
    setExpandedIterations(next);
  };

  const selectRequirement = async (req: Requirement) => {
    setSelectedReqId(req.id);
    setSelectedReqTitle(req.title || req.req_id);
    setStreamOutput("");
    setCurrentStep(0);

    try {
      const res = await fetch(`${API}/scene-map/${req.id}/test-points`);
      if (res.ok) {
        const data = await res.json();
        setTestPoints(Array.isArray(data) ? data : []);
        if (data.length > 0) setCurrentStep(3);
      }
    } catch (e) {
      console.error(e);
      setTestPoints([]);
    }
  };

  // Generate test points via SSE
  const generateTestPoints = async () => {
    if (!selectedReqId || isGenerating) return;
    setIsGenerating(true);
    setStreamOutput("");
    setCurrentStep(1);

    try {
      const res = await fetch(`${API}/scene-map/${selectedReqId}/generate`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullOutput = "";

      setCurrentStep(2);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.delta) {
                fullOutput += data.delta;
                setStreamOutput(fullOutput);
              }
            } catch {
              const text = line.slice(6);
              if (text && text !== "[DONE]") {
                fullOutput += text;
                setStreamOutput(fullOutput);
              }
            }
          }
        }
      }

      setCurrentStep(3);

      // Reload test points after generation
      const tpRes = await fetch(`${API}/scene-map/${selectedReqId}/test-points`);
      if (tpRes.ok) {
        const tpData = await tpRes.json();
        setTestPoints(Array.isArray(tpData) ? tpData : []);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("Generation error:", e);
      setStreamOutput(`生成失败: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Confirm test point
  const confirmPoint = async (pointId: string) => {
    try {
      await fetch(`${API}/scene-map/test-points/${pointId}/confirm`, { method: "POST" });
      setTestPoints((prev) =>
        prev.map((tp) => (tp.id === pointId ? { ...tp, status: "confirmed" } : tp))
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Confirm all
  const confirmAll = async () => {
    if (!selectedReqId) return;
    try {
      await fetch(`${API}/scene-map/${selectedReqId}/confirm`, { method: "POST" });
      setTestPoints((prev) => prev.map((tp) => ({ ...tp, status: "confirmed" })));
      setCurrentStep(4);
    } catch (e) {
      console.error(e);
    }
  };

  // Delete test point
  const deletePoint = async (pointId: string) => {
    try {
      await fetch(`${API}/scene-map/test-points/${pointId}`, { method: "DELETE" });
      setTestPoints((prev) => prev.filter((tp) => tp.id !== pointId));
    } catch (e) {
      console.error(e);
    }
  };

  // Group test points
  const groupedPoints: Record<string, TestPoint[]> = {};
  for (const tp of testPoints) {
    const group = tp.group_name || "未分组";
    if (!groupedPoints[group]) groupedPoints[group] = [];
    groupedPoints[group].push(tp);
  }

  const confirmedCount = testPoints.filter((tp) => tp.status === "confirmed").length;

  const steps = ["需求解析", "测试点提取", "场景分组", "确认完成"];

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", gap: 0 }}>
      {/* Left Column */}
      <aside style={{ width: 260, minWidth: 260, borderRight: "1px solid var(--border)", background: "var(--bg1)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
            <Map size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
            场景地图
          </h3>
        </div>

        {/* Tree */}
        <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
          {products.map((product) => (
            <div key={product.id}>
              <div onClick={() => toggleProduct(product.id)} className="card-hover" style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, borderRadius: 6, fontSize: 13, color: "var(--text)" }}>
                {expandedProducts.has(product.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <FolderOpen size={14} style={{ color: "var(--accent)" }} />
                {product.name}
              </div>
              {expandedProducts.has(product.id) && (iterations[product.id] || []).map((iter) => (
                <div key={iter.id} style={{ paddingLeft: 20 }}>
                  <div onClick={() => toggleIteration(product.id, iter.id)} className="card-hover" style={{ padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, borderRadius: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                    {expandedIterations.has(iter.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <IterationCw size={12} />
                    {iter.name}
                  </div>
                  {expandedIterations.has(iter.id) && (requirements[iter.id] || []).map((req) => (
                    <div key={req.id} onClick={() => selectRequirement(req)} className="card-hover" style={{ padding: "6px 12px", marginLeft: 20, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, borderRadius: 6, fontSize: 12, background: selectedReqId === req.id ? "var(--accent-alpha)" : undefined, color: selectedReqId === req.id ? "var(--accent)" : "var(--text-secondary)" }}>
                      <FileText size={12} />
                      {req.title || req.req_id}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Test Points List */}
        {selectedReqId && testPoints.length > 0 && (
          <div style={{ borderTop: "1px solid var(--border)", maxHeight: "40%", overflow: "auto", padding: 8 }}>
            <div style={{ padding: "8px", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
              <span>测试点 ({testPoints.length})</span>
              <span style={{ color: "var(--accent)" }}>{confirmedCount} 已确认</span>
            </div>
            {testPoints.map((tp) => (
              <div key={tp.id} className="card" style={{ padding: "8px 10px", marginBottom: 4, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tp.title}</span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span className={`pill ${tp.priority === "P0" ? "pill-red" : tp.priority === "P1" ? "pill-amber" : "pill-green"}`} style={{ fontSize: 10 }}>{tp.priority}</span>
                    {tp.status === "confirmed" ? (
                      <CheckCircle size={14} style={{ color: "var(--accent)" }} />
                    ) : (
                      <button onClick={() => confirmPoint(tp.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        <Circle size={14} style={{ color: "var(--text-secondary)" }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Center Column - Generation */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedReqId ? (
          <>
            {/* Progress Steps */}
            <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {steps.map((step, i) => (
                  <React.Fragment key={step}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, background: i < currentStep ? "var(--accent)" : i === currentStep ? "var(--accent-alpha)" : "var(--bg2)", color: i < currentStep ? "#fff" : i === currentStep ? "var(--accent)" : "var(--text-secondary)", fontSize: 12, fontWeight: 500, transition: "all 0.3s" }}>
                      {i < currentStep ? <Check size={12} /> : <span style={{ width: 16, textAlign: "center" }}>{i + 1}</span>}
                      {step}
                    </div>
                    {i < steps.length - 1 && <ArrowRight size={14} style={{ color: "var(--text-secondary)", opacity: 0.4 }} />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: "16px", display: "flex", gap: 8 }}>
              <button className="btn btn-primary" onClick={generateTestPoints} disabled={isGenerating}>
                {isGenerating ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} /> : <Sparkles size={16} style={{ marginRight: 8 }} />}
                {isGenerating ? "生成中..." : "AI 生成测试点"}
              </button>
              {testPoints.length > 0 && confirmedCount < testPoints.length && (
                <button className="btn" style={{ border: "1px solid var(--accent)", color: "var(--accent)" }} onClick={confirmAll}>
                  <CheckCircle size={16} style={{ marginRight: 8 }} />
                  全部确认 ({testPoints.length - confirmedCount} 待确认)
                </button>
              )}
            </div>

            {/* Stream Output / Test Points Display */}
            <div style={{ flex: 1, overflow: "auto", padding: "0 16px 16px" }}>
              {streamOutput && (
                <div className="card" style={{ padding: 16, marginBottom: 16, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--text)", fontFamily: "var(--font-mono)" }}>
                  {streamOutput}
                  {isGenerating && <span style={{ animation: "pulse 1s infinite" }}>▊</span>}
                </div>
              )}

              {!streamOutput && testPoints.length === 0 && !isGenerating && (
                <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>
                  <Sparkles size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                  <p style={{ fontSize: 14 }}>点击"AI 生成测试点"开始分析</p>
                  <p style={{ fontSize: 12 }}>AI 将解析需求文档，提取测试场景与测试点</p>
                </div>
              )}

              {testPoints.length > 0 && (
                <div>
                  {Object.entries(groupedPoints).map(([group, points]) => (
                    <div key={group} style={{ marginBottom: 16 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
                        <GitBranch size={14} />
                        {group}
                        <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 400 }}>({points.length} 个测试点)</span>
                      </h4>
                      <div style={{ display: "grid", gap: 8 }}>
                        {points.map((tp) => (
                          <div key={tp.id} className="card card-hover" style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>{tp.title}</div>
                                {tp.description && <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{tp.description}</div>}
                              </div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 12 }}>
                                <span className={`pill ${tp.priority === "P0" ? "pill-red" : tp.priority === "P1" ? "pill-amber" : "pill-green"}`}>{tp.priority}</span>
                                <span className={`pill ${tp.status === "confirmed" ? "pill-green" : "pill-amber"}`}>{tp.status === "confirmed" ? "已确认" : "待确认"}</span>
                                {tp.status !== "confirmed" && (
                                  <button onClick={() => confirmPoint(tp.id)} className="btn" style={{ padding: "2px 8px", fontSize: 11 }}>
                                    <Check size={12} /> 确认
                                  </button>
                                )}
                                <button onClick={() => deletePoint(tp.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-secondary)" }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
              <Map size={64} style={{ opacity: 0.2, marginBottom: 16 }} />
              <p style={{ fontSize: 16 }}>请从左侧选择一个需求</p>
              <p style={{ fontSize: 13 }}>查看或生成测试场景地图</p>
            </div>
          </div>
        )}
      </main>

      {/* Right Column - Scene Map Tree */}
      <aside style={{ width: 280, minWidth: 280, borderLeft: "1px solid var(--border)", background: "var(--bg1)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
          <h4 style={{ margin: 0, fontSize: 14, color: "var(--text)" }}>
            <GitBranch size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
            场景树
          </h4>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
          {Object.keys(groupedPoints).length > 0 ? (
            Object.entries(groupedPoints).map(([group, points]) => (
              <div key={group} style={{ marginBottom: 12 }}>
                <div style={{ padding: "6px 10px", background: "var(--bg2)", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 4 }}>
                  {group}
                </div>
                {points.map((tp) => (
                  <div key={tp.id} style={{ padding: "4px 10px 4px 24px", fontSize: 11, color: tp.status === "confirmed" ? "var(--accent)" : "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4, borderLeft: "2px solid var(--border)", marginLeft: 8 }}>
                    {tp.status === "confirmed" ? <CheckCircle size={10} /> : <Circle size={10} />}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tp.title}</span>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: 24, color: "var(--text-secondary)", fontSize: 12 }}>
              暂无测试点数据
            </div>
          )}
        </div>

        {/* Stats */}
        {testPoints.length > 0 && (
          <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
            <div className="grid-3" style={{ gap: 4, textAlign: "center" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{testPoints.length}</div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>总计</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#00d9a3" }}>{confirmedCount}</div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>已确认</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>{testPoints.length - confirmedCount}</div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>待确认</div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
