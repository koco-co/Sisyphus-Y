---
phase: 04-wai-wei-mo-kuai-kuo-zhan
plan: "09"
subsystem: diff
tags: [diff, requirements, side-by-side, publish-version, push-to-workbench, semantic-analysis]

requires:
  - phase: 04-02
    provides: change_impact field on TestCase, push_to_workbench API

provides:
  - POST /products/requirements/{id}/publish-version endpoint (snapshot + version increment + background diff trigger)
  - PublishVersionDialog component with version note textarea
  - EditorToolbar publish-version button with reqId prop
  - DiffView side-by-side grid layout with parseSideBySide() function
  - AffectedCases change_impact Badge (needs_rewrite/needs_review/not_affected) + push-to-workbench button
  - SemanticAnalysis cards supporting both legacy SemanticImpact and new change_summary format

affects: [diff, workbench, requirements]

tech-stack:
  added: []
  patterns:
    - BackgroundTasks pattern for async Diff trigger after publish-version
    - Side-by-side diff parsing: del/add pairs merged into 'modified' type for aligned display
    - Dual badge system: change_impact (canonical) with impact_type (legacy) fallback

key-files:
  created:
    - frontend/src/app/(main)/requirements/_components/PublishVersionDialog.tsx
  modified:
    - backend/app/modules/products/service.py
    - backend/app/modules/products/router.py
    - backend/app/modules/products/schemas.py
    - frontend/src/app/(main)/requirements/_components/EditorToolbar.tsx
    - frontend/src/app/(main)/requirements/[id]/page.tsx
    - frontend/src/app/(main)/diff/_components/DiffView.tsx
    - frontend/src/app/(main)/diff/_components/AffectedCases.tsx
    - frontend/src/app/(main)/diff/_components/SemanticAnalysis.tsx
    - frontend/src/stores/diff-store.ts
    - frontend/src/app/(main)/diff/page.tsx

key-decisions:
  - "publish_version 快照后版本号递增，BackgroundTasks 异步触发 Diff 不阻塞请求，Diff 失败静默处理"
  - "parseSideBySide 将相邻 del+add 行合并为 modified 类型实现对齐显示，而非单独渲染"
  - "AffectedCases 双字段兼容：change_impact（后端规范值域）优先，impact_type（旧字段）作兜底"
  - "SemanticAnalysis 同时支持 SemanticImpact（旧格式）和 changeSummary（新 change_type/summary/business_impact 格式）"

patterns-established:
  - "Toolbar action gated on optional prop: reqId passed only when in requirement detail context"
  - "Side-by-side diff: grid-cols-2, del/ctx in left cell, add/ctx in right cell, modified in both"

requirements-completed: [DIF-01, DIF-02, DIF-03, DIF-04, DIF-05]

duration: 6min
completed: 2026-03-16
---

# Phase 4 Plan 09: Diff 完整链路 Summary

**Diff 完整链路：publish-version 端点 + 并排 DiffView + change_impact Badge + 一键推送工作台 + SemanticAnalysis 语义卡片**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-16T10:40:36Z
- **Completed:** 2026-03-16T10:46:xx Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- 后端新增 `POST /products/requirements/{id}/publish-version`：快照当前需求内容、版本号+1、BackgroundTasks 异步触发 Diff 计算
- 前端 `PublishVersionDialog` + EditorToolbar「发布新版本」按钮：成功后跳转 `/diff` 页面
- DiffView 升级为并排视图（`parseSideBySide` 函数，del红/add绿/modified黄，超3行未变更段落默认折叠）
- AffectedCases 添加 `change_impact` Badge（needs_rewrite/needs_review/not_affected）和「一键推送到工作台」按钮（toast 显示推送数量）
- SemanticAnalysis 支持新 `change_summary` 格式（change_type/summary/business_impact 卡片），兼容旧 SemanticImpact 格式

## Task Commits

1. **Task 1: 发布新版本后端端点** - `d1cc4b6` (feat)
2. **Task 2: 发布新版本前端入口** - `ec8143e` (feat)
3. **Task 3: 并排 DiffView + Badge + 推送 + SemanticAnalysis** - `62581ff` (feat)

## Files Created/Modified

- `backend/app/modules/products/schemas.py` - 新增 PublishVersionRequest / PublishVersionResponse
- `backend/app/modules/products/service.py` - 新增 RequirementService.publish_version()
- `backend/app/modules/products/router.py` - 新增 POST /requirements/{id}/publish-version 端点
- `frontend/src/app/(main)/requirements/_components/PublishVersionDialog.tsx` - 发布新版本对话框（新建）
- `frontend/src/app/(main)/requirements/_components/EditorToolbar.tsx` - 添加 reqId prop 和「发布新版本」按钮
- `frontend/src/app/(main)/requirements/[id]/page.tsx` - 传递 reqId 给 EditorToolbar
- `frontend/src/app/(main)/diff/_components/DiffView.tsx` - 升级为并排视图，parseSideBySide 函数
- `frontend/src/app/(main)/diff/_components/AffectedCases.tsx` - change_impact Badge + push-to-workbench 按钮
- `frontend/src/app/(main)/diff/_components/SemanticAnalysis.tsx` - 支持 changeSummary 新格式
- `frontend/src/stores/diff-store.ts` - AffectedTestCase 添加 change_impact 可选字段
- `frontend/src/app/(main)/diff/page.tsx` - RightColumn 传递 requirementId 给 AffectedCases

## Decisions Made

- `publish_version` 使用 BackgroundTasks 异步触发 Diff，避免阻塞请求；Diff 失败静默处理（catch 后 pass）
- `parseSideBySide` 将相邻 del+add 行对合并为 `modified` 类型，对齐渲染双侧高亮
- AffectedCases 使用 `change_impact` 优先、`impact_type` 兜底的双字段兼容策略
- SemanticAnalysis 同时支持新旧两种数据格式，向后兼容

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

- Diff 完整链路 DIF-01~05 已全部实现
- 需求发布版本 → 自动 Diff → 受影响用例打标 → 推送工作台 闭环完成
- SemanticAnalysis 等待后端 compute_diff 返回 change_summary 字段时自动展示

---
*Phase: 04-wai-wei-mo-kuai-kuo-zhan*
*Completed: 2026-03-16*
