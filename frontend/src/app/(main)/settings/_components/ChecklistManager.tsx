'use client';

import { ClipboardCheck, Edit3, Lock, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface ChecklistItem {
  id: string;
  text: string;
  category: string;
}

interface Checklist {
  id: string;
  name: string;
  type: 'builtin' | 'custom';
  items: ChecklistItem[];
}

const defaultChecklists: Checklist[] = [
  {
    id: 'builtin-1',
    name: '通用功能测试必问清单',
    type: 'builtin',
    items: [
      { id: 'b1', text: '输入字段的最大/最小长度限制是否明确？', category: '边界' },
      { id: 'b2', text: '必填字段为空时的提示信息是否定义？', category: '校验' },
      { id: 'b3', text: '并发操作时的数据一致性如何保证？', category: '并发' },
      { id: 'b4', text: '操作失败时的回滚机制是否设计？', category: '异常' },
      { id: 'b5', text: '接口超时的默认值和重试策略？', category: '性能' },
    ],
  },
  {
    id: 'builtin-2',
    name: '数据安全必问清单',
    type: 'builtin',
    items: [
      { id: 'b6', text: '敏感数据是否脱敏展示？', category: '安全' },
      { id: 'b7', text: '操作日志是否完整记录？', category: '审计' },
      { id: 'b8', text: '越权访问的防护措施？', category: '权限' },
    ],
  },
  {
    id: 'custom-1',
    name: '我的自定义清单',
    type: 'custom',
    items: [
      { id: 'c1', text: '数据导入后的校验规则？', category: '自定义' },
      { id: 'c2', text: '批量操作的上限数量？', category: '自定义' },
    ],
  },
];

const categoryColors: Record<string, string> = {
  边界: 'pill-amber',
  校验: 'pill-blue',
  并发: 'pill-purple',
  异常: 'pill-red',
  性能: 'pill-green',
  安全: 'pill-red',
  审计: 'pill-blue',
  权限: 'pill-amber',
  自定义: 'pill-gray',
};

export function ChecklistManager() {
  const [checklists, setChecklists] = useState(defaultChecklists);
  const [activeId, setActiveId] = useState(defaultChecklists[0].id);
  const [newItemText, setNewItemText] = useState('');

  const activeChecklist = checklists.find((c) => c.id === activeId);
  const isBuiltin = activeChecklist?.type === 'builtin';

  const addItem = () => {
    if (!newItemText.trim() || isBuiltin) return;
    setChecklists((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              items: [
                ...c.items,
                { id: `item-${Date.now()}`, text: newItemText.trim(), category: '自定义' },
              ],
            }
          : c,
      ),
    );
    setNewItemText('');
  };

  const removeItem = (itemId: string) => {
    if (isBuiltin) return;
    setChecklists((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c,
      ),
    );
  };

  return (
    <div>
      <div className="sec-header">
        <ClipboardCheck className="w-4 h-4 text-accent" />
        <span className="sec-title">行业必问清单</span>
      </div>

      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="w-56 shrink-0">
          <div className="flex flex-col gap-1">
            {checklists.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-left text-[12.5px] transition-colors ${
                  activeId === c.id
                    ? 'bg-accent/8 text-accent border border-accent/20'
                    : 'text-text2 hover:bg-bg2 border border-transparent'
                }`}
                onClick={() => setActiveId(c.id)}
              >
                {c.type === 'builtin' ? (
                  <Lock className="w-3.5 h-3.5 shrink-0 opacity-50" />
                ) : (
                  <Edit3 className="w-3.5 h-3.5 shrink-0 opacity-50" />
                )}
                <span className="truncate">{c.name}</span>
                <span className="ml-auto font-mono text-[10px] text-text3">{c.items.length}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeChecklist && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-[13px] font-semibold text-text">{activeChecklist.name}</h3>
                {isBuiltin && (
                  <span className="pill pill-gray text-[10px]">
                    <Lock className="w-3 h-3" />
                    内置（只读）
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2 mb-4">
                {activeChecklist.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 bg-bg2 border border-border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-[12.5px] text-text leading-relaxed">{item.text}</p>
                    </div>
                    <span
                      className={`pill ${categoryColors[item.category] || 'pill-gray'} text-[10px] shrink-0`}
                    >
                      {item.category}
                    </span>
                    {!isBuiltin && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-text3 hover:text-red transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!isBuiltin && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="添加新的检查项..."
                    className="input flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && addItem()}
                  />
                  <button type="button" className="btn btn-primary btn-sm" onClick={addItem}>
                    <Plus className="w-3.5 h-3.5" />
                    添加
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
