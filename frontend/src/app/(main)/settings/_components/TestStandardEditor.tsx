'use client';

import { Edit3, Eye, FileText, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAiConfig } from '@/hooks/useAiConfig';

const defaultContent = `# 企业测试规范

## 1. 用例编写规范
- 每条用例必须包含前置条件、操作步骤、预期结果
- 步骤描述需具体到可执行级别，避免模糊表述
- 优先级分为 P0(冒烟)、P1(核心)、P2(一般)、P3(边界)

## 2. 命名规范
- 用例标题格式：[模块]-[功能]-[场景]-[预期]
- 用例ID格式：TC-{模块缩写}-{序号}

## 3. 覆盖要求
- 正常流程覆盖率 ≥ 95%
- 异常/边界覆盖率 ≥ 80%
- 每个需求至少关联 3 条用例

## 4. 评审标准
- 用例步骤可独立执行
- 预期结果可量化验证
- 无冗余或重复用例
`;

export function TestStandardEditor() {
  const { effectiveConfig, loading, saving, error, saveGlobalConfig } = useAiConfig();
  const [content, setContent] = useState(defaultContent);
  const [mode, setMode] = useState<'edit' | 'preview'>('preview');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!effectiveConfig) {
      return;
    }
    setContent(effectiveConfig.team_standard_prompt || defaultContent);
  }, [effectiveConfig]);

  const handleSave = async () => {
    const ok = await saveGlobalConfig({ team_standard_prompt: content });
    if (!ok) return;

    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="sec-header">
        <FileText className="w-4 h-4 text-sy-accent" />
        <span className="sec-title">企业测试规范</span>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-md bg-sy-danger/8 border border-sy-danger/20 text-sy-danger text-[12.5px]">
          {error}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[12px] text-text3">
            配置组织级测试规范，AI 生成用例时将自动遵循这些规则
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`btn btn-sm ${mode === 'edit' ? 'btn-primary' : ''}`}
              onClick={() => setMode('edit')}
            >
              <Edit3 className="w-3.5 h-3.5" />
              编辑
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mode === 'preview' ? 'btn-primary' : ''}`}
              onClick={() => setMode('preview')}
            >
              <Eye className="w-3.5 h-3.5" />
              预览
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => void handleSave()}
              disabled={loading || saving}
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saved ? '已保存' : saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>

        {mode === 'edit' ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[400px] p-4 bg-bg2 border border-border rounded-lg text-text font-mono text-[13px] leading-relaxed outline-none resize-y focus:border-sy-accent transition-colors"
            placeholder="输入 Markdown 格式的测试规范..."
            disabled={loading || saving}
          />
        ) : (
          <div className="p-4 bg-bg2 border border-border rounded-lg min-h-[400px] prose-sm text-text2 text-[13px] leading-relaxed [&_h1]:text-text [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-text [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:mb-1 [&_code]:font-mono [&_code]:text-sy-accent [&_code]:bg-bg3 [&_code]:px-1 [&_code]:rounded">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
