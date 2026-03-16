---
phase: 05-ti-yan-shou-wei
plan: 02
subsystem: ui
tags: [recycle, soft-delete, cleanup, toast, skeleton, tests]

requires:
  - phase: 05-00
    provides: test scaffolds, phase context
provides:
  - 回收站页面 cleanup API 自动调用
  - 骨架屏加载状态
  - 恢复操作 Toast 提示
  - 目录不存在错误处理
  - 即将过期项目标红显示
  - 完整的单元测试覆盖

affects: []

tech-stack:
  added: []
  patterns:
    - TableSkeleton 骨架屏组件用于首次加载
    - Toast 通知使用 sonner
    - DELETE 请求带 body 使用 api.deleteWithBody

key-files:
  created:
    - frontend/src/app/(main)/recycle/page.test.tsx
  modified:
    - frontend/src/app/(main)/recycle/page.tsx
    - frontend/src/lib/api.ts

key-decisions:
  - "页面加载时先调用 cleanup API 清理过期数据，失败不阻塞列表加载"
  - "首次加载使用 TableSkeleton 骨架屏替代 Loader2"
  - "恢复成功后显示 Toast 提示，批量恢复显示恢复数量"
  - "目录不存在错误通过检查错误消息中的关键词识别"

patterns-established:
  - "TableSkeleton 骨架屏：首次加载使用骨架屏，按钮操作使用 Loader2"
  - "DELETE with body：使用 api.deleteWithBody 辅助方法"

requirements-completed: [UX-05, REC-01, REC-02, REC-03]

duration: 8min
completed: 2026-03-16
---

# Phase 5 Plan 02: 回收站完善 Summary

**回收站页面添加 cleanup API 自动调用、骨架屏加载状态、恢复 Toast 提示、目录不存在错误处理、即将过期标红显示，以及完整的单元测试覆盖**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-16T13:45:48Z
- **Completed:** 2026-03-16T13:53:22Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- 回收站页面加载时自动调用 cleanup API 清理过期数据
- 首次加载使用 TableSkeleton 骨架屏替代 Loader2 动画
- 恢复操作成功后显示 Toast 提示，批量恢复显示恢复数量
- 目录不存在错误通过关键词检测并显示特定 Toast
- 即将过期（<=3天）项目标红显示
- 8 个单元测试全部通过

## Task Commits

Each task was committed atomically:

1. **Task 1: 添加 cleanup API 调用和前端方法** - `7e1a064` (feat)
2. **Task 2: 完善加载状态和恢复逻辑** - `a7afaef` (feat)
3. **Task 3: 创建回收站页面测试** - `c6462aa` (test)

**Plan metadata:** `pending` (docs: complete plan)

_Note: TDD tasks may have multiple commits (test -> feat -> refactor)_

## Files Created/Modified
- `frontend/src/app/(main)/recycle/page.tsx` - 添加 cleanup 调用、骨架屏、Toast 提示
- `frontend/src/lib/api.ts` - 添加 recycleApi.cleanup 和 api.deleteWithBody
- `frontend/src/app/(main)/recycle/page.test.tsx` - 8 个单元测试用例

## Decisions Made
- cleanup API 调用失败时静默处理，不阻塞列表加载
- 使用 TableSkeleton 组件替代 Loader2 作为首次加载骨架屏
- 恢复成功后使用 sonner toast 显示提示信息
- 目录不存在错误通过检查错误消息中的 "folder not found" 或 "目录不存在" 关键词识别

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- 后端 permanent delete API 使用 DELETE 方法带 body，需要添加 api.deleteWithBody 辅助方法
- vitest 与 bun test 的 mock API 不完全兼容，测试使用 vitest 运行

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 回收站功能完善完成，软删除链路完整
- 可以继续其他 Phase 5 计划（UI 规范、模板库 Prompt Tab）

## Self-Check: PASSED

- SUMMARY.md: FOUND
- Commits: 7e1a064, a7afaef, c6462aa, 6348fc1 - FOUND

---
*Phase: 05-ti-yan-shou-wei*
*Completed: 2026-03-16*
