---
phase: 02-main-refactor
plan: "05"
subsystem: ui
tags: [nextjs, sse, streaming, zustand, workbench, test-generation]

# Dependency graph
requires:
  - phase: 02-main-refactor
    plan: "04"
    provides: workspace-store (appendTestCases, lastGeneratedPointIds, setLastGeneratedPointIds), WorkbenchStepBar with onStepClick, TestPointGroupList with onStartGenerate
provides:
  - GenerationPanel — Step2 中栏 SSE 流式生成（ThinkingStream + CaseCard 逐块渲染）
  - GeneratedCasesByPoint — Step2 右栏按测试点分组实时用例列表
  - workbench/page.tsx Step2 完整逻辑：首次生成 + 追加生成差集计算 + 步骤条回退
affects:
  - 02-main-refactor Phase 3 RAG/Prompt 优化（依赖 Step2 SSE 已稳定）
  - 后续工作台迭代

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SSE 两步启动：先 POST /api/generation/sessions 获取 sessionId，再 streamSSE 到 /generation/sessions/{id}/chat
    - 追加生成差集：checkedPointIds - lastGeneratedPointIds，只传新增 ID，appendTestCases 不覆盖
    - 步骤条回退保留状态：setViewStep(1) 不重置 testCases 和 lastGeneratedPointIds

key-files:
  created:
    - frontend/src/app/(main)/workbench/_components/GenerationPanel.tsx
    - frontend/src/app/(main)/workbench/_components/GeneratedCasesByPoint.tsx
  modified:
    - frontend/src/app/(main)/workbench/page.tsx

key-decisions:
  - "GenerationPanel 追加模式判断用 isAppend ref 而非依赖 lastGeneratedPointIds.size，避免 handleStartGenerate 更新快照后判断时序错误"
  - "GeneratedCasesByPoint 流式期间计数动画仅在 isStreaming 时显示，避免稳定状态下闪烁"

patterns-established:
  - "SSE 两步启动模式：POST session → streamSSE chat（workbench 主链路标准）"
  - "追加生成差集计算：Set difference 算法，lastGeneratedPointIds 快照在点击生成时更新"

requirements-completed:
  - WRK-05
  - WRK-06
  - WRK-07

# Metrics
duration: ~30min
completed: 2026-03-15
---

# Phase 02 Plan 05: Workbench Step2 SSE Generation Summary

**工作台 Step2 完整实现：SSE 流式生成（ThinkingStream + CaseCard 渲染）+ 右栏实时分组统计 + 回到 Step1 追加生成不覆盖已有用例**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-15T12:41:00Z
- **Completed:** 2026-03-15T13:15:00Z
- **Tasks:** 2 (+ 1 checkpoint:human-verify, approved)
- **Files modified:** 3

## Accomplishments

- GenerationPanel.tsx：两步 SSE 启动（POST session → stream chat），thinking 折叠块 + CaseCard 逐块渲染，错误时提供重试按钮
- GeneratedCasesByPoint.tsx：按 test_point_id 分组展示用例，右上角实时计数，流式期间动态动画
- workbench/page.tsx：handleStartGenerate 实现首次/追加两路逻辑，差集计算只传新增测试点 ID，步骤条 onStepClick 回退到 Step1 不清空已有用例

## Task Commits

Each task was committed atomically:

1. **Task 1: GenerationPanel — Step2 中栏 SSE 流式输出** - `a97819b` (feat)
2. **Task 2: GeneratedCasesByPoint + 追加生成逻辑** - `d0a30e2` (feat)
3. **Task 3: checkpoint:human-verify** - approved by user (no code commit)

## Files Created/Modified

- `frontend/src/app/(main)/workbench/_components/GenerationPanel.tsx` - Step2 中栏：SSE 启动、ThinkingStream、CaseCard 渲染、错误重试
- `frontend/src/app/(main)/workbench/_components/GeneratedCasesByPoint.tsx` - Step2 右栏：按测试点分组列表，实时计数
- `frontend/src/app/(main)/workbench/page.tsx` - 追加生成逻辑整合，差集计算，步骤条回退

## Decisions Made

- GenerationPanel 内用 `isAppend` ref 记录「本次是否为追加模式」，在 handleStartGenerate 调用前设置，避免异步时序问题导致判断错误
- GeneratedCasesByPoint 的 isStreaming 动画只影响计数徽章闪烁，不影响已渲染用例卡片，保持视觉稳定性

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 工作台主链路（分析台 → 工作台 Step1 → Step2）端到端流程已完整实现，人工验收通过
- Phase 3 RAG/Prompt 优化可以开始（依赖 Step2 SSE 已稳定）
- 追加生成模式已通过人工验证，差集计算逻辑正确

---
*Phase: 02-main-refactor*
*Completed: 2026-03-15*
