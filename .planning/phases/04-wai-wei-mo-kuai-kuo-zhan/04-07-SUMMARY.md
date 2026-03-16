---
phase: 04-wai-wei-mo-kuai-kuo-zhan
plan: "07"
subsystem: export
tags: [export, testcases, TC-12, TC-13, TC-14]
dependency_graph:
  requires: [04-02]
  provides: [TC-12, TC-13, TC-14]
  affects: [testcases, export]
tech_stack:
  added: []
  patterns: [scope-based-query, field-filtering, Literal-type-constraints]
key_files:
  created: []
  modified:
    - backend/app/modules/export/schemas.py
    - backend/app/modules/export/service.py
    - frontend/src/app/(main)/testcases/_components/ExportDialog.tsx
    - frontend/src/app/(main)/testcases/page.tsx
decisions:
  - "ExportJobCreate.scope 使用 Literal 约束 4 种范围，scope_value 复用同一字段（folder_id/req_id/iter_id），避免过多冗余字段"
  - "iteration scope 通过 Requirement.iteration_id JOIN 查询，不在 TestCase 添加 iteration_id（避免冗余列）"
  - "旧字段 iteration_id/requirement_id 保留用于向后兼容，filter_criteria 中存储 scope 信息"
  - "ExportDialog.tsx json 格式替换为 md，与后端 generate_markdown 方法对应"
  - "API 端点 POST /export 对应 router.py 中 @router.post('') 路径"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-16"
  tasks_completed: 2
  files_modified: 4
---

# Phase 4 Plan 07: 用例导出功能完善 Summary

**One-liner:** 四格式四范围导出，后端 scope 分支查询 + 前端对话框升级，ExportJobCreate 扩展 scope/fields 字段

## What Was Built

实现了 TC-12~TC-14：

1. **后端 scope 参数扩展（Task 1）**
   - `ExportJobCreate` schema 新增 `scope/scope_value/case_ids/fields` 4 个字段
   - `ExportService._get_cases_by_scope()` 支持 4 种过滤分支：
     - `folder`：按 `TestCase.folder_id` 过滤
     - `requirement`：按 `TestCase.requirement_id` 过滤
     - `iteration`：通过 `Requirement.iteration_id` JOIN 子查询过滤（TestCase 无 iteration_id）
     - `selected`：按 case UUID 列表过滤（IN 查询）
   - `export_cases_with_fields()` 支持字段级过滤
   - `_get_filtered_cases()` 向后兼容旧版 requirement_id 过滤

2. **前端 ExportDialog 升级（Task 2）**
   - 格式选项：xlsx（推荐）/ csv / xmind / md（替代原 json）
   - 导出范围单选：当前目录 / 按需求 / 按迭代 / 自由勾选，需求/迭代选项展示 UUID 输入框
   - 字段复选框：8 个可选字段，XMind 格式时显示"固定全字段"提示并隐藏复选框
   - `handleExport` 改为真实 `POST /export` API 调用，携带 scope/fields 参数
   - 更新 `page.tsx` 中调用 props 为新接口（`selectedCaseIds`/`currentFolderId`）

## Deviations from Plan

None - plan executed exactly as written.

## Tests

- 3 个 RED→GREEN：`TestExportScope::test_export_scope_folder` / `test_export_scope_selected` / `test_export_custom_fields`
- ruff check: 0 errors
- pyright: 0 errors, 0 warnings
- tsc ExportDialog: 0 errors（预存在的 MoveCaseDialog/MoveFolderDialog 模块丢失问题不属于本次变更范围）

## Self-Check: PASSED

- [x] `backend/app/modules/export/schemas.py` 存在且含 scope 字段
- [x] `backend/app/modules/export/service.py` 含 `_get_cases_by_scope` 方法（第49行）
- [x] `frontend/src/app/(main)/testcases/_components/ExportDialog.tsx` 含4格式/4范围/字段复选框
- [x] API 端点 `POST /export` 在 ExportDialog.tsx 第152行可 grep 到
- [x] 提交 9c71a22 (Task 1) 和 d1994eb (Task 2) 均存在
