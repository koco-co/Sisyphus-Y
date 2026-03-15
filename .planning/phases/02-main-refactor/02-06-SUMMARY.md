---
phase: 02-main-refactor
plan: "06"
subsystem: ui
tags: [analysis, copy, i18n, AiConfigBanner, empty-state]

# Dependency graph
requires:
  - phase: 02-main-refactor/02-02
    provides: AnalysisLeftPanel + AnalysisRightPanel + three-tab layout
  - phase: 02-main-refactor/02-03
    provides: AnalysisTab with useDiagnosis hook wired in
provides:
  - "分析台全局「诊断」→「分析」文案替换完成 (ANA-01)"
  - "AiConfigBanner 挂载到分析台顶部"
  - "AnalysisLeftPanel 和 AnalysisRightPanel 空状态页改进"
affects: [03-ai-quality, 04-extended-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AiConfigBanner 通过 useAiConfig().modelConfigs 检测已启用模型，与工作台使用方式一致"
    - "AnalysisLeftPanel height 从 calc(100vh-49px) 改为 100%，由父容器 flex 布局控制"

key-files:
  created: []
  modified:
    - frontend/src/app/(main)/analysis/_components/AnalysisTab.tsx
    - frontend/src/app/(main)/analysis/_components/AnalysisLeftPanel.tsx
    - frontend/src/app/(main)/analysis/_components/AnalysisRightPanel.tsx
    - frontend/src/app/(main)/analysis/page.tsx
    - frontend/src/app/(main)/settings/_components/AIModelSettings.tsx

key-decisions:
  - "AnalysisLeftPanel height: 100% (非 calc(100vh-49px)) — 由 page.tsx flex 容器决定高度，避免 AiConfigBanner 出现时高度溢出"
  - "Biome errors in workbench/TestPointGroupList.tsx 属于 Plan 05 遗留、超出本计划范围，记录为 deferred"

patterns-established:
  - "AiConfigBanner pattern: useAiConfig().modelConfigs.some(m => m.is_enabled && m.model_id) 检测是否已配置"

requirements-completed: [ANA-01]

# Metrics
duration: 7min
completed: 2026-03-15
---

# Phase 2 Plan 06: Copy Rename & Analysis Page Polish Summary

**全局「诊断」→「分析」文案替换 + 分析台空状态、AiConfigBanner 挂载完成，分析台 Phase 2 收尾**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-15T12:30:32Z
- **Completed:** 2026-03-15T12:37:52Z
- **Tasks:** 2 (+ checkpoint awaiting human-verify)
- **Files modified:** 5

## Accomplishments

- 全局文案替换：`AnalysisTab.tsx` 的「健康分」→「分析分」；`AIModelSettings.tsx` 的 3 处「诊断」→「分析/分析模型」；导航栏已是「分析台」无需改动
- `AiConfigBanner` 挂载到 `analysis/page.tsx` 顶部，无 AI 配置时显示警告横幅
- 空状态改进：`AnalysisLeftPanel` 无产品时显示 FileText 图标 + 「前往添加」按钮；`AnalysisRightPanel` 未选需求时换 MousePointerClick 图标 + 更准确文案
- TypeScript 全量检查 0 errors；analysis/ 目录 Biome 0 errors

## Task Commits

1. **Task 1: 前端全局「诊断」→「分析」文案扫描与替换** - `c524e62` (feat)
2. **Task 2: 分析台收尾——空状态页、AiConfigBanner、TypeScript 最终检查** - `f2893ef` (feat)

**Plan metadata:** (待 checkpoint 批准后提交)

## Files Created/Modified

- `frontend/src/app/(main)/analysis/_components/AnalysisTab.tsx` - 「健康分」→「分析分」文案替换
- `frontend/src/app/(main)/analysis/_components/AnalysisLeftPanel.tsx` - 空状态改进 + FileText 图标 + 「前往添加」按钮；height 改为 100%
- `frontend/src/app/(main)/analysis/_components/AnalysisRightPanel.tsx` - 空状态改用 MousePointerClick 图标
- `frontend/src/app/(main)/analysis/page.tsx` - 引入 AiConfigBanner + useAiConfig；布局改为 flex-col 以支持 banner
- `frontend/src/app/(main)/settings/_components/AIModelSettings.tsx` - 3 处「诊断」→「分析/分析模型/分析主模型」

## Decisions Made

- `AnalysisLeftPanel` 原有 `height: calc(100vh - 49px)` 硬编码，banner 出现后高度会溢出。改为 `height: 100%` 由父 flex 容器控制，与 `AnalysisRightPanel` 保持一致。
- 后端 `router.py` 注释均为英文 (`"Check whether a diagnosis report exists"`)，不含中文「诊断」，跳过修改。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AnalysisLeftPanel 高度硬编码导致 AiConfigBanner 出现时溢出**
- **Found during:** Task 2 (AiConfigBanner 挂载)
- **Issue:** AnalysisLeftPanel 使用 `height: 'calc(100vh - 49px)'` 硬编码，引入 banner 后父容器高度减少但面板未随之收缩
- **Fix:** 改为 `height: '100%'`，由 page.tsx 的 `flex-col` 容器控制实际高度
- **Files modified:** `frontend/src/app/(main)/analysis/_components/AnalysisLeftPanel.tsx`
- **Verification:** Biome/TSC 均无报错
- **Committed in:** f2893ef (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 Bug)
**Impact on plan:** 布局正确性修复，无范围蔓延。

## Issues Encountered

- `workbench/TestPointGroupList.tsx` 存在 5 个 Biome a11y errors，属于 Plan 05 遗留文件，超出本计划修改范围。已记录为 deferred，不修复。

## Checkpoint Status

本计划在 Task 2 完成后到达 `checkpoint:human-verify`，等待人工验收分析台完整体验。

## Next Phase Readiness

- Phase 2 分析台主链路（M03/M04）交付完整：需求列表 + 三 Tab + AI 分析 + 文案统一
- Plan 04/05 (工作台) 有未提交变动（Plan 05 产物），需在 Phase 2 收尾时一并提交
- Phase 3 RAG/Prompt 工作可在分析台稳定后开展

---
*Phase: 02-main-refactor*
*Completed: 2026-03-15*
