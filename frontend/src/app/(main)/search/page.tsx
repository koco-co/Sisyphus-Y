'use client';

import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  FileText,
  Filter,
  HeartPulse,
  LayoutTemplate,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

interface SearchResult {
  id: string;
  title: string;
  type: 'requirement' | 'testcase' | 'diagnosis' | 'template' | 'knowledge';
  description: string;
  url: string;
  highlight?: string;
}

const typeConfig = {
  requirement: { label: '需求', icon: FileText, pill: 'pill-blue' },
  testcase: { label: '用例', icon: ClipboardList, pill: 'pill-green' },
  diagnosis: { label: '诊断', icon: HeartPulse, pill: 'pill-amber' },
  template: { label: '模板', icon: LayoutTemplate, pill: 'pill-purple' },
  knowledge: { label: '知识库', icon: BookOpen, pill: 'pill-gray' },
};

const mockResults: SearchResult[] = [
  {
    id: '1',
    title: '用户登录功能需求',
    type: 'requirement',
    description: 'REQ-001 · 用户登录认证流程',
    url: '/requirements',
  },
  {
    id: '2',
    title: '登录-密码错误锁定',
    type: 'testcase',
    description: 'TC-LOGIN-003 · P1 · 功能测试',
    url: '/testcases',
  },
  {
    id: '3',
    title: '数据导入需求诊断',
    type: 'diagnosis',
    description: '评分 82 · 2 个高风险项',
    url: '/diagnosis',
  },
  {
    id: '4',
    title: '接口测试模板',
    type: 'template',
    description: 'API 接口标准测试模板',
    url: '/templates',
  },
  {
    id: '5',
    title: '支付流程异常处理',
    type: 'requirement',
    description: 'REQ-015 · 支付异常回滚',
    url: '/requirements',
  },
  {
    id: '6',
    title: '批量导入-文件格式校验',
    type: 'testcase',
    description: 'TC-IMP-007 · P0 · 边界测试',
    url: '/testcases',
  },
  {
    id: '7',
    title: '测试规范文档',
    type: 'knowledge',
    description: '企业级测试规范 v2.1',
    url: '/knowledge',
  },
  {
    id: '8',
    title: '用户注册流程',
    type: 'requirement',
    description: 'REQ-002 · 新用户注册与激活',
    url: '/requirements',
  },
  {
    id: '9',
    title: '注册-邮箱格式校验',
    type: 'testcase',
    description: 'TC-REG-002 · P1 · 参数校验',
    url: '/testcases',
  },
  {
    id: '10',
    title: '安全测试模板',
    type: 'template',
    description: 'OWASP Top 10 安全检查',
    url: '/templates',
  },
];

type FilterType = 'all' | 'requirement' | 'testcase' | 'diagnosis' | 'template' | 'knowledge';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = useMemo(() => {
    let results = mockResults;
    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(
        (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
      );
    }
    if (filter !== 'all') {
      results = results.filter((r) => r.type === filter);
    }
    return results;
  }, [query, filter]);

  const grouped = filtered.reduce<Record<string, SearchResult[]>>((acc, r) => {
    acc[r.type] = acc[r.type] || [];
    acc[r.type].push(r);
    return acc;
  }, {});

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'requirement', label: '需求' },
    { value: 'testcase', label: '用例' },
    { value: 'diagnosis', label: '诊断' },
    { value: 'template', label: '模板' },
    { value: 'knowledge', label: '知识库' },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-text3 hover:text-text2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <Search className="w-5 h-5 text-accent" />
        <h1 className="font-display text-lg font-bold text-text">搜索结果</h1>
      </div>

      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text3" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索需求、用例、诊断报告、模板..."
          className="input w-full pl-10 py-2.5 text-sm"
          // biome-ignore lint/a11y/noAutofocus: search page needs autofocus
          autoFocus
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-3.5 h-3.5 text-text3" />
        {filterOptions.map((f) => (
          <button
            type="button"
            key={f.value}
            className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-colors ${
              filter === f.value
                ? 'bg-accent/10 text-accent border border-accent/25'
                : 'text-text3 hover:text-text2 hover:bg-bg2 border border-transparent'
            }`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-text3 font-mono">{filtered.length} 个结果</span>
      </div>

      {/* Results */}
      {Object.keys(grouped).length === 0 ? (
        <div className="py-16 text-center">
          <Search className="w-12 h-12 text-text3 mx-auto mb-3 opacity-20" />
          <p className="text-[13px] text-text3">未找到匹配结果</p>
          <p className="text-[12px] text-text3/60 mt-1">请尝试其他关键词</p>
        </div>
      ) : (
        Object.entries(grouped).map(([type, items]) => {
          const config = typeConfig[type as keyof typeof typeConfig];
          return (
            <div key={type} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className={`pill ${config.pill} text-[10px]`}>{config.label}</span>
                <span className="text-[10px] text-text3 font-mono">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((item) => {
                  const Icon = config.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.url}
                      className="card card-hover flex items-center gap-3"
                    >
                      <Icon className="w-4 h-4 text-text3 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-text">{item.title}</div>
                        <div className="text-[11.5px] text-text3 mt-0.5">{item.description}</div>
                      </div>
                      <span className="text-[11px] text-text3">→</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
