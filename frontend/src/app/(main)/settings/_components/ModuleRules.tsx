'use client';

import { ChevronDown, ChevronRight, Layers, Save } from 'lucide-react';
import { useState } from 'react';

interface ModuleRule {
  id: string;
  name: string;
  description: string;
  rules: string;
}

const defaultModules: ModuleRule[] = [
  {
    id: 'login',
    name: '登录认证',
    description: '登录/注册/SSO/权限验证相关场景',
    rules:
      '- 必须覆盖密码错误、账号锁定、验证码过期场景\n- SSO 登录需测试 token 过期自动刷新\n- 涉及加密的字段需验证传输安全性',
  },
  {
    id: 'data-import',
    name: '数据导入',
    description: '文件上传/批量导入/格式校验',
    rules:
      '- 测试文件大小边界值（0KB, 1B, MAX）\n- 覆盖所有支持格式（xlsx, csv, json）\n- 中断后重传的幂等性验证',
  },
  {
    id: 'report',
    name: '报表统计',
    description: '图表展示/数据导出/筛选统计',
    rules: '- 数据为空时的空态展示\n- 大数据量下分页/懒加载性能\n- 导出文件内容与页面一致性',
  },
  {
    id: 'workflow',
    name: '流程审批',
    description: '审批流程/状态流转/通知触发',
    rules: '- 覆盖所有状态流转路径\n- 并发审批的冲突处理\n- 超时/撤回/加签等特殊操作',
  },
  {
    id: 'api',
    name: 'API 接口',
    description: '接口测试/参数校验/幂等性',
    rules: '- 必测参数边界、类型错误、必填缺失\n- 幂等接口重复调用验证\n- 权限不足时的错误码检查',
  },
];

export function ModuleRules() {
  const [modules, setModules] = useState(defaultModules);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateRules = (id: string, rules: string) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, rules } : m)));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="sec-header">
        <Layers className="w-4 h-4 text-sy-accent" />
        <span className="sec-title">模块专项规则</span>
        <div className="ml-auto">
          <button type="button" className="btn btn-sm btn-primary" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" />
            {saved ? '已保存' : '保存全部'}
          </button>
        </div>
      </div>

      <p className="text-[12px] text-text3 mb-4">
        为不同业务模块配置专属测试规则，AI 生成用例时将针对性地应用对应规则
      </p>

      <div className="flex flex-col gap-2">
        {modules.map((mod) => {
          const isExpanded = expandedIds.has(mod.id);
          return (
            <div key={mod.id} className="card">
              <button
                type="button"
                className="flex items-center gap-3 w-full text-left"
                onClick={() => toggleExpand(mod.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-text3 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-text3 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-text">{mod.name}</div>
                  <div className="text-[11.5px] text-text3 mt-0.5">{mod.description}</div>
                </div>
                <span className="pill pill-gray text-[10px] shrink-0">
                  {mod.rules.split('\n').filter(Boolean).length} 条规则
                </span>
              </button>
              {isExpanded && (
                <div className="mt-3 pl-7">
                  <textarea
                    value={mod.rules}
                    onChange={(e) => updateRules(mod.id, e.target.value)}
                    rows={5}
                    className="w-full p-3 bg-bg2 border border-border rounded-lg text-text text-[12.5px] font-mono leading-relaxed outline-none resize-y focus:border-sy-accent transition-colors"
                    placeholder="每行一条规则，建议使用 - 开头..."
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
