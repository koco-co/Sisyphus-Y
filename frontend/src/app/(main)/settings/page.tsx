'use client';

import {
  Bot,
  ClipboardCheck,
  FileText,
  Layers,
  Link2,
  type LucideIcon,
  Settings2,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { AdvancedSettings } from './_components/AdvancedSettings';
import { AIModelSettings } from './_components/AIModelSettings';
import { ChecklistManager } from './_components/ChecklistManager';
import { IntegrationSettings } from './_components/IntegrationSettings';
import { ModuleRules } from './_components/ModuleRules';
import { OutputPreferences } from './_components/OutputPreferences';
import { TestStandardEditor } from './_components/TestStandardEditor';

const sidebarItems: { icon: LucideIcon; key: string; label: string }[] = [
  { icon: Bot, key: 'ai-model', label: 'AI 模型配置' },
  { icon: FileText, key: 'test-standard', label: '测试规范' },
  { icon: Layers, key: 'module-rules', label: '模块专项规则' },
  { icon: Settings2, key: 'output', label: '输出偏好' },
  { icon: ClipboardCheck, key: 'checklist', label: '必问清单' },
  { icon: Wrench, key: 'advanced', label: '高级配置' },
  { icon: Link2, key: 'integration', label: '外部集成' },
];

const panels: Record<string, React.ComponentType> = {
  'ai-model': AIModelSettings,
  'test-standard': TestStandardEditor,
  'module-rules': ModuleRules,
  output: OutputPreferences,
  checklist: ChecklistManager,
  advanced: AdvancedSettings,
  integration: IntegrationSettings,
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('ai-model');
  const Panel = panels[activeTab] ?? AIModelSettings;

  return (
    <>
      <aside className="sidebar-panel">
        <div className="sb-section">
          <div className="sb-label">设置</div>
          {sidebarItems.map((item) => {
            const SideIcon = item.icon;
            return (
              <button
                type="button"
                key={item.key}
                className={`sb-item${activeTab === item.key ? ' active' : ''}`}
                onClick={() => setActiveTab(item.key)}
              >
                <SideIcon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="main-with-sidebar">
        <div className="page-watermark mb-4">SETTINGS · {activeTab.toUpperCase()}</div>
        <Panel />
      </div>
    </>
  );
}
