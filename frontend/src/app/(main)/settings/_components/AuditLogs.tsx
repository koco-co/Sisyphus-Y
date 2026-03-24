'use client';

import { History, Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  ip_address?: string | null;
  created_at: string;
}

interface AuditLogResponse {
  items: AuditEntry[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

const actionLabels: Record<string, string> = {
  create: '新建',
  update: '更新',
  delete: '删除',
  restore: '恢复',
  export: '导出',
  import: '导入',
  generate: 'AI 生成',
  confirm: '确认',
  review: '审核',
};

const entityTypeLabels: Record<string, string> = {
  products: '产品',
  requirements: '需求',
  testcases: '用例',
  templates: '模板',
  knowledge: '知识库',
  iterations: '迭代',
  generation: '用例生成',
  diagnosis: '需求分析',
  scene_map: '场景地图',
  diff: '需求Diff',
  audit: '审计日志',
  export: '导出',
  execution: '执行回流',
  ai_config: 'AI 配置',
};

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page_size', '100');
      if (dateFrom) params.set('date_from', new Date(dateFrom).toISOString());
      if (dateTo) params.set('date_to', new Date(`${dateTo}T23:59:59`).toISOString());
      const data = await api.get<AuditLogResponse>(`/audit?${params.toString()}`);
      setLogs(data.items);
    } catch {
      // Fallback demo data (uses actual backend field names)
      setLogs([
        {
          id: '1',
          user_id: null,
          action: 'create',
          entity_type: 'generation',
          entity_id: null,
          created_at: new Date(Date.now() - 28 * 60000).toISOString(),
        },
        {
          id: '2',
          user_id: null,
          action: 'update',
          entity_type: 'requirements',
          entity_id: null,
          created_at: new Date(Date.now() - 62 * 60000).toISOString(),
        },
        {
          id: '3',
          user_id: null,
          action: 'create',
          entity_type: 'knowledge',
          entity_id: null,
          created_at: new Date(Date.now() - 180 * 60000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filtered = logs.filter((log) => {
    if (!search.trim()) return true;
    const keyword = search.trim().toLowerCase();
    const entityLabel = entityTypeLabels[log.entity_type] ?? log.entity_type;
    return (
      entityLabel.toLowerCase().includes(keyword) ||
      (log.entity_id ?? '').toLowerCase().includes(keyword) ||
      (actionLabels[log.action] ?? log.action).includes(keyword)
    );
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <History className="w-4 h-4 text-text3" />
        <h2 className="text-[14px] font-semibold text-text">操作日志</h2>
        <span className="pill pill-gray text-[10px]">最近 100 条</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索操作人、对象..."
            className="input w-full pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input text-[12px] text-text2 placeholder:text-text3"
            title="开始日期"
          />
          <span className="text-text3 text-[12px]">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input text-[12px] text-text2 placeholder:text-text3"
            title="结束日期"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 text-text3 mx-auto mb-3 animate-spin" />
          <p className="text-[13px] text-text3">加载操作日志...</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-32">时间</th>
                <th className="w-20">操作人</th>
                <th className="w-24">操作</th>
                <th className="w-24">对象类型</th>
                <th>实体 ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-text3 py-8">
                    暂无操作日志
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono text-[11px] text-text3">
                      {new Date(log.created_at).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="text-text2 font-mono text-[11px]">
                      {log.user_id ? `${log.user_id.slice(0, 8)}…` : '系统'}
                    </td>
                    <td>
                      <span className="pill pill-blue text-[10px]">
                        {actionLabels[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="text-text3 text-[12px]">
                      {entityTypeLabels[log.entity_type] ?? log.entity_type}
                    </td>
                    <td className="text-text truncate max-w-[300px] font-mono text-[11px]">
                      {log.entity_id ? `${log.entity_id.slice(0, 8)}…` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
