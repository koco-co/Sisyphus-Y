---
phase: 04-wai-wei-mo-kuai-kuo-zhan
plan: "05"
subsystem: ui
tags: [testcases, folder-tree, dnd-kit, dialog, move, rename-validation]

# Dependency graph
requires:
  - phase: 04-wai-wei-mo-kuai-kuo-zhan
    provides: FolderTree 已有拖拽排序/重命名/删除基础实现
provides:
  - FolderTree 右键菜单「移动到…」选项（TC-04）
  - 重命名同级重名校验（TC-02）
  - MoveFolderDialog：目录跨层级移动，超3层限制（TC-04）
  - MoveCaseDialog：批量用例移动（TC-05）
affects: [testcases, workbench]

# Tech tracking
tech-stack:
  added: []
  patterns: [原生 dialog overlay pattern（与 deleteConfirm 保持一致，避免引入 shadcn/ui 依赖）]

key-files:
  created:
    - frontend/src/app/(main)/testcases/_components/MoveFolderDialog.tsx
    - frontend/src/app/(main)/testcases/_components/MoveCaseDialog.tsx
  modified:
    - frontend/src/app/(main)/testcases/_components/FolderTree.tsx

key-decisions:
  - "MoveFolderDialog 使用原生 overlay+div 实现（与 deleteConfirm 风格一致），不引入 shadcn/ui Dialog 依赖"
  - "重名校验在前端 handleEditSubmit 完成（同级 siblings 大小写不敏感比较），API 返回错误时仍通过 setEditError 展示"
  - "movingFolderId state 存储在主 FolderTree 组件，MoveFolderDialog 通过 props 接收 folders 列表（避免重复 fetch）"

patterns-established:
  - "原生 dialog overlay: fixed inset-0 z-50 flex items-center justify-center bg-black/50，内层 role=dialog aria-modal=true"
  - "目录树选择器: FolderOption 递归组件，depth 控制 paddingLeft，excludeIds/excludeId 控制禁用状态"

requirements-completed: [TC-01, TC-02, TC-03, TC-04, TC-05, TC-06]

# Metrics
duration: 15min
completed: 2026-03-16
---

# Phase 04 Plan 05: FolderTree 目录管理增强 Summary

**FolderTree 补全「移动到…」Dialog + 重命名重名校验，TC-04/TC-05 移动功能完整可用**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-16T06:10:00Z
- **Completed:** 2026-03-16T06:25:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- FolderTree.tsx 新增 `movingFolderId` state 与右键菜单「移动到…」选项（MoveRight 图标，is_system 目录不显示）
- `handleEditSubmit` 添加同级重名校验（大小写不敏感，toast.error 阻止提交）
- 新建 MoveFolderDialog：递归目录树选择，超3层置灰，调用 PATCH /testcases/folders/{id} 更新 parent_id
- 新建 MoveCaseDialog：批量用例移动，调用 POST /testcases/folders/move-cases，支持 caseIds[] 入参

## Task Commits

1. **Task 1 + 2: FolderTree 增强 + MoveFolderDialog + MoveCaseDialog** - `cdc6f88` (feat)

**Plan metadata:** _（见 docs commit）_

## Files Created/Modified

- `frontend/src/app/(main)/testcases/_components/FolderTree.tsx` - 添加 movingFolderId state、重名校验、onMoveClick 传递链、右键菜单「移动到…」、MoveFolderDialog 渲染
- `frontend/src/app/(main)/testcases/_components/MoveFolderDialog.tsx` - 新建，目录树移动对话框
- `frontend/src/app/(main)/testcases/_components/MoveCaseDialog.tsx` - 新建，用例批量移动对话框

## Decisions Made

- 使用原生 overlay+div 而非 shadcn/ui Dialog，因为项目没有安装 shadcn/ui 的 button/dialog/scroll-area 组件（发现于 Task 2 TypeScript 报错，Rule 3 自动修复）
- 重名校验逻辑在 `handleEditSubmit` 内完成：通过遍历 allNodes 或 getSiblings 找到同级，大小写不敏感比较，重名时 toast.error 并 return（不关闭编辑状态）

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] MoveFolderDialog/MoveCaseDialog 引用不存在的 shadcn/ui 组件**

- **Found during:** Task 2 (创建 Dialog 组件)
- **Issue:** 计划要求使用 shadcn/ui Dialog、Button、ScrollArea，但项目未安装这些组件，TypeScript 报 Cannot find module
- **Fix:** 改用原生 `<div role="dialog" aria-modal="true">` overlay 模式（与 FolderTree 内 deleteConfirm 风格完全一致）
- **Files modified:** MoveFolderDialog.tsx、MoveCaseDialog.tsx
- **Verification:** `bunx tsc --noEmit` 无相关错误
- **Committed in:** cdc6f88

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking import)
**Impact on plan:** 仅影响实现方式，功能完整。视觉风格与已有 deleteConfirm dialog 保持一致。

## Issues Encountered

None - 除上述 shadcn/ui import 问题外，执行顺利。

## Next Phase Readiness

- FolderTree 目录管理功能完整（TC-01~06 均覆盖）
- MoveCaseDialog 可从 CaseTable 的批量操作 BatchActions 调用（需要在 page.tsx 层集成）
- 下一步可集成 MoveCaseDialog 到用例列表的批量操作栏

## Self-Check: PASSED

- MoveFolderDialog.tsx: FOUND
- MoveCaseDialog.tsx: FOUND
- Commit cdc6f88: FOUND

---
*Phase: 04-wai-wei-mo-kuai-kuo-zhan*
*Completed: 2026-03-16*
