'use client';

import {
  Clock,
  Copy,
  Edit3,
  Eye,
  Filter,
  LayoutTemplate,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface TemplateStep {
  step: number;
  action: string;
  expected: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  usageCount: number;
  steps: TemplateStep[];
  tags: string[];
  createdAt: string;
  starred: boolean;
}

const categoryLabels: Record<string, string> = {
  functional: '功能测试',
  performance: '性能测试',
  security: '安全测试',
  compatibility: '兼容性测试',
  api: '接口测试',
};

const categoryPills: Record<string, string> = {
  functional: 'pill-green',
  performance: 'pill-amber',
  security: 'pill-red',
  compatibility: 'pill-blue',
  api: 'pill-purple',
};

const mockTemplates: Template[] = [
  {
    id: '1',
    name: '登录功能标准模板',
    category: 'functional',
    description: '覆盖正常/异常登录流程，包含密码校验、验证码、SSO 等场景',
    usageCount: 42,
    tags: ['登录', '认证', 'SSO'],
    steps: [
      { step: 1, action: '输入正确的用户名和密码', expected: '登录成功，跳转到首页' },
      { step: 2, action: '输入错误密码', expected: '提示密码错误，剩余尝试次数' },
      { step: 3, action: '连续5次错误密码', expected: '账号锁定，提示联系管理员' },
    ],
    createdAt: '2024-01-10',
    starred: true,
  },
  {
    id: '2',
    name: 'CRUD 操作通用模板',
    category: 'functional',
    description: '增删改查基础操作覆盖，含边界值和权限检查',
    usageCount: 38,
    tags: ['CRUD', '通用'],
    steps: [
      { step: 1, action: '创建记录（必填+选填）', expected: '记录创建成功' },
      { step: 2, action: '查询刚创建的记录', expected: '查询结果正确展示' },
      { step: 3, action: '修改记录部分字段', expected: '修改成功，数据更新' },
    ],
    createdAt: '2024-01-08',
    starred: true,
  },
  {
    id: '3',
    name: 'API 接口测试模板',
    category: 'api',
    description: 'RESTful API 接口标准测试，含参数校验、权限、幂等性',
    usageCount: 25,
    tags: ['API', 'REST', '接口'],
    steps: [
      { step: 1, action: '发送正常请求', expected: '返回 200，数据符合 Schema' },
      { step: 2, action: '缺少必填参数', expected: '返回 422，错误提示明确' },
      { step: 3, action: '无权限请求', expected: '返回 403，无数据泄露' },
    ],
    createdAt: '2024-01-05',
    starred: false,
  },
  {
    id: '4',
    name: '文件上传测试模板',
    category: 'functional',
    description: '文件上传场景全覆盖，含大小限制、格式校验、断点续传',
    usageCount: 18,
    tags: ['上传', '文件'],
    steps: [
      { step: 1, action: '上传支持格式的文件', expected: '上传成功，预览正常' },
      { step: 2, action: '上传超过大小限制的文件', expected: '提示文件过大' },
      { step: 3, action: '上传不支持格式的文件', expected: '提示格式不支持' },
    ],
    createdAt: '2024-01-03',
    starred: false,
  },
  {
    id: '5',
    name: '安全测试基线模板',
    category: 'security',
    description: 'OWASP Top 10 基础安全测试检查项',
    usageCount: 12,
    tags: ['安全', 'OWASP', 'XSS'],
    steps: [
      { step: 1, action: '在输入框注入 XSS 脚本', expected: '输入被转义，无脚本执行' },
      { step: 2, action: 'SQL 注入测试', expected: '参数被正确过滤' },
      { step: 3, action: 'CSRF Token 验证', expected: '无 Token 请求被拒绝' },
    ],
    createdAt: '2024-01-01',
    starred: false,
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState(mockTemplates);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', category: 'functional', description: '' });

  const filtered = templates.filter((t) => {
    if (categoryFilter && t.category !== categoryFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const previewTemplate = templates.find((t) => t.id === previewId);

  const toggleStar = (id: string) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, starred: !t.starred } : t)));
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (previewId === id) setPreviewId(null);
  };

  const createTemplate = () => {
    if (!newForm.name.trim()) return;
    const newTpl: Template = {
      id: `tpl-${Date.now()}`,
      name: newForm.name,
      category: newForm.category,
      description: newForm.description,
      usageCount: 0,
      steps: [],
      tags: [],
      createdAt: new Date().toISOString().split('T')[0],
      starred: false,
    };
    setTemplates((prev) => [newTpl, ...prev]);
    setShowCreate(false);
    setNewForm({ name: '', category: 'functional', description: '' });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <LayoutTemplate className="w-5 h-5 text-accent" />
          <h1 className="font-display text-lg font-bold text-text">用例模板库</h1>
          <span className="pill pill-gray text-[10px]">{templates.length} 个模板</span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus className="w-3.5 h-3.5" />
          新建模板
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card p-4 mb-6">
          <div className="flex gap-3 mb-3">
            <input
              value={newForm.name}
              onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="模板名称"
              className="input flex-1"
            />
            <select
              value={newForm.category}
              onChange={(e) => setNewForm((p) => ({ ...p, category: e.target.value }))}
              className="input"
            >
              {Object.entries(categoryLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={newForm.description}
            onChange={(e) => setNewForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="模板描述..."
            rows={2}
            className="input w-full resize-y mb-3"
          />
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={createTemplate}>
              创建
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setShowCreate(false)}>
              取消
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索模板..."
            className="input w-full pl-8"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-text3" />
          <button
            type="button"
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              !categoryFilter
                ? 'bg-accent/10 text-accent border border-accent/25'
                : 'text-text3 hover:bg-bg2 border border-transparent'
            }`}
            onClick={() => setCategoryFilter('')}
          >
            全部
          </button>
          {Object.entries(categoryLabels).map(([k, v]) => (
            <button
              type="button"
              key={k}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                categoryFilter === k
                  ? 'bg-accent/10 text-accent border border-accent/25'
                  : 'text-text3 hover:bg-bg2 border border-transparent'
              }`}
              onClick={() => setCategoryFilter(k)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Grid */}
        <div className="flex-1">
          <div className="grid-3">
            {filtered.map((tpl) => (
              <div key={tpl.id} className="card card-hover flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-text leading-tight flex-1">
                    {tpl.name}
                  </h4>
                  <button
                    type="button"
                    className="shrink-0 ml-2"
                    onClick={() => toggleStar(tpl.id)}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${tpl.starred ? 'text-amber fill-amber' : 'text-text3 hover:text-amber'} transition-colors`}
                    />
                  </button>
                </div>
                <span
                  className={`pill ${categoryPills[tpl.category] || 'pill-gray'} text-[10px] self-start mb-2`}
                >
                  {categoryLabels[tpl.category] || tpl.category}
                </span>
                {tpl.description && (
                  <p className="text-[11.5px] text-text3 leading-relaxed mb-3 line-clamp-2 flex-1">
                    {tpl.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mb-3">
                  {tpl.tags.map((tag) => (
                    <span key={tag} className="tag text-[10px]">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                  <div className="flex items-center gap-3 text-[11px] text-text3">
                    <span className="flex items-center gap-1">
                      <Copy className="w-3 h-3" />
                      {tpl.usageCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tpl.createdAt}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setPreviewId(tpl.id)}
                      title="预览"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" className="btn btn-sm btn-ghost" title="编辑">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost text-red"
                      onClick={() => deleteTemplate(tpl.id)}
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="card py-12 text-center text-text3" style={{ gridColumn: '1 / -1' }}>
                <LayoutTemplate className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-[13px]">暂无匹配模板</p>
              </div>
            )}
          </div>
        </div>

        {/* Preview panel */}
        {previewTemplate && (
          <div className="w-80 shrink-0">
            <div className="card sticky top-16">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold text-text">模板预览</h3>
                <button
                  type="button"
                  className="text-text3 hover:text-text2 transition-colors"
                  onClick={() => setPreviewId(null)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-sm font-semibold text-text mb-2">{previewTemplate.name}</h4>
              <span
                className={`pill ${categoryPills[previewTemplate.category] || 'pill-gray'} text-[10px] mb-3`}
              >
                {categoryLabels[previewTemplate.category]}
              </span>
              <p className="text-[12px] text-text3 leading-relaxed mb-4">
                {previewTemplate.description}
              </p>

              <div className="text-[11px] font-semibold text-text2 mb-2 uppercase tracking-wider">
                步骤预览
              </div>
              <div className="flex flex-col gap-2 mb-4">
                {previewTemplate.steps.map((s) => (
                  <div key={s.step} className="p-2.5 bg-bg2 border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                        {s.step}
                      </span>
                      <span className="text-[12px] text-text">{s.action}</span>
                    </div>
                    <div className="pl-7 text-[11px] text-accent/80">→ {s.expected}</div>
                  </div>
                ))}
              </div>

              <button type="button" className="btn btn-primary btn-sm w-full justify-center">
                <Copy className="w-3.5 h-3.5" />
                使用此模板
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
