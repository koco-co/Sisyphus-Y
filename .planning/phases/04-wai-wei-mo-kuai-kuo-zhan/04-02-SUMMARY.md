---
phase: 04-wai-wei-mo-kuai-kuo-zhan
plan: "02"
subsystem: backend
tags: [dashboard, diff, migration, tdd]
dependency_graph:
  requires: ["04-01"]
  provides: ["DSH-02-backend", "DIF-04", "DIF-05"]
  affects: ["frontend-dashboard-trend", "frontend-diff-push"]
tech_stack:
  added: []
  patterns: ["TDD RED-GREEN", "Alembic migration cleanup"]
key_files:
  created:
    - backend/app/modules/dashboard/service.py (get_trend_stats, _get_p0_count)
    - backend/app/modules/dashboard/router.py (GET /dashboard/trend)
    - backend/app/modules/diff/service.py (push_to_workbench, mark_affected_test_cases)
    - backend/app/modules/diff/router.py (POST /diff/{req_id}/push-to-workbench)
    - backend/alembic/versions/edfd557e5470_add_change_impact_to_test_cases.py
    - backend/tests/unit/test_dashboard/test_trend.py
    - backend/tests/unit/test_diff/test_push_to_workbench.py
  modified:
    - backend/app/modules/testcases/models.py (change_impact field)
    - backend/alembic/versions/ee8a72884ae2_add_api_keys_and_vector_config_to_ai_.py (restored)
    - backend/alembic/versions/f9a0b1c2d3e4_add_is_system_to_folders.py (guarded)
key_decisions:
  - "change_impact 值域：needs_rewrite / needs_review / not_affected / None"
  - "push_to_workbench 设置 status=needs_regen（而非 pending_regen，与计划描述一致）"
  - "迁移文件只保留 add_column，删除 autogenerate 噪声（drop_table / alter_column）"
  - "f9a0b1c2d3e4 迁移加 IF EXISTS 守卫，避免 test_case_folders 表不存在时失败"
  - "ee8a72884ae2 迁移文件从 git 历史恢复（被意外 git rm 导致链路断裂）"
metrics:
  duration_minutes: 8
  completed_date: "2026-03-16"
  tasks_completed: 2
  files_changed: 9
---

# Phase 4 Plan 02: 仪表盘趋势端点 + TestCase 变更影响字段 Summary

**One-liner:** 新增 GET /dashboard/trend 趋势折线图端点（DSH-02）、TestCase.change_impact DB 字段迁移（Alembic）、POST /diff/{req_id}/push-to-workbench 推送端点（DIF-04/05）。

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | 仪表盘趋势端点（DSH-02 后端） | 32dbb92 | dashboard/service.py, router.py, test_trend.py |
| 2 | TestCase.change_impact + Diff 推送端点 | 0321521 | testcases/models.py, diff/service.py, diff/router.py, migration |

## What Was Built

### Task 1: Dashboard Trend Endpoint

- `DashboardService.get_trend_stats(product_id, limit=6)` — 查最近 N 个迭代，时间正序，每条含 iteration_name/testcase_count/p0_count/coverage_rate
- `DashboardService._get_p0_count(iteration_id)` — 子查询统计 P0 用例数
- `GET /dashboard/trend?product_id=&limit=6` — 路由端点，product_id 可选
- 10 个测试全部通过（含端点集成测试）

### Task 2: TestCase change_impact + Diff Push

- `TestCase.change_impact: Mapped[str | None]` — String(20), nullable，值域：needs_rewrite/needs_review/not_affected
- Alembic 迁移 `edfd557e5470` — 仅含 `add_column test_cases.change_impact`，清理了 autogenerate 噪声
- `DiffService.push_to_workbench(req_id)` — SELECT needs_rewrite 用例 → UPDATE status=needs_regen → return {pushed_count}
- `DiffService.mark_affected_test_cases(req_id, impact_map)` — 批量设置 change_impact 字段
- `POST /diff/{req_id}/push-to-workbench` — 端点，返回 {"pushed_count": N}
- 3 个测试全部通过

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 恢复被删除的 Alembic 迁移文件 ee8a72884ae2**
- **Found during:** Task 2 — alembic check 报 KeyError: 'ee8a72884ae2'
- **Issue:** 该文件被 git rm 删除，导致 aa1b2c3d4e5f 和 f9a0b1c2d3e4 两个迁移引用的 down_revision 不存在，整个 alembic 链路断裂
- **Fix:** 从 git 历史（git show HEAD:...）恢复文件
- **Files modified:** backend/alembic/versions/ee8a72884ae2_add_api_keys_and_vector_config_to_ai_.py
- **Commit:** 0321521

**2. [Rule 3 - Blocking] 修复 f9a0b1c2d3e4 迁移对不存在表的操作**
- **Found during:** Task 2 — alembic upgrade head 报 "relation test_case_folders does not exist"
- **Issue:** f9a0b1c2d3e4 直接 op.add_column 而不检查表是否存在，但 test_case_folders 由更后面的 b3c4d5e6f7a8 创建
- **Fix:** 使用 inspect(bind) 检查表和列是否存在，加 IF EXISTS 守卫
- **Files modified:** backend/alembic/versions/f9a0b1c2d3e4_add_is_system_to_folders.py
- **Commit:** 0321521

**3. [Rule 2 - Quality] Alembic autogenerate 迁移清理**
- **Found during:** Task 2 — autogenerate 生成大量 drop_table/alter_column 噪声
- **Fix:** 手动清理迁移文件，只保留 add_column change_impact（符合计划的明确指示）
- **Files modified:** backend/alembic/versions/edfd557e5470_add_change_impact_to_test_cases.py
- **Commit:** 0321521

### Tests Updated

test_push_to_workbench.py 已有完整的 RED 基线测试（3 个测试）。
test_trend.py 被更新为正确 mock `_get_iteration_options`（原文件 3 个测试直接调用 service 但没有 mock，导致 session.execute 返回 coroutine 而非可迭代对象）。

## Verification

```
13 passed in 0.05s
- tests/unit/test_dashboard/test_trend.py (10 passed)
- tests/unit/test_diff/test_push_to_workbench.py (3 passed)
```

alembic upgrade head: SUCCESS (edfd557e5470 applied)

## Self-Check: PASSED

- [x] backend/app/modules/dashboard/service.py — get_trend_stats 存在
- [x] backend/app/modules/dashboard/router.py — /trend 端点存在
- [x] backend/app/modules/testcases/models.py — change_impact 字段存在
- [x] backend/app/modules/diff/service.py — push_to_workbench 存在
- [x] backend/app/modules/diff/router.py — push-to-workbench 端点存在
- [x] backend/alembic/versions/edfd557e5470_add_change_impact_to_test_cases.py — 迁移文件存在
- [x] Commit 32dbb92 (Task 1) — verified
- [x] Commit 0321521 (Task 2) — verified
