---
phase: 01-qingchang
plan: 03
subsystem: ui, api, testing
tags: [audit, search, fastapi, nextjs, pytest, datetime-filter]

requires:
  - phase: 01-qingchang-01
    provides: 模块裁剪基线（M09/M18 路由注销）
  - phase: 01-qingchang-02
    provides: M16 通知模块整体裁剪

provides:
  - GET /audit 端点支持 date_from/date_to Query 参数（后端 SQLAlchemy 过滤）
  - GlobalSearch 仅支持 requirement 和 testcase 两种搜索类型
  - AuditLogs.tsx 修复 API 路径为 /audit 并添加时间范围筛选 UI
  - test_audit_filter.py：4 个时间范围过滤行为测试
  - test_search_types.py：3 个 entity_types 参数测试

affects:
  - settings 页面（操作日志 Tab）
  - 全局搜索（Cmd+K）

tech-stack:
  added: []
  patterns:
    - "FastAPI Query 参数与 noqa B008：Query(None) 需要加 # noqa: B008 以通过 ruff lint"
    - "SearchApi 调用统一传 types 数组，前端负责限制搜索类型，后端不做强制限制"

key-files:
  created:
    - backend/tests/unit/test_audit/test_audit_filter.py
    - backend/tests/unit/test_search/test_search_types.py
  modified:
    - backend/app/modules/audit/service.py
    - backend/app/modules/audit/router.py
    - frontend/src/components/ui/GlobalSearch.tsx
    - frontend/src/app/(main)/settings/_components/AuditLogs.tsx

key-decisions:
  - "后端不强制限制搜索 entity_types，前端 GlobalSearch 固定传 requirement/testcase 实现去噪"
  - "审计日志 API 路径统一为 GET /audit（非 /audit/logs），page_size 默认值改为 100"
  - "ruff B008 对 Query(None) 误报，使用 # noqa: B008 忽略（FastAPI 标准模式）"

patterns-established:
  - "TDD 模式：先写失败测试，实施功能后验证通过"
  - "日期范围过滤参数命名：date_from / date_to（与后端 SQLAlchemy 字段对齐）"

requirements-completed:
  - MOD-04
  - MOD-05

duration: 8min
completed: 2026-03-15
---

# Phase 1 Plan 03: 全局搜索裁剪 + 审计日志时间过滤 Summary

**全局搜索（Cmd+K）裁剪为仅「需求/用例」两类，审计日志修复 API 路径并添加 date_from/date_to 后端过滤**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-15T04:20:15Z
- **Completed:** 2026-03-15T04:28:00Z
- **Tasks:** 3 of 3 (Task 3 human-verify: approved)
- **Files modified:** 6

## Accomplishments

- AuditService.get_audit_logs() 新增 date_from/date_to 参数，添加 SQLAlchemy 时间范围过滤
- GET /audit 端点新增两个 Query 参数，page_size 默认值从 50 改为 100
- GlobalSearch.tsx 类型从 5 种裁剪为 2 种（requirement/testcase），删除 diagnosis/template/knowledge 分组
- AuditLogs.tsx 修复 API 路径（/audit/logs -> /audit），添加时间范围选择器 UI
- 创建 7 个单元测试全部通过

## Task Commits

1. **Task 1: 后端 audit 时间范围过滤 + 测试桩** - `163098f` (feat/test)
2. **Task 2: 前端全局搜索裁剪 + 审计日志修复** - `1c5d4b1` (feat)

3. **Task 3: 人工验证关卡** - checkpoint 通过（用户输入 "approved"，无独立 commit）

## Files Created/Modified

- `backend/app/modules/audit/service.py` - 新增 date_from/date_to 参数及 SQLAlchemy where 过滤
- `backend/app/modules/audit/router.py` - 新增 date_from/date_to Query 参数，page_size 默认 100
- `backend/tests/unit/test_audit/test_audit_filter.py` - 4 个时间范围过滤测试（TDD RED/GREEN）
- `backend/tests/unit/test_search/test_search_types.py` - 3 个 entity_types 参数测试
- `frontend/src/components/ui/GlobalSearch.tsx` - 类型裁剪为 requirement/testcase，API 调用固定传类型
- `frontend/src/app/(main)/settings/_components/AuditLogs.tsx` - 修复 API 路径，添加时间范围筛选 UI

## Decisions Made

- 后端不强制限制搜索 entity_types，搜索去噪完全由前端控制（固定传两种类型）
- 审计日志 API 路径统一为 `/audit`，`page_size` 默认值升为 100 以满足「最近 100 条」需求
- `ruff B008` 对 `Query(None)` 误报，使用 `# noqa: B008` 处理（FastAPI 标准模式）

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 修复 searchApi.search 调用参数类型**
- **Found during:** Task 2（前端 GlobalSearch 裁剪）
- **Issue:** 计划中写 `types: 'requirement,testcase'` 传字符串，但 searchApi.search 第二个参数类型为 `string[]`
- **Fix:** 改为 `['requirement', 'testcase']` 数组，并正确使用 page/pageSize 参数位置
- **Files modified:** frontend/src/components/ui/GlobalSearch.tsx
- **Verification:** TypeScript 编译无错误
- **Committed in:** 1c5d4b1 (Task 2 commit)

**2. [Rule 1 - Bug] 修复 test_search_types.py mock 模式**
- **Found during:** Task 1 GREEN 阶段
- **Issue:** 初始测试桩对 SearchService FTS+ILIKE 两阶段执行的 mock 顺序不正确，导致 assert 失败
- **Fix:** 重构 mock，正确模拟 FTS result.all() 返回 id 列表，ILIKE 返回 scalars().all()
- **Files modified:** backend/tests/unit/test_search/test_search_types.py
- **Verification:** 7 个测试全部通过
- **Committed in:** 163098f (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** 两个 bug 均在实施过程中发现并即时修复，不影响计划范围。

## Issues Encountered

- ruff B008 对 `Query(None)` 的 lint 误报：原有 `Query(1, ge=1)` 不触发，新增 `Query(None)` 触发，使用 `# noqa` 解决

## Next Phase Readiness

- Phase 1 MOD-01~05 全部满足，清场阶段正式完成（human-verify 已通过）
- 可进入 Phase 2 主链路重构（分析台 M03/M04、工作台 M05、用例库 M06）

---
*Phase: 01-qingchang*
*Completed: 2026-03-15*
