'use client';

import { AlertCircle, Edit3, FileText, Loader2, Play, Save, Tag, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRequirement } from '@/hooks/useRequirement';

interface RequirementDetailTabProps {
  reqId: string;
  onStartAnalysis: () => void;
}

const priorityConfig: Record<string, { label: string; cls: string }> = {
  P0: { label: 'P0', cls: 'bg-sy-danger/10 text-sy-danger border-sy-danger/30' },
  P1: { label: 'P1', cls: 'bg-sy-warn/10 text-sy-warn border-sy-warn/30' },
  P2: { label: 'P2', cls: 'bg-sy-info/10 text-sy-info border-sy-info/30' },
  P3: { label: 'P3', cls: 'bg-sy-bg-3 text-sy-text-3 border-sy-border-2' },
};

function extractAstText(node: Record<string, unknown>): string {
  if (typeof node.text === 'string') return node.text;
  if (Array.isArray(node.content)) {
    const sep = node.type === 'doc' ? '\n' : '';
    return (node.content as Record<string, unknown>[]).map(extractAstText).join(sep);
  }
  return '';
}

export function RequirementDetailTab({ reqId, onStartAnalysis }: RequirementDetailTabProps) {
  const { requirement: req, requirementLoading, updateContent, updating } = useRequirement(reqId);
  const [editMode, setEditMode] = useState(false);
  const [localContent, setLocalContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  const rawContent = (() => {
    const ast = req?.content_ast;
    if (!ast) return ((req as Record<string, unknown> | undefined)?.content as string) ?? '';
    if (typeof ast.raw_text === 'string') return ast.raw_text;
    if (typeof ast.content === 'string') return ast.content;
    return extractAstText(ast as Record<string, unknown>);
  })();

  // Sync rawContent when requirement changes or edit mode reset
  useEffect(() => {
    setLocalContent(rawContent);
    setDirty(false);
  }, [rawContent]);

  const handleEditToggle = useCallback(() => {
    if (editMode && dirty) {
      // Discard changes
      setLocalContent(rawContent);
      setDirty(false);
    }
    setEditMode((v) => !v);
  }, [editMode, dirty, rawContent]);

  const handleSave = useCallback(async () => {
    if (!dirty) return;
    await updateContent({ content: localContent });
    setDirty(false);
    setEditMode(false);
    setSavedOnce(true);
  }, [dirty, localContent, updateContent]);

  if (requirementLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-sy-accent animate-spin" />
      </div>
    );
  }

  if (!req) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <FileText className="w-12 h-12 text-sy-text-3 opacity-20 mb-3" />
        <p className="text-[14px] text-sy-text-3">需求数据加载失败</p>
      </div>
    );
  }

  const priority = (req.frontmatter?.priority as string) ?? 'P1';
  const prioConfig = priorityConfig[priority] ?? priorityConfig.P2;
  const iterName = req.iteration_name ?? '';
  const productName = req.product_name ?? '';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Start Analysis Banner — appears after save */}
      {savedOnce && (
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-sy-accent/8 border-b border-sy-accent/20">
          <AlertCircle className="w-4 h-4 text-sy-accent flex-shrink-0" />
          <span className="text-[12.5px] text-sy-text-2 flex-1">需求已保存，可以开始 AI 分析</span>
          <button
            type="button"
            onClick={onStartAnalysis}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sy-accent text-white dark:text-black text-[12px] font-semibold hover:bg-sy-accent-2 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            开始分析
          </button>
        </div>
      )}

      {/* Metadata header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-sy-border">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-sy-accent flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-sy-text leading-snug">{req.title}</h2>
            {(productName || iterName) && (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {productName && <span className="text-[11px] text-sy-text-3">{productName}</span>}
                {productName && iterName && <span className="text-sy-text-3 text-[11px]">/</span>}
                {iterName && <span className="text-[11px] text-sy-text-3">{iterName}</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono font-semibold ${prioConfig.cls}`}
            >
              <Tag className="w-2.5 h-2.5" />
              {prioConfig.label}
            </span>
            {req.req_id && (
              <span className="text-[11px] text-sy-text-3 font-mono">{req.req_id}</span>
            )}
          </div>
        </div>

        {/* Frontmatter fields */}
        {req.frontmatter && Object.keys(req.frontmatter).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {Object.entries(req.frontmatter).map(([key, val]) => {
              if (key === 'priority' || !val) return null;
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="text-[10.5px] text-sy-text-3">{key}:</span>
                  <span className="text-[10.5px] text-sy-text-2 font-mono">{String(val)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-sy-border bg-sy-bg-1 flex-shrink-0">
          <span className="text-[11px] text-sy-text-3 uppercase tracking-wider">需求内容</span>
          <div className="flex items-center gap-1.5">
            {editMode && dirty && (
              <button
                type="button"
                onClick={handleSave}
                disabled={updating}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-sy-accent text-white dark:text-black text-[11.5px] font-semibold hover:bg-sy-accent-2 transition-colors disabled:opacity-50"
              >
                {updating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                保存
              </button>
            )}
            <button
              type="button"
              onClick={handleEditToggle}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] transition-colors ${
                editMode
                  ? 'bg-sy-bg-3 text-sy-text-3 hover:text-sy-text-2 hover:bg-sy-bg-2'
                  : 'bg-sy-bg-2 text-sy-text-2 hover:bg-sy-bg-3 border border-sy-border'
              }`}
            >
              {editMode ? (
                <>
                  <X className="w-3 h-3" />
                  取消
                </>
              ) : (
                <>
                  <Edit3 className="w-3 h-3" />
                  编辑
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {editMode ? (
            <textarea
              value={localContent}
              onChange={(e) => {
                setLocalContent(e.target.value);
                setDirty(true);
              }}
              className="w-full h-full min-h-[300px] resize-none bg-sy-bg-2 border border-sy-border rounded-lg px-3 py-2.5 text-[13px] text-sy-text font-mono placeholder:text-sy-text-3 outline-none focus:border-sy-accent transition-colors leading-relaxed"
              placeholder="输入需求内容（支持 Markdown）..."
            />
          ) : (
            <div
              className="text-[13px] text-sy-text leading-relaxed
              prose prose-sm prose-invert max-w-none
              [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-sy-text
              [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-sy-text
              [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-sy-text
              [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:my-2 [&_li]:mb-1 [&_li]:text-sy-text-2
              [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:my-2
              [&_code]:font-mono [&_code]:text-sy-accent [&_code]:bg-sy-bg-3 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px]
              [&_pre]:bg-sy-bg-2 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-3
              [&_pre_code]:bg-transparent [&_pre_code]:p-0
              [&_blockquote]:border-l-2 [&_blockquote]:border-sy-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-sy-text-3
              [&_a]:text-sy-accent [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-sy-accent-2
              [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-sy-border [&_img]:my-3
              [&_p]:mb-2 [&_p]:text-sy-text-2
              [&_strong]:font-semibold [&_strong]:text-sy-text
              [&_em]:italic"
            >
              {rawContent ? (
                <ReactMarkdown>{rawContent}</ReactMarkdown>
              ) : (
                <span className="text-sy-text-3 italic">暂无需求内容，点击「编辑」添加</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
