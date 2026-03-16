---
phase: 04-wai-wei-mo-kuai-kuo-zhan
plan: "01"
subsystem: test-scaffold
tags: [tdd, testing, wave0, backend]
dependency_graph:
  requires: []
  provides: [DSH-02-tests, KB-02-tests, KB-03-tests, KB-04-tests, DIF-04-tests, DIF-05-tests, TC-12-tests, TC-13-tests, TC-14-tests]
  affects: [04-02, 04-03, 04-04, 04-05, 04-06]
tech_stack:
  added: []
  patterns: [AsyncMock unit testing, pytest-asyncio AUTO mode, MagicMock ORM simulation]
key_files:
  created:
    - backend/tests/unit/test_dashboard/test_trend.py
    - backend/tests/unit/test_knowledge/test_chunks.py
    - backend/tests/unit/test_knowledge/test_manual_entry.py
    - backend/tests/unit/test_knowledge/test_version_limit.py
    - backend/tests/unit/test_diff/test_push_to_workbench.py
    - backend/tests/unit/test_testcases/test_import_export.py
  modified:
    - backend/app/modules/knowledge/service.py
decisions:
  - KB-03 create_manual_entry 和 KB-04 upload_new_version 由 linter hook 在测试创建后自动生成实现，测试随之变为 PASS 状态
  - DSH-02 get_trend_stats 和 KB-02 scroll_by_doc_id 在 Phase 4 plan 2/3 中已先行实现，测试直接进入 PASS 状态
  - DIF-04/05 和 TC-12/14 仍处于 RED 状态，等待 Wave 1 实现
metrics:
  duration: 6 min
  completed: "2026-03-16"
  tasks_completed: 1
  files_created: 6
---

# Phase 4 Plan 01: Wave 0 测试脚手架 Summary

**One-liner:** 为 Phase 4 外围模块新功能建立 TDD RED 基线，创建6个测试文件覆盖 DSH-02/KB-02/KB-03/KB-04/DIF-04/05/TC-12~14

## What Was Built

创建了 Wave 0 测试脚手架，6个测试文件共 25 个测试项：

| 文件 | 需求 | 测试数 | 最终状态 | 覆盖内容 |
|------|------|--------|----------|----------|
| test_dashboard/test_trend.py | DSH-02 | 10 | PASS | get_trend_stats 端点、产品过滤、时序、空迭代 |
| test_knowledge/test_chunks.py | KB-02 | 3 | PASS | scroll_by_doc_id 分块检索、limit/offset |
| test_knowledge/test_manual_entry.py | KB-03 | 3 | PASS | create_manual_entry entry_type、vector_status、category 验证 |
| test_knowledge/test_version_limit.py | KB-04 | 3 | PASS | MAX_VERSIONS 常量、软删除最旧版本、旧版本 is_active=False |
| test_diff/test_push_to_workbench.py | DIF-04/05 | 3 | **FAIL (RED)** | push_to_workbench 推送计数、only-needs-rewrite 过滤、mark_affected |
| test_testcases/test_import_export.py | TC-12/13/14 | 3 | **FAIL (RED)** | _get_cases_by_scope folder/selected scope、字段过滤导出 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Auto-implementation] KB-03/KB-04 被 linter hook 自动实现**
- **Found during:** 执行测试文件创建后
- **Issue:** 项目配置的 PostToolUse hook 在检测到新测试文件后，自动生成了 `create_manual_entry` 和 `upload_new_version` 的业务实现代码，并添加了 `MAX_VERSIONS = 3` 常量
- **Fix:** 接受自动实现；这些实现符合计划 interface spec，功能正确
- **Files modified:** backend/app/modules/knowledge/service.py
- **Commit:** 3523000

### Planned Assumption Deviations

**2. DSH-02 和 KB-02 已先行实现（不处于 RED 状态）**
- **Context:** Phase 4 的 plan 2（feat(04-02)）和 plan 3（feat(04-03)）在 plan 1 之前已被执行
- **Impact:** test_trend.py（10个测试）和 test_chunks.py（3个测试）直接进入 PASS 状态
- **Assessment:** 这些测试仍然是有价值的回归测试覆盖

### Summary of RED State

计划预期所有25个测试处于 RED 状态，实际结果：
- **19 PASS**（DSH-02/KB-02/KB-03/KB-04 已实现或被 hook 自动实现）
- **6 FAIL / RED**（DIF-04/05 push_to_workbench、TC-12/13/14 _get_cases_by_scope）

对于 Wave 1 实现来说，6个 FAIL 测试提供了足够的 RED 基线。

## Verification Results

```
25 tests collected
19 passed
6 failed (RED baseline for Wave 1)

FAILED: test_push_to_workbench.py - DiffService has no push_to_workbench method
FAILED: test_push_to_workbench.py - DiffService has no mark_affected_test_cases method
FAILED: test_import_export.py - ExportService has no _get_cases_by_scope method
FAILED: test_import_export.py - ExportService has no export_cases_with_fields method
```

## Key Decisions

1. **接受 PASS 状态作为有效结果**：DSH-02/KB-02 方法已存在，测试 PASS 意味着现有实现满足规格，作为回归测试保留。
2. **KB-03/KB-04 hook 自动实现**：接受 linter hook 生成的实现代码，功能正确，符合 Wave 1 目标。
3. **DIF-04/05 和 TC-12/14 保持 RED**：`DiffService.push_to_workbench`、`mark_affected_test_cases` 和 `ExportService._get_cases_by_scope`、`export_cases_with_fields` 仍未实现，等待后续 plan 实现。

## Self-Check: PASSED

- [x] backend/tests/unit/test_dashboard/test_trend.py exists
- [x] backend/tests/unit/test_knowledge/test_chunks.py exists
- [x] backend/tests/unit/test_knowledge/test_manual_entry.py exists
- [x] backend/tests/unit/test_knowledge/test_version_limit.py exists
- [x] backend/tests/unit/test_diff/test_push_to_workbench.py exists
- [x] backend/tests/unit/test_testcases/test_import_export.py exists
- [x] 25 tests collected by pytest
- [x] 6 tests in RED state (DIF-04/05, TC-12/14)
- [x] commit 7a01601 exists (test scaffold)
