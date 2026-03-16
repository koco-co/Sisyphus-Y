'use client';

import { Loader2, Plus, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

type KnowledgeCategory =
  | 'enterprise_standard'
  | 'business_knowledge'
  | 'historical_cases'
  | 'tech_reference';

const CATEGORY_OPTIONS: { value: KnowledgeCategory; label: string }[] = [
  { value: 'enterprise_standard', label: '企业测试规范' },
  { value: 'business_knowledge', label: '业务领域知识' },
  { value: 'historical_cases', label: '历史用例' },
  { value: 'tech_reference', label: '技术参考' },
];

export interface ManualEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  title: string;
  category: KnowledgeCategory | '';
  content: string;
  tags: string;
}

const INITIAL_FORM: FormState = {
  title: '',
  category: '',
  content: '',
  tags: '',
};

export default function ManualEntryDialog({ open, onClose, onSuccess }: ManualEntryDialogProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const validate = useCallback((): boolean => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) nextErrors.title = '请输入标题';
    if (!form.category) nextErrors.category = '请选择分类';
    if (!form.content.trim()) nextErrors.content = '请输入内容';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/knowledge/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          category: form.category,
          content: form.content.trim(),
          tags,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? `提交失败 (${res.status})`);
      }

      toast.success('知识条目已添加');
      setForm(INITIAL_FORM);
      setErrors({});
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '添加失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }, [form, validate, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    setForm(INITIAL_FORM);
    setErrors({});
    onClose();
  }, [submitting, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="关闭手动添加对话框"
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] max-w-[92vw] bg-bg1 rounded-lg border border-border shadow-lg"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-accent" />
            <h3 className="text-[14px] font-semibold text-text">手动添加知识条目</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-text3 hover:text-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label
              htmlFor="manual-title"
              className="block text-[12px] font-medium text-text2 mb-1.5"
            >
              标题
              <span className="text-red ml-0.5">*</span>
            </label>
            <input
              id="manual-title"
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="输入条目标题"
              disabled={submitting}
              className="w-full px-3 py-2 text-[13px] bg-bg2 border border-border rounded-md text-text placeholder:text-text3 focus:outline-none focus:border-accent/60 disabled:opacity-50 transition-colors"
            />
            {errors.title && <p className="mt-1 text-[11px] text-red">{errors.title}</p>}
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="manual-category"
              className="block text-[12px] font-medium text-text2 mb-1.5"
            >
              分类
              <span className="text-red ml-0.5">*</span>
            </label>
            <select
              id="manual-category"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value as KnowledgeCategory | '')}
              disabled={submitting}
              className="w-full px-3 py-2 text-[13px] bg-bg2 border border-border rounded-md text-text focus:outline-none focus:border-accent/60 disabled:opacity-50 transition-colors appearance-none cursor-pointer"
            >
              <option value="" disabled>
                选择分类...
              </option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-[11px] text-red">{errors.category}</p>}
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="manual-content"
              className="block text-[12px] font-medium text-text2 mb-1.5"
            >
              内容
              <span className="text-red ml-0.5">*</span>
            </label>
            <textarea
              id="manual-content"
              value={form.content}
              onChange={(e) => updateField('content', e.target.value)}
              placeholder="输入知识条目内容..."
              rows={5}
              disabled={submitting}
              className="w-full px-3 py-2 text-[13px] bg-bg2 border border-border rounded-md text-text placeholder:text-text3 focus:outline-none focus:border-accent/60 disabled:opacity-50 transition-colors resize-none leading-relaxed"
              style={{ minHeight: 120 }}
            />
            {errors.content && <p className="mt-1 text-[11px] text-red">{errors.content}</p>}
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="manual-tags"
              className="block text-[12px] font-medium text-text2 mb-1.5"
            >
              标签
              <span className="text-[11px] text-text3 ml-1.5">（可选，用逗号分隔）</span>
            </label>
            <input
              id="manual-tags"
              type="text"
              value={form.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              placeholder="例：接口测试, 回归, smoke"
              disabled={submitting}
              className="w-full px-3 py-2 text-[13px] bg-bg2 border border-border rounded-md text-text placeholder:text-text3 focus:outline-none focus:border-accent/60 disabled:opacity-50 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 pb-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-3 py-1.5 rounded-md text-[12.5px] font-medium border border-border bg-bg2 text-text2 hover:bg-bg3 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-3 py-1.5 rounded-md text-[12.5px] font-medium bg-accent text-white hover:bg-accent2 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? '提交中...' : '添加条目'}
          </button>
        </div>
      </div>
    </>
  );
}
