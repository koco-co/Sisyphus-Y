'use client';

import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface DiscardedRecord {
  id: string;
  job_id: string;
  row_number: number;
  raw_data: Record<string, string>;
  mapped_data: Record<string, unknown> | null;
  status: string;
  match_score: number | null;
  created_at: string;
}

interface DiscardedRecordsModalProps {
  open: boolean;
  onClose: () => void;
}

function getTitle(record: DiscardedRecord): string {
  const md = record.mapped_data as Record<string, unknown> | null;
  if (md?.title) return String(md.title);
  if (record.raw_data?.用例标题) return record.raw_data.用例标题;
  return `行 ${record.row_number}`;
}

function getDiscardReason(record: DiscardedRecord): string {
  const score = record.match_score;
  if (score === null) return '未评分';
  if (score < 1.0) return `质量极差（评分 ${score.toFixed(1)}）`;
  if (score < 2.0) return `评分过低（${score.toFixed(1)} / 5.0），LLM 润色后仍不达标`;
  return `评分 ${score.toFixed(1)} / 5.0`;
}

export function DiscardedRecordsModal({ open, onClose }: DiscardedRecordsModalProps) {
  const [records, setRecords] = useState<DiscardedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<DiscardedRecord[]>('/import-clean/discarded?limit=200');
      setRecords(data ?? []);
    } catch (e) {
      console.error('Failed to fetch discarded records:', e);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchRecords();
    }
  }, [open, fetchRecords]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 cursor-default"
        onClick={onClose}
        aria-label="关闭丢弃记录"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
        <div className="bg-sy-bg-1 border border-sy-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col pointer-events-auto">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-sy-border shrink-0">
            <AlertTriangle className="w-4 h-4 text-sy-danger" />
            <span className="text-[14px] font-semibold text-sy-text">丢弃记录</span>
            <span className="text-[12px] text-sy-text-3">
              （评分低于 2.0 的历史用例，已排除于主列表之外）
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="text-sy-text-3 hover:text-sy-text transition-colors p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-sy-text-3 text-[13px]">
                <Loader2 className="w-4 h-4 animate-spin" />
                加载中...
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-sy-text-3">
                <AlertTriangle className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-[13px]">暂无丢弃记录</p>
              </div>
            ) : (
              <div className="divide-y divide-sy-border/50">
                {/* Stats bar */}
                <div className="px-5 py-2.5 bg-sy-danger/5 border-b border-sy-danger/20">
                  <span className="text-[12px] text-sy-danger/80 font-mono">
                    共 {records.length} 条记录被丢弃
                  </span>
                </div>

                {records.map((record) => (
                  <div key={record.id} className="px-5 py-3">
                    <button
                      type="button"
                      className="flex items-start gap-3 w-full text-left cursor-pointer"
                      onClick={() => setExpanded(expanded === record.id ? null : record.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-sy-text-2 truncate">
                          {getTitle(record)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-sy-danger font-mono">
                            {getDiscardReason(record)}
                          </span>
                          <span className="text-[11px] text-sy-text-3">
                            {new Date(record.created_at).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                      </div>
                      <span className="text-sy-text-3 text-[11px] mt-0.5">
                        {expanded === record.id ? '收起' : '展开'}
                      </span>
                    </button>

                    {expanded === record.id && (
                      <div className="mt-3 pl-0 space-y-2">
                        {Object.entries(record.raw_data)
                          .filter(([, v]) => v)
                          .slice(0, 5)
                          .map(([k, v]) => (
                            <div key={k}>
                              <div className="text-[10px] text-sy-text-3 font-mono mb-0.5">{k}</div>
                              <div className="text-[12px] text-sy-text-2 bg-sy-bg-2 rounded px-2.5 py-1.5 whitespace-pre-wrap line-clamp-3">
                                {v}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
