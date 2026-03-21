# UX 增强实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 三维度并行提升 Sisyphus-Y 平台 UX：文案润色 + AI 流式三阶段状态机 + 流程引导组件（WorkflowStepper / SmartNextCard）+ 页面过渡动画 + Toast 规范化。

**Architecture:** 新增两个 workflow 组件（`components/workflow/`），扩展 stream-store 增加三阶段状态，在 `(main)/layout.tsx` 注入页面过渡层，全量重写 P0 模块文案。Kimi K2 模型通过设置页配置后手动跑链路验证。

**Tech Stack:** Next.js 16 App Router, Zustand stream-store, SSE (useSSEStream hook), shadcn/ui, Tailwind CSS (sy-* tokens), lucide-react, sonner (toast)

---

## Phase 1：文案重写（P0 主链路）

### Task 1：EmptyState 组件默认文案更新

**Files:**
- Modify: `frontend/src/components/ui/EmptyState.tsx`

**Step 1: 修改默认 title 文案**

将 `title = '暂无数据'` 改为 `title = '这里还没有内容'`，这是最通用的备用文案。

```tsx
export function EmptyState({
  icon,
  title = '这里还没有内容',
  description,
  action,
  className = '',
}: EmptyStateProps) {
```

**Step 2: 运行类型检查确认无 TypeScript 错误**

```bash
cd frontend && bunx tsc --noEmit
```
预期：无报错

**Step 3: Commit**

```bash
git add frontend/src/components/ui/EmptyState.tsx
git commit -m "ux: update EmptyState default copy"
```

---

### Task 2：分析台文案重写

**Files:**
- Modify: `frontend/src/app/(main)/analysis/page.tsx`
- Modify: `frontend/src/app/(main)/analysis/diagnosis/page.tsx`（若存在独立空状态）

**Step 1: 读取当前分析台页面**

先读取 `frontend/src/app/(main)/analysis/page.tsx` 确认空状态结构。

**Step 2: 替换空状态文案**

查找所有 `EmptyState` 使用处，按以下对照表替换：

| 位置 | 原文案 | 新文案 |
|------|--------|--------|
| 需求列表空状态 title | 暂无需求 / 暂无数据 | 还没有需求 |
| 需求列表空状态 description | （无） | 从录入或上传文档开始，AI 将自动分析潜在风险 |
| 分析报告空状态 title | 暂无分析报告 | 还没有分析过这个需求 |
| 分析报告空状态 description | （无） | 点击「开始分析」让 AI 从 6 个维度识别潜在风险 |
| 测试点空状态 title | 暂无测试点 | AI 还没有生成测试点 |
| 测试点空状态 description | （无） | 先完成需求分析，再来这里确认测试点 |

**Step 3: 运行类型检查**

```bash
cd frontend && bunx tsc --noEmit
```

**Step 4: Commit**

```bash
git add frontend/src/app/(main)/analysis/
git commit -m "ux: rewrite analysis module empty state copy"
```

---

### Task 3：工作台文案重写

**Files:**
- Modify: `frontend/src/app/(main)/workbench/page.tsx`
- Modify: `frontend/src/app/(main)/workbench/[id]/page.tsx`

**Step 1: 读取工作台页面，定位所有用户可见文案**

**Step 2: 按对照表替换**

| 位置 | 原文案 | 新文案 |
|------|--------|--------|
| 工作台空状态（未选需求）| 请先选择需求 | 从左侧选择一个需求，AI 会根据已确认的测试点生成用例 |
| 生成按钮 | 生成用例 | 开始生成用例 |
| 生成中提示 | 生成中... | 正在为「${测试点名}」编写测试步骤... |
| 无测试点提示 | （无） | 需要先确认测试点才能生成用例，前往分析台确认 |

**Step 3: Commit**

```bash
git add frontend/src/app/(main)/workbench/
git commit -m "ux: rewrite workbench copy"
```

---

### Task 4：用例库文案重写

**Files:**
- Modify: `frontend/src/app/(main)/testcases/page.tsx`

**Step 1: 读取用例库页面**

**Step 2: 替换空状态和提示文案**

| 位置 | 原文案 | 新文案 |
|------|--------|--------|
| 用例列表空状态 title | 暂无用例 | 用例库是空的 |
| 用例列表空状态 description | （无） | 先去工作台生成第一批用例 |
| 删除确认 | 确认删除吗？ | 删除后可在回收站找回，30 天内有效 |

**Step 3: Commit**

