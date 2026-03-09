'use client';

import { Check, ExternalLink, Link2, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  url?: string;
  lastSync?: string;
}

const defaultIntegrations: Integration[] = [
  {
    id: 'jira',
    name: 'Jira',
    description: '同步需求与缺陷，自动关联测试用例',
    icon: 'J',
    connected: true,
    url: 'https://company.atlassian.net',
    lastSync: '2 分钟前',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: '代码变更 Diff 源，触发回归影响分析',
    icon: 'G',
    connected: true,
    url: 'https://gitlab.company.com',
    lastSync: '15 分钟前',
  },
  {
    id: 'jenkins',
    name: 'Jenkins',
    description: 'CI/CD 集成，自动化执行结果回流',
    icon: 'J',
    connected: false,
  },
  {
    id: 'testlink',
    name: 'TestLink',
    description: '测试管理工具，用例双向同步',
    icon: 'T',
    connected: false,
  },
  {
    id: 'confluence',
    name: 'Confluence',
    description: '文档同步，自动导入需求文档',
    icon: 'C',
    connected: false,
  },
];

export function IntegrationSettings() {
  const [integrations, setIntegrations] = useState(defaultIntegrations);

  const toggleConnection = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, connected: !item.connected } : item)),
    );
  };

  return (
    <div>
      <div className="sec-header">
        <Link2 className="w-4 h-4 text-accent" />
        <span className="sec-title">外部系统集成</span>
      </div>

      <p className="text-[12px] text-text3 mb-4">
        连接外部工具实现数据互通，支持需求同步、代码变更追踪、执行结果回流
      </p>

      <div className="flex flex-col gap-3">
        {integrations.map((item) => (
          <div key={item.id} className="card card-hover">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-bg3 border border-border flex items-center justify-center text-text2 font-bold text-sm shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-text">{item.name}</span>
                  {item.connected ? (
                    <span className="pill pill-green text-[10px]">
                      <Check className="w-3 h-3" />
                      已连接
                    </span>
                  ) : (
                    <span className="pill pill-gray text-[10px]">
                      <X className="w-3 h-3" />
                      未连接
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] text-text3 mt-0.5">{item.description}</div>
                {item.connected && item.url && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[10.5px] text-text3">{item.url}</span>
                    {item.lastSync && (
                      <span className="text-[10px] text-text3">· 上次同步: {item.lastSync}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.connected && (
                  <button type="button" className="btn btn-sm btn-ghost" title="重新同步">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  className={`btn btn-sm ${item.connected ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => toggleConnection(item.id)}
                >
                  {item.connected ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      断开
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      连接
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
