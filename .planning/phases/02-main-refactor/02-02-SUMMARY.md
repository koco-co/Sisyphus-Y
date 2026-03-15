---
phase: 02-main-refactor
plan: "02"
subsystem: ui
tags: [nextjs, react, analysis-page, url-state, drag-resize, requirement-tree]

requires:
  - phase: 02-main-refactor/02-01
    provides: backend diagnosis/scene-map endpoints that right panel consumes

provides:
  - /analysis route rendered as independent two-column layout (no longer re-exports /requirements)
  - AnalysisLeftPanel: requirement tree with product/iteration grouping, search filter, drag-resize
  - AnalysisRightPanel: three-tab persistent DOM container (detail/analysis/coverage)
  - URL state persistence via ?reqId + ?tab query params

affects:
  - 02-03 (right panel workbench button logic, AnalysisTab reqTitle enhancement)
  - 02-04 (coverage tab content enhancement)

tech-stack:
  added: []
  patterns:
    - "Three-tab persistent DOM: absolute inset-0 with hidden class toggle — no unmount on tab switch"
    - "URL state persistence: useState initialized from useSearchParams, router.push on change"
    - "Drag resize: onMouseDown + mousemove window listener, min/max clamped with Math.min/max"
    - "Suspense wrapper for useSearchParams in page components"

key-files:
  created:
    - frontend/src/app/(main)/analysis/_components/AnalysisLeftPanel.tsx
    - frontend/src/app/(main)/analysis/_components/AnalysisRightPanel.tsx
  modified:
    - frontend/src/app/(main)/analysis/page.tsx
    - frontend/src/app/(main)/analysis/layout.tsx

key-decisions:
  - "AnalysisRightPanel mounts useDiagnosis internally (scoped to selectedReqId) rather than lifting to page — avoids prop drilling of SSE state"
  - "RightPanelContent extracted as inner component so useDiagnosis only instantiates when a requirement is selected"
  - "Drag handle uses button element (not div) to satisfy Biome a11y lint rule noStaticElementInteractions"

patterns-established:
  - "Tab persistent DOM pattern: absolute inset-0 + hidden class toggle — established in diagnosis/page.tsx, reused here"
  - "URL persistence pattern: useState(searchParams.get('x')) + router.push on every state change"

requirements-completed:
  - ANA-02
  - ANA-03
  - ANA-06

duration: 25min
completed: 2026-03-15
---

# Phase 02 Plan 02: Analysis Page Layout Skeleton Summary

**独立三栏分析台骨架：/analysis 从 re-export 重建为带 URL 状态持久化的左右双栏布局，左栏支持需求树、搜索、拖拽调宽，右栏三 Tab 常驻 DOM**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-15T12:20:00Z
- **Completed:** 2026-03-15T12:45:00Z
- **Tasks:** 3
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- /analysis 路由完全独立，不再 re-export /requirements，渲染两栏布局（左侧需求面板 + 右侧 Tab 区域）
- AnalysisLeftPanel 实现产品/迭代/需求三级树（默认全部折叠），搜索过滤需求标题，拖拽手柄调整宽度（200-320px）
- AnalysisRightPanel 三 Tab（需求详情/AI 分析/覆盖追踪）常驻 DOM，切换不卸载，选中需求和 Tab 均写入 URL 参数实现刷新恢复

## Task Commits

1. **Task 1: 重建 analysis/page.tsx 为三栏布局容器** - `72ece60` (feat)
2. **Task 2: AnalysisLeftPanel 需求列表、迭代分组、搜索、拖拽调宽** - `875d166` (feat)
3. **Task 3: AnalysisRightPanel 三 Tab 常驻 DOM 容器** - `5131292` (feat)

## Files Created/Modified

- `frontend/src/app/(main)/analysis/page.tsx` - 重建为 AnalysisPageInner（useSearchParams + URL 持久化），外层 Suspense 包装
- `frontend/src/app/(main)/analysis/layout.tsx` - 移除旧路由导航栏，简化为透明 Layout
- `frontend/src/app/(main)/analysis/_components/AnalysisLeftPanel.tsx` - 需求树面板（搜索 + 拖拽 + 迭代分组）
- `frontend/src/app/(main)/analysis/_components/AnalysisRightPanel.tsx` - 三 Tab 容器，内置 useDiagnosis，复用 diagnosis/_components

## Decisions Made

- `AnalysisRightPanel` 将 `useDiagnosis` 封装在 `RightPanelContent` 内部组件中，避免 selectedReqId 为 null 时初始化 hook，符合 React hooks 规则
- 拖拽手柄改用 `<button>` 元素以通过 Biome a11y lint 规则（`noStaticElementInteractions`）
- `reqTitle` 暂时传空字符串给 AnalysisTab（Plan 03 从 useRequirement 获取后填充）

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AnalysisTab/AnalysisRightPanel props 适配**
- **Found during:** Task 3 (创建 AnalysisRightPanel)
- **Issue:** 计划中 AnalysisTab props 为 `requirementId + visible`，实际组件签名为 `reqId + reqTitle + report + messages + sse + loading + ...`
- **Fix:** AnalysisRightPanel 内置 `useDiagnosis` hook 并传入正确 props，reqTitle 暂时为空字符串
- **Files modified:** AnalysisRightPanel.tsx
- **Verification:** TypeScript 无错误
- **Committed in:** 5131292

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** 必要适配，计划中 interface 描述与实际实现不一致，无 scope 蔓延。

## Issues Encountered

- 现有 `analysis/_components/AnalysisTab.tsx` 已存在（非本 plan 创建），其中有预存在的 Biome a11y 错误（line 414: `noStaticElementInteractions`）。该文件不属于本 plan scope，已记录为 deferred item。

## Next Phase Readiness

- /analysis 三栏骨架完整，Plan 03 可直接填充右侧工作台按钮逻辑（hasUnhandledHighRisk 置灰）
- AnalysisTab 的 `reqTitle` 目前传空字符串，Plan 03 需补充从 useRequirement 获取需求标题的逻辑
- 左栏 StatusBadge 使用 `analysis_status` 字段（可能不存在于 API 响应），Plan 03 确认后端字段名

---
*Phase: 02-main-refactor*
*Completed: 2026-03-15*

## Self-Check: PASSED

- FOUND: frontend/src/app/(main)/analysis/page.tsx
- FOUND: frontend/src/app/(main)/analysis/_components/AnalysisLeftPanel.tsx
- FOUND: frontend/src/app/(main)/analysis/_components/AnalysisRightPanel.tsx
- FOUND: commit 72ece60 (Task 1)
- FOUND: commit 875d166 (Task 2)
- FOUND: commit 5131292 (Task 3)