```bash
git add frontend/src/app/(main)/testcases/page.tsx
git commit -m "ux: rewrite testcases copy"
```

---

### Task 5：其他 P0 文案（知识库 / 回收站 / Diff）

**Files:**
- Modify: `frontend/src/app/(main)/knowledge/page.tsx`
- Modify: `frontend/src/app/(main)/recycle/page.tsx`
- Modify: `frontend/src/app/(main)/diff/page.tsx`

**Step 1: 按对照表逐一替换**

| 位置 | 原文案 | 新文案 |
|------|--------|--------|
| 知识库空状态 | 暂无文档 | 上传测试规范或历史用例，AI 生成时会自动参考这些知识 |
| 回收站空状态 | 暂无记录 | 回收站是空的 |
| Diff 空状态 | 输入需求 ID 并选择版本范围 | 选择同一需求的两个版本，AI 将找出变更并评估对测试用例的影响 |

**Step 2: Commit**

```bash
git add frontend/src/app/(main)/knowledge/page.tsx \
        frontend/src/app/(main)/recycle/page.tsx \
        frontend/src/app/(main)/diff/page.tsx
git commit -m "ux: rewrite knowledge/recycle/diff copy"
```

---

## Phase 2：AI 流式三阶段状态机

### Task 6：扩展 stream-store 增加阶段状态

**Files:**
- Modify: `frontend/src/stores/stream-store.ts`

**Step 1: 定义三阶段类型**

```typescript
export type StreamPhase = 'idle' | 'thinking' | 'generating' | 'organizing' | 'done';
```

**Step 2: 在 StreamState 接口中增加字段**

```typescript
interface StreamState {
  thinkingText: string;
  contentText: string;
  isStreaming: boolean;
  isThinkingDone: boolean;
  phase: StreamPhase;           // 新增
  phaseLabel: string;           // 新增，当前阶段中文标签
  reset: () => void;
  appendThinking: (delta: string) => void;
  appendContent: (delta: string) => void;
  setDone: () => void;
  setOrganizing: () => void;    // 新增
}
```

**Step 3: 实现完整 store（替换整个文件）**

```typescript
import { create } from 'zustand';

export type StreamPhase = 'idle' | 'thinking' | 'generating' | 'organizing' | 'done';

const PHASE_LABELS: Record<StreamPhase, string> = {
  idle: '',
  thinking: '正在理解需求结构...',
  generating: '正在生成内容...',
  organizing: '正在整理分析结果...',
  done: '',
};

interface StreamState {
  thinkingText: string;
  contentText: string;
  isStreaming: boolean;
  isThinkingDone: boolean;
  phase: StreamPhase;
  phaseLabel: string;
  reset: () => void;
  appendThinking: (delta: string) => void;
  appendContent: (delta: string) => void;
  setOrganizing: () => void;
  setDone: () => void;
}

export const useStreamStore = create<StreamState>((set) => ({
  thinkingText: '',
  contentText: '',
  isStreaming: false,
  isThinkingDone: false,
  phase: 'idle',
  phaseLabel: '',
  reset: () =>
    set({
      thinkingText: '',
      contentText: '',
      isStreaming: false,
      isThinkingDone: false,
      phase: 'idle',
      phaseLabel: '',
    }),
  appendThinking: (delta) =>
    set((s) => ({
      thinkingText: s.thinkingText + delta,
      isStreaming: true,
      phase: 'thinking',
      phaseLabel: PHASE_LABELS.thinking,
    })),
  appendContent: (delta) =>
    set((s) => ({
      contentText: s.contentText + delta,
      isStreaming: true,
      isThinkingDone: true,
      phase: 'generating',
      phaseLabel: PHASE_LABELS.generating,
    })),
  setOrganizing: () =>
    set({
      phase: 'organizing',
      phaseLabel: PHASE_LABELS.organizing,
    }),
  setDone: () =>
    set({
      isStreaming: false,
      phase: 'done',
      phaseLabel: '',
    }),
}));
```

**Step 4: 运行类型检查**

```bash
cd frontend && bunx tsc --noEmit
```
预期：无报错

**Step 5: Commit**

```bash
git add frontend/src/stores/stream-store.ts
git commit -m "feat: add 3-phase stream state machine to stream-store"
```

---

### Task 7：扩展 useSSEStream 触发 organizing 阶段

**Files:**
- Modify: `frontend/src/hooks/useSSEStream.ts`

**Step 1: 在 content → done 之间注入 organizing 阶段**

