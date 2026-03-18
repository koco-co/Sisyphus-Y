'use client';

import { Clock, Database, RefreshCw, Save, Shield, Wrench } from 'lucide-react';
import { useState } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface ConfigItem {
  id: string;
  label: string;
  description: string;
  type: 'number' | 'toggle' | 'select';
  value: string | number | boolean;
  options?: { value: string; label: string }[];
  icon: typeof Clock;
}

const defaultConfigs: ConfigItem[] = [
  {
    id: 'retryCount',
    label: 'LLM 重试次数',
    description: '主模型调用失败后的重试次数',
    type: 'number',
    value: 2,
    icon: RefreshCw,
  },
  {
    id: 'retryBackoff',
    label: '重试退避策略',
    description: '重试间隔的计算方式',
    type: 'select',
    value: 'exponential',
    options: [
      { value: 'exponential', label: '指数退避（1s → 2s → 4s）' },
      { value: 'linear', label: '线性退避（1s → 2s → 3s）' },
      { value: 'fixed', label: '固定间隔（2s）' },
    ],
    icon: Clock,
  },
  {
    id: 'fallbackEnabled',
    label: '自动降级',
    description: '主模型多次失败后自动切换到备用模型',
    type: 'toggle',
    value: true,
    icon: Shield,
  },
  {
    id: 'cacheEnabled',
    label: '结果缓存',
    description: '缓存相同输入的 AI 生成结果，减少重复调用',
    type: 'toggle',
    value: true,
    icon: Database,
  },
  {
    id: 'cacheTTL',
    label: '缓存过期时间（分钟）',
    description: '缓存条目的最大存活时间',
    type: 'number',
    value: 60,
    icon: Clock,
  },
  {
    id: 'maxBatchSize',
    label: '批量生成上限',
    description: '单次批量生成的最大用例数量',
    type: 'number',
    value: 50,
    icon: Database,
  },
];

export function AdvancedSettings() {
  const [configs, setConfigs] = useState(defaultConfigs);
  const [saved, setSaved] = useState(false);

  const updateConfig = (id: string, value: string | number | boolean) => {
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="sec-header">
        <Wrench className="w-4 h-4 text-sy-accent" />
        <span className="sec-title">高级配置</span>
        <div className="ml-auto">
          <button type="button" className="btn btn-sm btn-primary" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" />
            {saved ? '已保存' : '保存'}
          </button>
        </div>
      </div>

      <div className="card">
        {configs.map((cfg, i) => {
          const Icon = cfg.icon;
          return (
            <div key={cfg.id}>
              <div className="flex items-center gap-4 py-3">
                <Icon className="w-4 h-4 text-text3 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-text">{cfg.label}</div>
                  <div className="text-[11.5px] text-text3 mt-0.5">{cfg.description}</div>
                </div>
                <div className="shrink-0">
                  {cfg.type === 'toggle' && (
                    <button
                      type="button"
                      className={`toggle${cfg.value ? ' on' : ''}`}
                      onClick={() => updateConfig(cfg.id, !cfg.value)}
                      aria-label={`Toggle ${cfg.label}`}
                    />
                  )}
                  {cfg.type === 'number' && (
                    <input
                      type="number"
                      value={cfg.value as number}
                      onChange={(e) => updateConfig(cfg.id, Number(e.target.value))}
                      className="input w-24 text-center font-mono text-sm"
                    />
                  )}
                  {cfg.type === 'select' && cfg.options && (
                    <CustomSelect
                      value={cfg.value as string}
                      onChange={(value) => updateConfig(cfg.id, value)}
                      options={cfg.options}
                      size="sm"
                    />
                  )}
                </div>
              </div>
              {i < configs.length - 1 && <hr className="divider" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
