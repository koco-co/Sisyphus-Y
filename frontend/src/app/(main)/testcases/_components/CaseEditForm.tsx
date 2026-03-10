'use client';

import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { TestCaseDetail, TestCaseStep } from './types';

interface CaseEditFormProps {
  testCase: TestCaseDetail | null;
  open: boolean;
  onSave: (data: {
    title: string;
    priority: string;
    status: string;
    case_type: string;
    precondition: string | null;
    steps: TestCaseStep[];
  }) => void;
  onCancel: () => void;
}

const priorityOptions = ['P0', 'P1', 'P2', 'P3'];
const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'review', label: '待审' },
  { value: 'approved', label: '通过' },
  { value: 'rejected', label: '驳回' },
  { value: 'deprecated', label: '废弃' },
];
const typeOptions = [
  { value: 'functional', label: '功能' },
  { value: 'normal', label: '功能（旧数据）' },
  { value: 'boundary', label: '边界' },
  { value: 'exception', label: '异常' },
  { value: 'performance', label: '性能' },
  { value: 'security', label: '安全' },
  { value: 'compatibility', label: '兼容' },
];

export function CaseEditForm({ testCase, open, onSave, onCancel }: CaseEditFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('P2');
  const [status, setStatus] = useState('draft');
  const [caseType, setCaseType] = useState('functional');
  const [precondition, setPrecondition] = useState('');
  const [steps, setSteps] = useState<TestCaseStep[]>([]);
  const [saving, setSaving] = useState(false);

  // Sync form state when testCase changes
  useEffect(() => {
    if (testCase) {
      setTitle(testCase.title);
      setPriority(testCase.priority);
      setStatus(testCase.status);
      setCaseType(testCase.case_type);
      setPrecondition(testCase.precondition ?? '');
      setSteps(testCase.steps.map((s) => ({ ...s })));
    }
  }, [testCase]);

  // Manage dialog open/close
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  const handleAddStep = () => {
    setSteps((prev) => [...prev, { no: prev.length + 1, action: '', expected_result: '' }]);
  };

  const handleRemoveStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, no: i + 1 })));
  };

  const handleMoveStep = (idx: number, dir: 'up' | 'down') => {
    setSteps((prev) => {
      const arr = [...prev];
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= arr.length) return prev;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr.map((s, i) => ({ ...s, no: i + 1 }));
    });
  };

  const handleStepChange = (idx: number, field: 'action' | 'expected_result', value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        priority,
        status,
        case_type: caseType,
        precondition: precondition.trim() || null,
        steps,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputClass =
    'w-full px-3 py-2 text-[12.5px] bg-bg2 border border-border rounded-md text-text placeholder:text-text3 outline-none focus:border-accent transition-colors';
  const labelClass = 'block text-[11.5px] font-semibold text-text3 uppercase tracking-wider mb-1.5';
  const titleId = 'testcase-edit-title';
  const priorityId = 'testcase-edit-priority';
  const statusId = 'testcase-edit-status';
  const caseTypeId = 'testcase-edit-type';
  const preconditionId = 'testcase-edit-precondition';

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-[640px] max-w-[90vw] max-h-[85vh] rounded-xl border border-border bg-bg1 p-0 shadow-[var(--shadow-lg)] backdrop:bg-black/50"
      onClose={onCancel}
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-[15px] font-semibold text-text">
            {testCase ? '编辑用例' : '新建用例'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-md text-text3 hover:text-text hover:bg-bg2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className={labelClass} htmlFor={titleId}>
              用例标题
            </label>
            <input
              id={titleId}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入用例标题..."
              className={inputClass}
            />
          </div>

          {/* Row: Priority + Status + Type */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass} htmlFor={priorityId}>
                优先级
              </label>
              <select
                id={priorityId}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={inputClass}
              >
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor={statusId}>
                状态
              </label>
              <select
                id={statusId}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputClass}
              >
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor={caseTypeId}>
                类型
              </label>
              <select
                id={caseTypeId}
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className={inputClass}
              >
                {typeOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Precondition */}
          <div>
            <label className={labelClass} htmlFor={preconditionId}>
              前置条件
            </label>
            <textarea
              id={preconditionId}
              value={precondition}
              onChange={(e) => setPrecondition(e.target.value)}
              placeholder="测试执行前需要满足的条件..."
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className={labelClass}>测试步骤 ({steps.length})</p>
              <button
                type="button"
                onClick={handleAddStep}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-accent hover:bg-accent/10 transition-colors"
              >
                <Plus className="w-3 h-3" />
                添加步骤
              </button>
            </div>

            {steps.length === 0 ? (
              <p className="text-[12px] text-text3 italic py-4 text-center">
                暂无步骤，点击上方按钮添加
              </p>
            ) : (
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div
                    key={step.no}
                    className="flex gap-2 p-3 rounded-lg bg-bg2 border border-border/60"
                  >
                    {/* Step number */}
                    <span className="font-mono text-[11px] text-text3 mt-2 w-4 text-right shrink-0">
                      {step.no}.
                    </span>

                    {/* Step fields */}
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="text"
                        value={step.action}
                        onChange={(e) => handleStepChange(idx, 'action', e.target.value)}
                        placeholder="操作步骤..."
                        className="w-full px-2.5 py-1.5 text-[12px] bg-bg1 border border-border rounded text-text placeholder:text-text3 outline-none focus:border-accent transition-colors"
                      />
                      <input
                        type="text"
                        value={step.expected_result}
                        onChange={(e) => handleStepChange(idx, 'expected_result', e.target.value)}
                        placeholder="预期结果..."
                        className="w-full px-2.5 py-1.5 text-[12px] bg-bg1 border border-border rounded text-accent/80 placeholder:text-text3 outline-none focus:border-accent transition-colors"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveStep(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded text-text3 hover:text-text hover:bg-bg3 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStep(idx, 'down')}
                        disabled={idx === steps.length - 1}
                        className="p-1 rounded text-text3 hover:text-text hover:bg-bg3 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="p-1 rounded text-text3 hover:text-red hover:bg-red/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md text-[12.5px] font-medium border border-border bg-bg2 text-text2 hover:bg-bg3 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim() || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[12.5px] font-semibold bg-accent text-white hover:bg-accent2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