```typescript
import { API_BASE } from '@/lib/api';
import { useStreamStore } from '@/stores/stream-store';

export function useSSEStream() {
  const { reset, appendThinking, appendContent, setOrganizing, setDone } = useStreamStore();

  async function streamSSE(path: string, body: object) {
    reset();
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let contentReceived = false;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        // 如果已收到内容但还没收到 done 事件，先进入 organizing 阶段
        if (contentReceived) setOrganizing();
        setTimeout(() => setDone(), 800);
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      const messages = buffer.split('\n\n');
      buffer = messages.pop() ?? '';

      for (const msg of messages) {
        const eventMatch = msg.match(/^event: (\w+)/m);
        const dataMatch = msg.match(/^data: (.+)/m);
        if (!eventMatch || !dataMatch) continue;

        const eventType = eventMatch[1];
        try {
          const payload = JSON.parse(dataMatch[1]);
          if (eventType === 'thinking') appendThinking(payload.delta ?? '');
          else if (eventType === 'content') {
            appendContent(payload.delta ?? '');
            contentReceived = true;
          } else if (eventType === 'done') {
            setOrganizing();
            setTimeout(() => setDone(), 800);
          }
        } catch {
          /* ignore parse errors */
        }
      }
    }
  }

  return { streamSSE };
}
```

**Step 2: 运行类型检查**

```bash
cd frontend && bunx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend/src/hooks/useSSEStream.ts
git commit -m "feat: trigger organizing phase before SSE stream done"
```

---

### Task 8：新建 AiStreamStatus 组件显示阶段状态

**Files:**
- Create: `frontend/src/components/ui/AiStreamStatus.tsx`

**Step 1: 创建组件**

```tsx
'use client';
import { useStreamStore } from '@/stores/stream-store';

/**
 * 在 AI 流式输出期间显示当前阶段标签（思考中 / 生成中 / 整理中）。
 * 仅在 isStreaming=true 时渲染，完成后自动隐藏。
 */
export function AiStreamStatus() {
  const { isStreaming, phase, phaseLabel } = useStreamStore();

  if (!isStreaming || phase === 'idle' || phase === 'done') return null;

  const dotClass =
    phase === 'thinking'
      ? 'bg-sy-warn animate-pulse'
      : phase === 'organizing'
        ? 'bg-sy-text-3 animate-[blink_1s_infinite]'
        : 'bg-sy-accent animate-pulse';

  return (
    <div className="flex items-center gap-2 text-[12px] text-sy-text-2 py-1">
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span>{phaseLabel}</span>
    </div>
  );
}
```

**Step 2: 在分析台和工作台引入组件**

在 `frontend/src/app/(main)/diagnosis/[id]/page.tsx` 的流式输出区域添加 `<AiStreamStatus />`（置于 ThinkingStream 之前）。

在 `frontend/src/app/(main)/workbench/[id]/page.tsx` 同样位置添加。

**Step 3: 运行类型检查**

```bash
cd frontend && bunx tsc --noEmit
```

**Step 4: Commit**

```bash
git add frontend/src/components/ui/AiStreamStatus.tsx \
        frontend/src/app/(main)/diagnosis/[id]/page.tsx \
        frontend/src/app/(main)/workbench/[id]/page.tsx
git commit -m "feat: add AiStreamStatus 3-phase indicator"
```

---

## Phase 3：WorkflowStepper 组件

### Task 9：创建 WorkflowStepper 组件

**Files:**
- Create: `frontend/src/components/workflow/WorkflowStepper.tsx`

**Step 1: 定义步骤数据结构**

```tsx
'use client';
import { Check } from 'lucide-react';
import Link from 'next/link';

export interface WorkflowStep {
  id: number;
  label: string;
  href?: string;
  status: 'done' | 'current' | 'pending';
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  className?: string;
}
```

**Step 2: 实现组件（创建完整文件）**

