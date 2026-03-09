'use client';

import {
  AlertTriangle,
  BookOpen,
  ClipboardList,
  FileText,
  Filter,
  LayoutTemplate,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

interface RecycleItem {
  id: string;
  name: string;
  type: 'requirement' | 'testcase' | 'template' | 'knowledge';
  deletedAt: string;
  deletedBy: string;
  expiresIn: string;
}

const typeConfig = {
  requirement: { label: '需求', icon: FileText, pill: 'pill-blue' },
  testcase: { label: '用例', icon: ClipboardList, pill: 'pill-green' },
  template: { label: '模板', icon: LayoutTemplate, pill: 'pill-purple' },
  knowledge: { label: '知识库', icon: BookOpen, pill: 'pill-amber' },
};

const mockItems: RecycleItem[] = [
  {
    id: '1',
    name: '用户登录功能需求 v1',
    type: 'requirement',
    deletedAt: '2024-01-15 14:30',
    deletedBy: '张三',
    expiresIn: '25 天',
  },
  {
    id: '2',
    name: 'TC-LOGIN-001 密码错误测试',
    type: 'testcase',
    deletedAt: '2024-01-15 13:20',
    deletedBy: '李四',
    expiresIn: '25 天',
  },
  {
    id: '3',
    name: 'TC-LOGIN-002 验证码过期',
    type: 'testcase',
    deletedAt: '2024-01-14 16:45',
    deletedBy: '张三',
    expiresIn: '24 天',
  },
  {
    id: '4',
    name: '接口测试模板（旧版）',
    type: 'template',
    deletedAt: '2024-01-13 10:00',
    deletedBy: '王五',
    expiresIn: '23 天',
  },
  {
    id: '5',
    name: '测试规范文档 v1.0',
    type: 'knowledge',
    deletedAt: '2024-01-12 09:15',
    deletedBy: '张三',
    expiresIn: '22 天',
  },
  {
    id: '6',
    name: '数据导入需求',
    type: 'requirement',
    deletedAt: '2024-01-10 11:30',
    deletedBy: '李四',
    expiresIn: '20 天',
  },
];

type FilterType = 'all' | 'requirement' | 'testcase' | 'template' | 'knowledge';

export default function RecyclePage() {
  const [items, setItems] = useState(mockItems);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const filtered = items.filter((item) => {
    if (filter !== 'all' && item.type !== filter) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };

  const restore = (ids: string[]) => {
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  };

  const permanentDelete = (ids: string[]) => {
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  };

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'requirement', label: '需求' },
    { value: 'testcase', label: '用例' },
    { value: 'template', label: '模板' },
    { value: 'knowledge', label: '知识库' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Trash2 className="w-5 h-5 text-text3" />
        <h1 className="font-display text-lg font-bold text-text">回收站</h1>
        <span className="pill pill-gray text-[10px]">{items.length} 项</span>
      </div>

      <div className="alert-banner mb-6">
        <AlertTriangle />
        <span className="text-[12.5px]">
          回收站中的项目将在 30 天后自动永久删除，请及时恢复需要保留的数据
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索已删除项..."
            className="input w-full pl-8"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-text3" />
          {filterOptions.map((f) => (
            <button
              type="button"
              key={f.value}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                filter === f.value
                  ? 'bg-accent/10 text-accent border border-accent/25'
                  : 'text-text3 hover:text-text2 hover:bg-bg2 border border-transparent'
              }`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {selectedIds.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-text3">{selectedIds.size} 项已选</span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => restore(Array.from(selectedIds))}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              恢复
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => permanentDelete(Array.from(selectedIds))}
            >
              <Trash2 className="w-3.5 h-3.5" />
              永久删除
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Trash2 className="w-12 h-12 text-text3 mx-auto mb-3 opacity-20" />
          <p className="text-[13px] text-text3">回收站为空</p>
          <p className="text-[12px] text-text3/60 mt-1">删除的项目将显示在这里</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-border accent-accent"
                  />
                </th>
                <th>名称</th>
                <th className="w-20">类型</th>
                <th className="w-36">删除时间</th>
                <th className="w-20">删除者</th>
                <th className="w-20">过期</th>
                <th className="w-28">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const config = typeConfig[item.type];
                const Icon = config.icon;
                return (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-3.5 h-3.5 rounded border-border accent-accent"
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-text3 shrink-0" />
                        <span className="text-text truncate">{item.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${config.pill} text-[10px]`}>{config.label}</span>
                    </td>
                    <td className="font-mono text-[11px]">{item.deletedAt}</td>
                    <td className="text-text3">{item.deletedBy}</td>
                    <td className="text-text3 font-mono text-[11px]">{item.expiresIn}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => restore([item.id])}
                          title="恢复"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost text-red"
                          onClick={() => permanentDelete([item.id])}
                          title="永久删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
