'use client';

import { BarChart3, Edit3, FileText, Save, Sparkles, Tag, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/ui';
import { CustomSelect } from '@/components/ui/CustomSelect';
import type { TestPointItem, TestPointSource } from '@/stores/scene-map-store';

const sourceLabels: Record<
  TestPointSource,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'gray' }
> = {
  document: { label: '已覆盖', variant: 'success' },
  supplemented: { label: 'AI 补全', variant: 'warning' },
  missing: { label: '缺失', variant: 'danger' },
  pending: { label: '待确认', variant: 'gray' },
};

interface TestPointDetailProps {
  point: TestPointItem | null;
  isLocked: boolean;
  onUpdate: (id: string, updates: Partial<TestPointItem>) => void;
  onConfirm: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TestPointDetail({
  point,
  isLocked,
  onUpdate,
  onConfirm,
  onDelete,
}: TestPointDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [editPriority, setEditPriority] = useState('');

  useEffect(() => {
    if (point) {
      setEditTitle(point.title);
      setEditDescription(point.description ?? '');
      setEditGroup(point.group_name);
      setEditPriority(point.priority);
    }
    setIsEditing(false);
  }, [point]);

  if (!point) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sy-text-3">
        <FileText size={40} className="opacity-25 mb-3" />
        <p className="text-[13px]">选择一个测试点查看详情</p>
        <p className="text-[11px] opacity-60 mt-1">从左侧列表点击测试点</p>
      </div>
    );
  }

  const src = sourceLabels[point.source] ?? sourceLabels.pending;

  const handleSave = () => {
    onUpdate(point.id, {
      title: editTitle,
      description: editDescription || null,
      group_name: editGroup,
      priority: editPriority,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(point.title);
    setEditDescription(point.description ?? '');
    setEditGroup(point.group_name);
    setEditPriority(point.priority);
    setIsEditing(false);
  };

  return (
    <div className="p-4">
      {/* Header badges */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <StatusBadge variant={src.variant}>{src.label}</StatusBadge>
        <StatusBadge
          variant={
            point.priority === 'P0' ? 'danger' : point.priority === 'P1' ? 'warning' : 'gray'
          }
        >
          {point.priority}
        </StatusBadge>
        <StatusBadge
          variant={
            point.status === 'confirmed' ? 'success' : point.status === 'ignored' ? 'gray' : 'info'
          }
        >
          {point.status === 'confirmed'
            ? '已确认'
            : point.status === 'ignored'
              ? '已忽略'
              : '待处理'}
        </StatusBadge>
        <StatusBadge variant="purple">
          {point.source === 'document' ? (
            <>
              <User size={10} /> 文档
            </>
          ) : (
            <>
              <Sparkles size={10} /> AI
            </>
          )}
        </StatusBadge>

        {!isLocked && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-sy-text-2 bg-sy-bg-2 border border-sy-border hover:text-sy-text hover:border-sy-border-2 transition-colors"
          >
            <Edit3 size={11} />
            编辑
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          {/* Title */}
          <div>
            <label
              htmlFor="test-point-title"
              className="text-[10px] text-sy-text-3 uppercase tracking-wide font-semibold block mb-1"
            >
              名称
            </label>
            <input
              id="test-point-title"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-sy-bg-2 border border-sy-border rounded-md text-sy-text outline-none focus:border-sy-accent transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="test-point-description"
              className="text-[10px] text-sy-text-3 uppercase tracking-wide font-semibold block mb-1"
            >
              描述
            </label>
            <textarea
              id="test-point-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-[13px] bg-sy-bg-2 border border-sy-border rounded-md text-sy-text outline-none focus:border-sy-accent transition-colors resize-none"
              placeholder="输入测试点描述..."
            />
          </div>

          {/* Group + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="test-point-group"
                className="text-[10px] text-sy-text-3 uppercase tracking-wide font-semibold block mb-1"
              >
                分类
              </label>
              <input
                id="test-point-group"
                type="text"
                value={editGroup}
                onChange={(e) => setEditGroup(e.target.value)}
                className="w-full px-3 py-2 text-[13px] bg-sy-bg-2 border border-sy-border rounded-md text-sy-text outline-none focus:border-sy-accent transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="test-point-priority"
                className="text-[10px] text-sy-text-3 uppercase tracking-wide font-semibold block mb-1"
              >
                优先级
              </label>
              <CustomSelect
                value={editPriority}
                onChange={(value) => setEditPriority(value)}
                options={[
                  { value: 'P0', label: 'P0 - 阻塞' },
                  { value: 'P1', label: 'P1 - 严重' },
                  { value: 'P2', label: 'P2 - 一般' },
                  { value: 'P3', label: 'P3 - 轻微' },
                ]}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12px] font-medium bg-sy-accent text-black hover:bg-sy-accent-2 transition-colors"
            >
              <Save size={12} />
              保存
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12px] font-medium text-sy-text-3 bg-sy-bg-2 border border-sy-border hover:text-sy-text transition-colors"
            >
              <X size={12} />
              取消
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Title */}
          <h2 className="text-[16px] font-semibold text-sy-text mb-2">{point.title}</h2>

          {/* Description */}
          <p className="text-[13px] text-sy-text-2 leading-relaxed mb-4">
            {point.description ?? '暂无描述'}
          </p>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-sy-bg-2 rounded-lg p-3 border border-sy-border">
              <div className="flex items-center gap-1.5 text-[10px] text-sy-text-3 uppercase tracking-wide mb-1">
                <Tag size={10} />
                分类
              </div>
              <div className="text-[13px] font-medium text-sy-text">{point.group_name}</div>
            </div>
            <div className="bg-sy-bg-2 rounded-lg p-3 border border-sy-border">
              <div className="flex items-center gap-1.5 text-[10px] text-sy-text-3 uppercase tracking-wide mb-1">
                <BarChart3 size={10} />
                预计用例数
              </div>
              <div className="text-[13px] font-mono font-medium text-sy-text">
                {point.estimated_cases}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {!isLocked && point.status !== 'confirmed' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onConfirm(point.id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12px] font-medium bg-sy-accent text-black hover:bg-sy-accent-2 transition-colors"
              >
                确认此测试点
              </button>
              <button
                type="button"
                onClick={() => onDelete(point.id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12px] font-medium text-sy-danger bg-sy-danger/10 border border-sy-danger/25 hover:bg-sy-danger/20 transition-colors"
              >
                删除
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
