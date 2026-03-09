'use client';

import { Save, Settings2 } from 'lucide-react';
import { useState } from 'react';

interface ToggleOption {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const defaultToggles: ToggleOption[] = [
  { id: 'autoNumber', label: '自动编号', description: '生成用例时自动添加递增编号', enabled: true },
  {
    id: 'includePrereq',
    label: '包含前置条件',
    description: '每条用例自动生成前置条件字段',
    enabled: true,
  },
  {
    id: 'includeTestData',
    label: '生成测试数据',
    description: 'AI 自动推荐具体的测试数据样本',
    enabled: false,
  },
  { id: 'splitNegative', label: '正反分离', description: '正常/异常用例分组展示', enabled: true },
  {
    id: 'includeEstimate',
    label: '预估执行时间',
    description: '为每条用例估算执行耗时',
    enabled: false,
  },
];

const formatOptions = [
  { value: 'structured', label: '结构化（步骤-预期）' },
  { value: 'bdd', label: 'BDD（Given-When-Then）' },
  { value: 'exploratory', label: '探索式（检查点）' },
];

const prioritySchemes = [
  { value: 'p0-p3', label: 'P0-P3（4级）' },
  { value: 'high-low', label: '高/中/低（3级）' },
  { value: 'critical', label: '严重/重要/一般/建议（4级）' },
];

const languageOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'zh-TW', label: '繁體中文' },
];

export function OutputPreferences() {
  const [format, setFormat] = useState('structured');
  const [priority, setPriority] = useState('p0-p3');
  const [language, setLanguage] = useState('zh-CN');
  const [toggles, setToggles] = useState(defaultToggles);
  const [saved, setSaved] = useState(false);

  const handleToggle = (id: string) => {
    setToggles((prev) => prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="sec-header">
        <Settings2 className="w-4 h-4 text-accent" />
        <span className="sec-title">输出偏好</span>
        <div className="ml-auto">
          <button type="button" className="btn btn-sm btn-primary" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" />
            {saved ? '已保存' : '保存'}
          </button>
        </div>
      </div>

      <div className="grid-2 mb-6">
        <div className="card">
          <label
            htmlFor="output-format"
            className="block text-[12.5px] text-text2 font-medium mb-2"
          >
            输出格式
          </label>
          <select
            id="output-format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="input w-full"
          >
            {formatOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="card">
          <label
            htmlFor="priority-scheme"
            className="block text-[12.5px] text-text2 font-medium mb-2"
          >
            优先级体系
          </label>
          <select
            id="priority-scheme"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="input w-full"
          >
            {prioritySchemes.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="card">
          <label
            htmlFor="output-language"
            className="block text-[12.5px] text-text2 font-medium mb-2"
          >
            输出语言
          </label>
          <select
            id="output-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="input w-full"
          >
            {languageOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <hr className="divider" />

      <div className="sec-header">
        <span className="sec-title">功能开关</span>
      </div>
      <div className="card">
        {toggles.map((t, i) => (
          <div key={t.id}>
            <div className="flex items-center gap-3 py-2.5">
              <div className="flex-1">
                <div className="text-[13px] font-medium text-text">{t.label}</div>
                <div className="text-[11.5px] text-text3 mt-0.5">{t.description}</div>
              </div>
              <button
                type="button"
                className={`toggle${t.enabled ? ' on' : ''}`}
                onClick={() => handleToggle(t.id)}
                aria-label={`Toggle ${t.label}`}
              />
            </div>
            {i < toggles.length - 1 && <hr className="divider" />}
          </div>
        ))}
      </div>
    </div>
  );
}
