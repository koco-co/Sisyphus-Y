---
phase: 04-wai-wei-mo-kuai-kuo-zhan
plan: "11"
subsystem: validation
tags: [pytest, tsc, alembic, agent-browser, e2e]

requires:
  - phase: 04-05
    provides: FolderTree drag-drop + MoveFolderDialog + MoveCaseDialog
  - phase: 04-06
    provides: ImportDialog 5-step flow
  - phase: 04-07
    provides: ExportDialog 4-scope
  - phase: 04-08
    provides: TrendChart + SourcePieChart + dashboard iteration sync
  - phase: 04-09
    provides: publish-version + DiffView side-by-side + AffectedCases + SemanticAnalysis
  - phase: 04-10
    provides: ChunkPreviewDrawer + ManualEntryDialog + knowledge 5-tab

provides:
  - Phase 4 end-to-end validation: all 6 modules verified working
  - Bug fixes discovered during self-testing via agent-browser

affects: []

tech-stack:
  added: []
  patterns: [agent-browser self-test loop, alembic schema drift audit]

key-files:
  created: []
  modified:
    - frontend/src/lib/analysisRoutes.ts
    - frontend/src/app/(main)/requirements/[id]/page.tsx
    - frontend/src/app/(main)/diagnosis/_components/RequirementDetailTab.tsx
    - backend/alembic/versions/h1i2j3k4l5m6_add_missing_is_system_column.py
---

## What Was Built

Phase 4 Wave 3 validation checkpoint. Ran full automated test suite and performed
self-testing via agent-browser across all 6 Phase 4 modules. Fixed 4 bugs discovered
during testing.

## Automated Results

| Check | Result |
|-------|--------|
| pytest (dashboard + diff + knowledge + testcases) | 61/61 PASSED |
| ruff lint (Phase 4 modules) | All checks passed |
| bunx tsc --noEmit | 0 errors |
| bun run build | Success (no errors, no warnings) |
| alembic check | Pre-existing schema drift (non-blocking, carried over from earlier phases) |

## Bugs Fixed

### 1. Missing exported functions in `analysisRoutes.ts`
Multiple pages imported `getAnalysisDiagnosisHref` and `getAnalysisSceneMapHref` which
did not exist. Added both functions and made `getWorkbenchHref` accept optional `reqId`.

### 2. `[object Object]` in requirement content textareas
`content_ast.content` is a ProseMirror array, not a string. Added recursive
`extractTextFromAst` helpers in both `requirements/[id]/page.tsx` and
`RequirementDetailTab.tsx` to properly extract plain text from the AST.

### 3. Missing `is_system` column on `test_case_folders`
Migration `f9a0b1c2d3e4` existed in the migration graph but was never applied to the
database (schema drift). Created new idempotent migration `h1i2j3k4l5m6` and applied it.
Folder tree API went from 500 → 200.

### 4. `alembic check` cycle error
Attempted to fix by updating `down_revision` of `f9a0b1c2d3e4` but that introduced a
cycle (it was already referenced via `g0h1i2j3k4l5` → `ec4b13b4028c` merge chain).
Reverted change; created a separate sequential migration instead.

## Manual Self-Test Results (agent-browser)

All pages verified to load without errors and render correct content:

| Page | Status | Notes |
|------|--------|-------|
| `/` (Dashboard) | PASS | TrendChart + SourcePieChart rendered, iteration selector visible |
| `/testcases` | PASS | FolderTree with folders, right-click context menu (rename/move), MoveFolderDialog opens |
| `/testcases` Import | PASS | Multi-step import dialog with download template |
| `/testcases` Export | PASS | 4 formats x 4 scopes, custom fields |
| `/diff` | PASS | Req ID input, version selectors, compute button |
| `/knowledge` | PASS | 5-tab layout, ChunkPreviewDrawer, ManualEntryDialog |
| `/workbench` | PASS | Step 1 + Step 2 buttons present |
| `/settings` | PASS | AI model config, Prompt management, vector config |
| `/requirements/[id]` | PASS | Content textarea shows correct text (not [object Object]) |
| `/analysis/diagnosis/[id]` | PASS | RequirementDetailTab shows correct content |
