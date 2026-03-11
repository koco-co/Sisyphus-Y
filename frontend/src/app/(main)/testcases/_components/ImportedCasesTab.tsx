'use client';

import { Archive, ChevronDown, ChevronRight, Database, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface ImportStep {
  no?: number;
  action: string;
  expected_result?: string;
  expected?: string;
}

interface ImportRawData {
  title?: string;
  steps?: ImportStep[];
  priority?: string;
  case_type?: string;
  module_path?: string;
  precondition?: string;
  original_raw?: Record<string, string>;
  [key: string]: unknown;
}

interface ImportRecord {
  id: string;
  job_id: string;
  row_number: number;
  original_title: string | null;
  mapped_title: string | null;
  raw_data: ImportRawData;
  status: string;
  match_score: number | null;
  created_at: string;
}

const PAGE_SIZE = 30;

function getModulePath(record: ImportRecord): string {
  const raw = record.raw_data;
  return (raw.module_path as string) || '未分类';
}

function getPriority(record: ImportRecord): string {
  const raw = record.raw_data;
  const p = raw.priority as string;
  return p || '—';
}

const priorityColors: Record<string, string> = {
  P0: 'text-sy-danger bg-sy-danger/10 border-sy-danger/30',
  P1: 'text-sy-warn bg-sy-warn/10 border-sy-warn/30',
  P2: 'text-sy-info bg-sy-info/10 border-sy-info/30',
  P3: 'text-sy-text-3 bg-sy-bg-3 border-sy-border',
};

function RawDataPanel({ data }: { data: ImportRawData }) {
  const originalRaw = data.original_raw as Record<string, string> | undefined;
  if (!originalRaw || Object.keys(originalRaw).length === 0) {
    return <p className="text-sy-text-3 text-[12px] italic">无原始数据</p>;
  }
  const skipKeys = ['_row_number', 'B', 'R', 'S'];
  const entries = Object.entries(originalRaw).filter(([k]) => !skipKeys.includes(k));
  return (
    <div className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k}>
          <div className="text-[10px] text-sy-text-3 font-mono mb-0.5">{k}</div>
          <div className="text-[12px] text-sy-text-2 bg-sy-bg-2 rounded px-2 py-1.5 whitespace-pre-wrap break-words leading-relaxed">
            {v || <span className="italic text-sy-text-3">（空）</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function CleanedDataPanel({ data }: { data: ImportRawData }) {
  const steps = data.steps || [];
  return (
    <div className="space-y-3">
      {data.precondition && (
        <div>
          <div className="text-[10px] text-sy-text-3 font-mono mb-0.5">前置条件</div>
          <div className="text-[12px] text-sy-text-2 bg-sy-bg-2 rounded px-2 py-1.5">
            {data.precondition as string}
          </div>
        </div>
      )}
      <div>
        <div className="text-[10px] text-sy-text-3 font-mono mb-1">测试步骤</div>
        {steps.length === 0 ? (
          <p className="text-sy-text-3 text-[12px] italic">无步骤数据</p>
        ) : (
          <div className="space-y-1.5">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-2">
                <span className="font-mono text-[10px] text-sy-accent mt-0.5 shrink-0">
                  {step.no ?? i + 1}.
                </span>
                <div className="flex-1">
                  <div className="text-[12px] text-sy-text">{step.action}</div>
                  {(step.expected_result || step.expected) && (
                    <div className="text-[11px] text-sy-text-3 mt-0.5">
                      → {step.expected_result || step.expected}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecordRow({
  record,
  expanded,
  onToggle,
}: {
  record: ImportRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const priority = getPriority(record);
  const module = getModulePath(record);
  return (
    <>
      <tr
        className="border-b border-sy-border hover:bg-sy-bg-2/50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-2.5 w-6">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-sy-accent" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-sy-text-3" />
          )}
        </td>
        <td className="px-2 py-2.5 max-w-xs">
          <div className="text-[13px] text-sy-text truncate">
            {record.original_title || '（无标题）'}
          </div>
          <div className="text-[11px] text-sy-text-3 font-mono truncate mt-0.5">{module}</div>
        </td>
        <td className="px-2 py-2.5 whitespace-nowrap">
          <span
            className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${priorityColors[priority] ?? 'text-sy-text-3 bg-sy-bg-3 border-sy-border'}`}
          >
            {priority}
          </span>
        </td>
        <td className="px-2 py-2.5 text-[11px] text-sy-text-3 whitespace-nowrap">
          {record.raw_data.case_type as string || '功能测试'}
        </td>
        <td className="px-2 py-2.5 whitespace-nowrap">
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border bg-sy-bg-3 border-sy-border text-sy-text-3">
            已导入
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-sy-bg-2/30">
          <td colSpan={5} className="px-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-[11px] font-mono text-sy-text-3 uppercase tracking-wider mb-2">
                  原始数据
                </div>
                <RawDataPanel data={record.raw_data} />
              </div>
              <div>
                <div className="text-[11px] font-mono text-sy-text-3 uppercase tracking-wider mb-2">
                  解析后数据
                </div>
                <CleanedDataPanel data={record.raw_data} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function ImportedCasesTab() {
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (search) params.set('search', search);

      const [countRes, listRes] = await Promise.all([
        api.get<{ total: number }>(`/import-clean/records/count?${params}`),
        api.get<ImportRecord[]>(`/import-clean/records/all?${params}`),
      ]);
      setTotal(countRes.total);
      setRecords(listRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-sy-bg-1 border border-sy-border rounded-md">
          <Database className="w-3.5 h-3.5 text-sy-accent" />
          <span className="text-[12px] text-sy-text-2">
            共 <span className="font-mono text-sy-accent font-semibold">{total.toLocaleString()}</span> 条历史用例
          </span>
        </div>
        <div className="flex-1" />
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sy-text-3" />
          <input
            type="text"
            placeholder="搜索用例标题..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearch(searchInput);
                setPage(0);
              }
            }}
            className="pl-8 pr-3 py-1.5 text-[12px] bg-sy-bg-2 border border-sy-border rounded-md text-sy-text placeholder:text-sy-text-3 focus:outline-none focus:border-sy-accent/50 w-56"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-sy-bg-1 border border-sy-border rounded-[10px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-sy-border bg-sy-bg-2/40">
              <th className="px-4 py-2 w-6" />
              <th className="px-2 py-2 text-left text-[11px] font-mono text-sy-text-3 uppercase tracking-wider">
                用例标题 / 模块
              </th>
              <th className="px-2 py-2 text-left text-[11px] font-mono text-sy-text-3 uppercase tracking-wider">
                优先级
              </th>
              <th className="px-2 py-2 text-left text-[11px] font-mono text-sy-text-3 uppercase tracking-wider">
                类型
              </th>
              <th className="px-2 py-2 text-left text-[11px] font-mono text-sy-text-3 uppercase tracking-wider">
                状态
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sy-text-3 text-[13px]">
                  加载中...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sy-text-3 text-[13px]">
                  暂无历史导入数据
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <RecordRow
                  key={r.id}
                  record={r}
                  expanded={expandedId === r.id}
                  onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-[12px] text-sy-text-3">
            第 {page + 1} / {totalPages} 页，共 {total.toLocaleString()} 条
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 text-[12px] border border-sy-border rounded-md text-sy-text-2 hover:bg-sy-bg-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 text-[12px] border border-sy-border rounded-md text-sy-text-2 hover:bg-sy-bg-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
