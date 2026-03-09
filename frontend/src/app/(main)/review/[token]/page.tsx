'use client';

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Loader2,
  MessageSquare,
  Shield,
  X,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CommentSection, type Comment } from '@/components/collaboration/CommentSection';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface ReviewTestPoint {
  id: string;
  group_name: string;
  title: string;
  description: string | null;
  priority: string;
  source: string;
  status: string;
  estimated_cases: number;
}

interface ReviewData {
  id: string;
  requirement_id: string;
  requirement_title: string;
  status: string;
  reviewer_name: string;
  test_points: ReviewTestPoint[];
  comments: Comment[];
  created_at: string;
}

type ReviewAction = 'approved' | 'rejected';

const sourceStyles: Record<string, string> = {
  document: 'pill-green',
  supplemented: 'pill-amber',
  missing: 'pill-red',
  pending: 'pill-gray',
};

const sourceLabels: Record<string, string> = {
  document: '已覆盖',
  supplemented: 'AI 补全',
  missing: '缺失',
  pending: '待确认',
};

const priorityStyles: Record<string, string> = {
  P0: 'pill-red',
  P1: 'pill-amber',
  P2: 'pill-blue',
  P3: 'pill-gray',
};

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    async function fetchReview() {
      try {
        const res = await fetch(`${API_BASE}/collaboration/reviews/${token}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('评审链接无效或已过期');
          throw new Error(`加载失败: ${res.status}`);
        }
        const review = await res.json();
        setData(review);
        const groups = new Set<string>(
          (review.test_points || []).map((tp: ReviewTestPoint) => tp.group_name || '未分组'),
        );
        setExpandedGroups(groups);
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }
    fetchReview();
  }, [token]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const handleSubmitReview = useCallback(
    async (action: ReviewAction) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const res = await fetch(`${API_BASE}/collaboration/reviews/${token}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, comment: reviewComment }),
        });
        if (!res.ok) throw new Error('提交失败');
        setSubmitted(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : '提交失败');
      } finally {
        setSubmitting(false);
      }
    },
    [token, reviewComment, submitting],
  );

  const handleCommentSubmit = useCallback(
    async (content: string) => {
      const res = await fetch(`${API_BASE}/collaboration/reviews/${token}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('评论提交失败');
      const newComment = await res.json();
      setData((prev) =>
        prev ? { ...prev, comments: [...prev.comments, newComment] } : prev,
      );
    },
    [token],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 49px)' }}>
        <Loader2 size={32} className="animate-spin text-sy-text-3" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3" style={{ height: 'calc(100vh - 49px)' }}>
        <AlertTriangle size={40} className="text-sy-danger opacity-50" />
        <p className="text-[14px] text-sy-text-2">{error || '加载失败'}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-3" style={{ height: 'calc(100vh - 49px)' }}>
        <Check size={40} className="text-sy-accent" />
        <p className="text-[16px] font-semibold text-sy-text">评审已提交</p>
        <p className="text-[13px] text-sy-text-3">感谢您的评审，结果已记录。</p>
      </div>
    );
  }

  const grouped: Record<string, ReviewTestPoint[]> = {};
  for (const tp of data.test_points) {
    const group = tp.group_name || '未分组';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(tp);
  }

  return (
    <div className="flex" style={{ height: 'calc(100vh - 49px)' }}>
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-sy-border bg-sy-bg-1">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-sy-accent" />
            <h1 className="text-[16px] font-display font-bold text-sy-text">
              测试点评审
            </h1>
            <span className="pill pill-blue text-[10px]">{data.status}</span>
          </div>
          <p className="text-[13px] text-sy-text-2">
            需求: {data.requirement_title}
          </p>
          <p className="text-[11px] text-sy-text-3 font-mono mt-0.5">
            评审人: {data.reviewer_name} · {new Date(data.created_at).toLocaleDateString('zh-CN')}
          </p>
        </div>

        {/* Test points */}
        <div className="p-4 space-y-2">
          {Object.entries(grouped).map(([group, points]) => {
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
                  <span className="text-[13px] font-semibold text-sy-text">
                    {group}
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-sy-text-3">
                    {points.length} 测试点
                  </span>
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-2 ml-6">
                    {points.map((tp) => (
                      <div
                        key={tp.id}
                        className="p-3 rounded-lg bg-sy-bg-2 border border-sy-border"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[12.5px] font-medium text-sy-text flex-1">
                            {tp.title}
                          </span>
                          <span className={`pill text-[10px] ${priorityStyles[tp.priority] || 'pill-gray'}`}>
                            {tp.priority}
                          </span>
                          <span className={`pill text-[10px] ${sourceStyles[tp.source] || 'pill-gray'}`}>
                            {sourceLabels[tp.source] || tp.source}
                          </span>
                        </div>
                        {tp.description && (
                          <p className="text-[11.5px] text-sy-text-3 leading-relaxed mt-1">
                            {tp.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-sy-text-3">
                          <span>预计用例: {tp.estimated_cases}</span>
                          <span>状态: {tp.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Review actions */}
        <div className="px-6 py-4 border-t border-sy-border bg-sy-bg-1 sticky bottom-0">
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="评审意见（可选）"
            rows={2}
            className="input w-full mb-3 resize-none text-[12.5px]"
            aria-label="评审意见"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSubmitReview('approved')}
              disabled={submitting}
              className="btn btn-primary flex-1"
              aria-label="通过评审"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              通过
            </button>
            <button
              type="button"
              onClick={() => handleSubmitReview('rejected')}
              disabled={submitting}
              className="btn btn-danger flex-1"
              aria-label="驳回评审"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <X size={14} />
              )}
              驳回
            </button>
          </div>
        </div>
      </div>

      {/* Right: Comments */}
      <div className="w-[320px] border-l border-sy-border bg-sy-bg-1 flex flex-col overflow-hidden">
        <CommentSection
          comments={data.comments}
          currentUser={data.reviewer_name}
          onSubmit={handleCommentSubmit}
          mentionableUsers={[data.reviewer_name]}
        />
      </div>
    </div>
  );
}