```tsx
'use client';
import { Check } from 'lucide-react';
import Link from 'next/link';

export interface WorkflowStep {
  id: number;
  label: string;
  href?: string;
  status: 'done' | 'current' | 'pending';
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  className?: string;
}

export function WorkflowStepper({ steps, className = '' }: WorkflowStepperProps) {
  return (
    <div className={`flex items-center gap-0 ${className}`}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const dotClass =
          step.status === 'done'
            ? 'bg-sy-accent border-sy-accent text-sy-bg'
            : step.status === 'current'
              ? 'border-sy-accent bg-transparent text-sy-accent'
              : 'border-sy-border-2 bg-transparent text-sy-text-3';

        const labelClass =
          step.status === 'done'
            ? 'text-sy-accent'
            : step.status === 'current'
              ? 'text-sy-text font-medium'
              : 'text-sy-text-3';

        const lineClass =
          step.status === 'done' || (idx > 0 && steps[idx - 1]?.status === 'done')
            ? 'bg-sy-accent'
            : 'bg-sy-border';

        const content = (
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-mono transition-colors ${dotClass}`}
            >
              {step.status === 'done' ? <Check className="w-3 h-3" /> : step.id}
            </div>
            <span className={`text-[11px] transition-colors ${labelClass}`}>{step.label}</span>
          </div>
        );

        return (
          <div key={step.id} className="flex items-start">
            {step.href && step.status !== 'pending' ? (
              <Link href={step.href} className="hover:opacity-80 transition-opacity">
                {content}
              </Link>
            ) : (
              content
            )}
            {!isLast && (
              <div
                className={`w-16 h-[2px] mt-3 mx-1 transition-colors ${lineClass}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Step 3: 运行类型检查**

```bash
cd frontend && bunx tsc --noEmit
```

**Step 4: Commit**

```bash
git add frontend/src/components/workflow/WorkflowStepper.tsx
git commit -m "feat: add WorkflowStepper component"
```

---

### Task 10：在分析台集成 WorkflowStepper

**Files:**
- Modify: `frontend/src/app/(main)/analysis/page.tsx`

**Step 1: 读取分析台页面，找到需求详情区域**

**Step 2: 根据需求状态字段计算步骤**

在页面中添加以下工具函数：

```typescript
import type { WorkflowStep } from '@/components/workflow/WorkflowStepper';

function getWorkflowSteps(req: RequirementDetail, reqId: string): WorkflowStep[] {
  const diagnosisDone = req.diagnosis_status === 'completed';
  const sceneMapDone = req.scene_map_status === 'confirmed';
  // 用例是否已生成：通过 testcase count 判断，此处简化为 scene_map_done
  const casesDone = false; // 由父组件传入实际值

  return [
    {
      id: 1,
      label: '需求准备',
      href: `/analysis?req=${reqId}`,
      status: 'done',
    },
    {
      id: 2,
      label: 'AI 分析',
      href: `/analysis/diagnosis/${reqId}`,
      status: diagnosisDone ? 'done' : 'current',
    },
    {
      id: 3,
      label: '确认测试点',
      href: `/analysis/scene-map/${reqId}`,
      status: diagnosisDone && sceneMapDone ? 'done' : diagnosisDone ? 'current' : 'pending',
    },
    {
      id: 4,
      label: '生成用例',
      href: `/workbench/${reqId}`,
      status: sceneMapDone ? 'current' : 'pending',
    },
  ];
}
```

**Step 3: 在需求详情面板顶部渲染 WorkflowStepper**

```tsx
import { WorkflowStepper } from '@/components/workflow/WorkflowStepper';

// 在需求信息下方，Tab 上方位置插入：
{selectedReq && (
  <div className="px-4 py-3 border-b border-sy-border">
    <WorkflowStepper steps={getWorkflowSteps(selectedReq, selectedReq.id)} />
  </div>
)}
```

**Step 4: 运行类型检查**

```bash
cd frontend && bunx tsc --noEmit
```

**Step 5: Commit**

```bash
git add frontend/src/app/(main)/analysis/page.tsx
git commit -m "feat: integrate WorkflowStepper into analysis page"
```

---

## Phase 4：SmartNextCard 组件

### Task 11：创建 SmartNextCard 组件

**Files:**
- Create: `frontend/src/components/workflow/SmartNextCard.tsx`

**Step 1: 实现组件**

```tsx
'use client';
import { ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface SmartNextCardProps {
  /** SSE 流完成后触发显示 */
  show: boolean;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  onClose?: () => void;
}

/**
 * AI 任务完成后浮出的引导卡片。
 * 在 SSE done 事件后 500ms 延迟显示，用户点击 CTA 或关闭后隐藏。
 */
export function SmartNextCard({
  show,
  title,
  description,
  ctaLabel,
  ctaHref,
  onClose,
}: SmartNextCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, [show]);

  if (!visible) return null;

  return (
    <div className="mt-4 rounded-xl border border-sy-accent/30 bg-sy-accent/5 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-sy-text">{title}</p>
          <p className="mt-0.5 text-[12px] text-sy-text-2">{description}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              onClose();
            }}
            className="text-sy-text-3 hover:text-sy-text-2 transition-colors mt-0.5"
            aria-label="关闭引导"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="mt-3">
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-sy-accent hover:text-sy-accent-2 transition-colors"
        >
          {ctaLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
```

**Step 2: 运行类型检查**

```bash
cd frontend && bunx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend/src/components/workflow/SmartNextCard.tsx
git commit -m "feat: add SmartNextCard guided next-step component"
```

---

### Task 12：在分析台 SSE 流完成后显示 SmartNextCard

**Files:**
- Modify: `frontend/src/app/(main)/diagnosis/[id]/page.tsx`

**Step 1: 读取完整文件，找到 SSE 完成后的逻辑**

读取 `frontend/src/app/(main)/diagnosis/[id]/page.tsx` 完整内容。

**Step 2: 增加 streamDone 状态跟踪**

在组件 state 中添加：
```typescript
const [streamDone, setStreamDone] = useState(false);
```

在调用 `streamSSE` 的地方，执行完成后 `setStreamDone(true)`，开始新一轮时 `setStreamDone(false)`。

**Step 3: 在内容区末尾渲染 SmartNextCard**

```tsx
import { SmartNextCard } from '@/components/workflow/SmartNextCard';

// 在消息列表末尾、输入框之前：
<SmartNextCard
  show={streamDone && !isStreaming}
  title="AI 分析完成"
  description="下一步：确认 AI 识别的测试点，再进入工作台生成用例"
  ctaLabel="前往确认测试点"
  ctaHref={`/analysis/scene-map/${id}`}
  onClose={() => setStreamDone(false)}
/>
```

**Step 4: 运行类型检查**

```bash
cd frontend && bunx tsc --noEmit
```

**Step 5: Commit**

```bash
git add frontend/src/app/(main)/diagnosis/[id]/page.tsx
git commit -m "feat: show SmartNextCard after analysis SSE completion"
```

---

### Task 13：在工作台 SSE 流完成后显示 SmartNextCard

**Files:**
- Modify: `frontend/src/app/(main)/workbench/[id]/page.tsx`

**Step 1: 同 Task 12，增加 streamDone 状态**

**Step 2: 在用例生成完成后显示引导**

```tsx
<SmartNextCard
  show={streamDone && !isStreaming}
  title="用例生成完成"
  description="已生成用例，可前往用例库查看完整列表或导出"
  ctaLabel="前往用例库"
  ctaHref="/testcases"
  onClose={() => setStreamDone(false)}
/>
```

**Step 3: Commit**

```bash
git add frontend/src/app/(main)/workbench/[id]/page.tsx
git commit -m "feat: show SmartNextCard after case generation completion"
```

---

## Phase 5：页面过渡动画

### Task 14：在 (main)/layout.tsx 添加页面过渡层

**Files:**
- Modify: `frontend/src/app/(main)/layout.tsx`

**Step 1: 创建 PageTransition 客户端组件**

由于 layout.tsx 已是 'use client'，直接在文件内定义：

```typescript
// 在文件顶部 import 区增加：
import { useEffect, useState } from 'react'; // 已存在，确认即可
```

**Step 2: 新建独立文件 `_components/PageTransition.tsx`**

路径：`frontend/src/app/(main)/_components/PageTransition.tsx`

```tsx
'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 150ms ease-out, transform 150ms ease-out',
      }}
    >
      {children}
    </div>
  );
}
```

**Step 3: 在 layout.tsx 中包裹 children**

```tsx
import { PageTransition } from './_components/PageTransition';

// 原来：
{children}

// 改为：
<PageTransition>{children}</PageTransition>
```

**Step 4: 运行类型检查**

```bash
cd frontend && bunx tsc --noEmit
```

**Step 5: Commit**

```bash
git add frontend/src/app/(main)/_components/PageTransition.tsx \
        frontend/src/app/(main)/layout.tsx
git commit -m "feat: add 150ms page transition animation"
```

---

## Phase 6：Toast 规范化

### Task 15：确认 sonner 已集成，统一 Toast 用法

**Files:**
- Read: `frontend/src/app/layout.tsx`（确认 Toaster 位置）
- Modify: 各模块中不规范的 toast 调用

**Step 1: 读取根 layout 确认 Toaster 已挂载**

检查 `frontend/src/app/layout.tsx` 是否包含 `<Toaster />`。

**Step 2: 全局搜索非规范 toast 用法**

```bash
cd frontend && grep -rn "alert\|confirm\|window.alert" src/app --include="*.tsx" | grep -v ".test."
```

**Step 3: 替换为规范 toast**

凡是 `alert(msg)` 的操作成功提示，改为：
```typescript
import { toast } from 'sonner';
toast.success('操作成功'); // 3s 自动消失
```

凡是 `alert(msg)` 的操作失败提示，改为：
```typescript
toast.error('操作失败，请稍后重试'); // 5s 或手动关闭
```

**Step 4: 运行类型检查**

```bash
cd frontend && bunx tsc --noEmit
```

**Step 5: Commit**

```bash
git add -A
git commit -m "ux: standardize toast notifications using sonner"
```

---

## Phase 7：骨架屏扩展

### Task 16：为分析台需求列表添加骨架屏

**Files:**
- Read: `frontend/src/components/ui/TableSkeleton.tsx`（了解现有实现）
- Modify: `frontend/src/app/(main)/analysis/page.tsx`

**Step 1: 读取 TableSkeleton.tsx 了解现有骨架屏 API**

**Step 2: 在需求列表加载期间显示骨架屏**

在 `analysis/page.tsx` 中，当 `requirements` 查询处于 `isLoading` 状态时，渲染 `<TableSkeleton rows={5} />`，替代空白等待。

```tsx
import { TableSkeleton } from '@/components/ui/TableSkeleton';

// 在渲染需求列表的位置：
{requirementsLoading ? (
  <TableSkeleton rows={5} />
) : requirements?.length === 0 ? (
  <EmptyState title="还没有需求" description="从录入或上传文档开始" />
) : (
  // 正常列表渲染
)}
```

**Step 3: 同样处理工作台测试点列表**

在 `workbench/[id]/page.tsx` 中的测试点区域同理。

**Step 4: Commit**

```bash
git add frontend/src/app/(main)/analysis/page.tsx \
        frontend/src/app/(main)/workbench/[id]/page.tsx
git commit -m "ux: add skeleton screens for requirements and test points lists"
```

---

## Phase 8：Kimi K2 模型验证（手动步骤）

### Task 17：在设置页配置硅基流动 Kimi K2

**这是一个手动验证任务，不需要代码变更。**

**Step 1: 打开设置页 `/settings`**

点击「AI 模型配置」Tab。

**Step 2: 新增模型配置**

点击「添加模型」，填写：
- 名称：`Kimi K2`
- Provider：`custom`（OpenAI 兼容）
- Model ID：`kimi-k2-5`（或硅基流动实际 model ID，查看 [硅基流动文档](https://docs.siliconflow.cn)）
- Base URL：`https://api.siliconflow.cn/v1`
- API Key：填入硅基流动 API Key
- 勾选「设为默认」

**Step 3: 用 Story-15602.md 跑完整链路**

1. 上传需求文档 → 需求解析
2. 分析台 → 点击「开始分析」→ 观察 AI 输出质量
3. 确认测试点 → 进入工作台 → 生成用例
4. 观察：中文流畅度、分析深度、用例格式规范性

**Step 4: 对比 GLM-4-Flash 输出**

若 Kimi K2 输出明显更好，在 AI 配置中保持 Kimi K2 为默认；否则回切 GLM-4-Flash。

**Step 5: 记录验证结论**

在本任务下方记录对比结论，以备 Prompt 调优参考。

---

## 验收标准

完成所有 Task 后，打开浏览器验证以下场景：

| 验收项 | 预期行为 |
|--------|---------|
| 分析台空状态 | 显示"还没有分析过这个需求"+ 行动按钮，不显示"暂无数据" |
| AI 分析开始 | 立即显示"正在理解需求结构..."脉冲动画 |
| AI 生成中 | 文字流式渲染，状态标签切换为"正在生成内容..." |
| AI 完成 | 短暂显示"正在整理分析结果..."后变为静止结果 |
| SSE done 后 | 500ms 后浮出 SmartNextCard 引导卡 |
| WorkflowStepper | 分析台顶部显示 4 步进度，当前步骤高亮 |
| 页面切换 | 有 150ms 淡入+上移动画，不再"闪现" |
| Toast 成功 | 右上角绿色 toast，3s 自动消失 |
| Toast 失败 | 右上角红色 toast，5s 或手动关闭 |
| 骨架屏 | 列表加载时显示骨架屏，不显示空白 |
