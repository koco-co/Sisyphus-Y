"use client";

import React, { useState, useEffect } from "react";
import { ClipboardList, Search, Filter, ChevronLeft, ChevronRight, Plus, Trash2, Edit } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

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

export default function TestCasesPage() {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCases = async () => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    try {
      const res = await fetch(`${API}/testcases/?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCases(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchCases(); }, [page, statusFilter, priorityFilter]);

  const deleteCase = async (id: string) => {
    if (!confirm("确定删除？")) return;
    await fetch(`${API}/testcases/${id}`, { method: "DELETE" });
    fetchCases();
  };

  const filtered = searchTerm ? cases.filter((c) => c.title.includes(searchTerm) || c.case_id.includes(searchTerm)) : cases;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: "var(--text)" }}>
          <ClipboardList size={24} style={{ marginRight: 8, verticalAlign: "middle" }} />
          用例管理中心
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-secondary)" }} />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="搜索用例..." style={{ paddingLeft: 32, padding: "8px 12px 8px 32px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, outline: "none", width: 200 }} />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 13 }}>
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="active">有效</option>
            <option value="deprecated">废弃</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 13 }}>
            <option value="">全部优先级</option>
            <option value="P0">P0</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24, gap: 12 }}>
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>{total}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>总用例数</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#00d9a3" }}>{cases.filter((c) => c.status === "active").length}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>有效</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>{cases.filter((c) => c.source === "ai").length}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>AI 生成</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#8b5cf6" }}>{cases.filter((c) => c.source === "manual").length}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>手动创建</div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>用例编号</th>
              <th>标题</th>
              <th>优先级</th>
              <th>类型</th>
              <th>状态</th>
              <th>来源</th>
              <th>版本</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tc) => (
              <tr key={tc.id}>
                <td><span className="mono" style={{ fontSize: 12, color: "var(--accent)" }}>{tc.case_id}</span></td>
                <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tc.title}</td>
                <td><span className={`pill ${tc.priority === "P0" ? "pill-red" : tc.priority === "P1" ? "pill-amber" : "pill-green"}`}>{tc.priority}</span></td>
                <td><span className="pill">{tc.case_type}</span></td>
                <td><span className={`pill ${tc.status === "active" ? "pill-green" : tc.status === "draft" ? "pill-amber" : "pill-red"}`}>{tc.status}</span></td>
                <td>{tc.source === "ai" ? "🤖 AI" : "✏️ 手动"}</td>
                <td>v{tc.version}</td>
                <td>
                  <button onClick={() => deleteCase(tc.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--text-secondary)" }}>暂无用例数据</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button>
          <span style={{ padding: "8px 16px", fontSize: 13, color: "var(--text)" }}>第 {page} / {totalPages} 页</span>
          <button className="btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button>
        </div>
      )}
    </div>
  );
}
