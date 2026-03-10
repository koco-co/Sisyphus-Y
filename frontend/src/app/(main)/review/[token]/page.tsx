'use client';

import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock3,
  Eye,
  GitBranch,
  Loader2,
  Shield,
  UserRound,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  collaborationApi,
  type ReviewDecisionRecord,
  type SharedReviewPayload,
  type TestPoint,
} from '@/lib/api';

const sourceStyles: Record<string, string> = {
  document: 'pill-green',
  supplemented: 'pill-amber',
  missing: 'pill-red',
  pending: 'pill-gray',
  user_added: 'pill-blue',
};

const sourceLabels: Record<string, string> = {
  document: '已覆盖',
  supplemented: 'AI 补全',
  missing: '缺失',
  pending: '待确认',
  user_added: '人工补充',
};

const priorityStyles: Record<string, string> = {
  P0: 'pill-red',
  P1: 'pill-amber',
  P2: 'pill-blue',
  P3: 'pill-gray',
};

const reviewStatusLabels: Record<string, string> = {
  pending: '待评审',
  in_progress: '评审中',
  approved: '已通过',
  rejected: '已驳回',
  completed: '已完成',
};

const pointStatusLabels: Record<string, string> = {
  ai_generated: '待确认',
  confirmed: '已确认',
  ignored: '已忽略',
};

const decisionLabels: Record<string, string> = {
  approved: '通过',
  rejected: '驳回',
  request_changes: '需修改',
};

const decisionStyles: Record<string, string> = {
  approved: 'pill-green',
  rejected: 'pill-red',
  request_changes: 'pill-amber',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSourceLabel(source: string): string {
  if (source === 'ai') {
    return 'AI 生成';
  }
  if (source === 'manual') {
    return '人工补充';
  }
  return sourceLabels[source] || source;
}

function getSourceStyle(source: string): string {
  if (source === 'ai') {
    return sourceStyles.supplemented;
  }
  if (source === 'manual') {
    return sourceStyles.user_added;
  }
  return sourceStyles[source] || 'pill-gray';
}

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedReviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchReview() {
      setLoading(true);
      setError(null);
      try {
        const review = await collaborationApi.getSharedReview(token);
        setData(review);
        const groups = new Set<string>(
          (review.entity_snapshot?.test_points || []).map((tp) => tp.group_name || '未分组'),
        );
        setExpandedGroups(groups);
      } catch (e) {
        const message = e instanceof Error ? e.message : '加载失败';
        if (message.includes('404')) {
          setError('评审链接无效或已过期');
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    }

    void fetchReview();
  }, [token]);

  const groupedPoints = useMemo(() => {
    const grouped: Record<string, TestPoint[]> = {};
    for (const point of data?.entity_snapshot?.test_points || []) {
      const group = point.group_name || '未分组';
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(point);
    }
    return grouped;
  }, [data]);

  const decisionSummary = useMemo(() => {
    const counts = { approved: 0, rejected: 0, request_changes: 0 };
    for (const decision of data?.decisions || []) {
      if (decision.decision in counts) {
        counts[decision.decision as keyof typeof counts] += 1;
      }
    }
    return counts;
  }, [data]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 49px)' }}>
        <Loader2 size={32} className="animate-spin text-sy-text-3" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3"
        style={{ height: 'calc(100vh - 49px)' }}
      >
        <AlertTriangle size={40} className="text-sy-danger opacity-50" />
        <p className="text-[14px] text-sy-text-2">{error || '加载失败'}</p>
      </div>
    );
  }

  const requirementTitle = data.entity_snapshot?.requirement_title || data.review.title;
  const reviewerNames = data.entity_snapshot?.reviewer_names || data.review.reviewer_ids || [];

  return (
    <div className="flex" style={{ height: 'calc(100vh - 49px)' }}>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 border-b border-sy-border bg-sy-bg-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Shield size={16} className="text-sy-accent" />
            <h1 className="text-[16px] font-display font-bold text-sy-text">测试点评审共享视图</h1>
            <span className="pill pill-blue text-[10px]">
              {reviewStatusLabels[data.review.status] || data.review.status}
            </span>
            <span className="pill pill-gray text-[10px] inline-flex items-center gap-1">
              <Eye size={11} />
              只读链接
            </span>
          </div>
          <p className="text-[13px] text-sy-text-2">{requirementTitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-sy-text-3 font-mono">
            <span>评审标题: {data.review.title}</span>
            {data.entity_snapshot?.req_id ? (
              <span>需求编号: {data.entity_snapshot.req_id}</span>
            ) : null}
            <span>创建时间: {formatDate(data.review.created_at)}</span>
          </div>
          {data.review.description ? (
            <p className="mt-3 text-[12px] leading-relaxed text-sy-text-2">
              {data.review.description}
            </p>
          ) : null}
        </div>

        <div className="p-4 space-y-2">
          {Object.keys(groupedPoints).length === 0 ? (
            <div className="card py-10 text-center">
              <GitBranch className="mx-auto mb-3 text-sy-text-3 opacity-40" size={24} />
              <p className="text-[13px] text-sy-text-2">当前共享评审没有可展示的测试点快照</p>
            </div>
          ) : (
            Object.entries(groupedPoints).map(([group, points]) => {
              const isExpanded = expandedGroups.has(group);
              return (
                <div key={group} className="card">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className="flex items-center gap-2 w-full text-left"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-sy-text-3" />
                    ) : (
                      <ChevronRight size={14} className="text-sy-text-3" />
                    )}
                    <GitBranch size={13} className="text-sy-accent" />
                    <span className="text-[13px] font-semibold text-sy-text">{group}</span>
                    <span className="ml-auto font-mono text-[11px] text-sy-text-3">
                      {points.length} 测试点
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="mt-3 space-y-2 ml-6">
                      {points.map((point) => (
                        <div
                          key={point.id}
                          className="p-3 rounded-lg bg-sy-bg-2 border border-sy-border"
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-[12.5px] font-medium text-sy-text flex-1">
                              {point.title}
                            </span>
                            <span
                              className={`pill text-[10px] ${priorityStyles[point.priority] || 'pill-gray'}`}
                            >
                              {point.priority}
                            </span>
                            <span className={`pill text-[10px] ${getSourceStyle(point.source)}`}>
                              {getSourceLabel(point.source)}
                            </span>
                          </div>
                          {point.description ? (
                            <p className="text-[11.5px] text-sy-text-3 leading-relaxed mt-1">
                              {point.description}
                            </p>
                          ) : null}
                          <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-sy-text-3">
                            <span>预计用例: {point.estimated_cases}</span>
                            <span>状态: {pointStatusLabels[point.status] || point.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      <aside className="w-[320px] border-l border-sy-border bg-sy-bg-1 overflow-y-auto">
        <div className="p-4 border-b border-sy-border">
          <h2 className="text-[13px] font-semibold text-sy-text">评审概览</h2>
          <p className="mt-2 text-[12px] text-sy-text-3 leading-relaxed">
            该共享链接仅用于查看评审快照与已提交结论；若需提交意见，请在平台内登录后处理。
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div className="card space-y-3">
            <div className="flex items-center gap-2 text-[12px] text-sy-text-2">
              <UserRound size={14} className="text-sy-accent" />
              <span>评审人</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {reviewerNames.map((name: string) => (
                <span key={name} className="pill pill-gray text-[10px]">
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div className="card space-y-3">
            <div className="flex items-center gap-2 text-[12px] text-sy-text-2">
              <Clock3 size={14} className="text-sy-accent" />
              <span>决策统计</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-sy-border bg-sy-bg-2 px-2 py-3">
                <div className="text-[16px] font-semibold text-sy-accent">
                  {decisionSummary.approved}
                </div>
                <div className="text-[10px] text-sy-text-3">通过</div>
              </div>
              <div className="rounded-lg border border-sy-border bg-sy-bg-2 px-2 py-3">
                <div className="text-[16px] font-semibold text-sy-danger">
                  {decisionSummary.rejected}
                </div>
                <div className="text-[10px] text-sy-text-3">驳回</div>
              </div>
              <div className="rounded-lg border border-sy-border bg-sy-bg-2 px-2 py-3">
                <div className="text-[16px] font-semibold text-sy-warn">
                  {decisionSummary.request_changes}
                </div>
                <div className="text-[10px] text-sy-text-3">需修改</div>
              </div>
            </div>
          </div>

          <div className="card space-y-3">
            <div className="text-[12px] text-sy-text-2">已提交结论</div>
            {data.decisions.length === 0 ? (
              <p className="text-[12px] text-sy-text-3">暂无已提交的评审结论</p>
            ) : (
              <div className="space-y-2">
                {data.decisions.map((decision: ReviewDecisionRecord) => (
                  <div
                    key={decision.id}
                    className="rounded-lg border border-sy-border bg-sy-bg-2 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`pill text-[10px] ${decisionStyles[decision.decision] || 'pill-gray'}`}
                      >
                        {decisionLabels[decision.decision] || decision.decision}
                      </span>
                      <span className="text-[10px] font-mono text-sy-text-3">
                        {formatDate(decision.created_at)}
                      </span>
                    </div>
                    {decision.comment ? (
                      <p className="text-[12px] leading-relaxed text-sy-text-2">
                        {decision.comment}
                      </p>
                    ) : (
                      <p className="text-[12px] text-sy-text-3">未填写评审意见</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
