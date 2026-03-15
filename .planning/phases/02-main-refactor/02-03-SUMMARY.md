---
phase: 02-main-refactor
plan: "03"
subsystem: ui
tags: [react, analysis-tab, drag-split, risk-confirm, sse, diagnosis]

requires:
  - phase: 02-main-refactor/02-01
    provides: PATCH /diagnosis/risks/{id}/confirm endpoint and confirmed field on DiagnosisRisk
  - phase: 02-main-refactor/02-02
    provides: AnalysisRightPanel with three-tab layout and _components directory

provides:
  - Enhanced AnalysisTab with vertical drag-split layout (upper scan results / lower chat)
  - Per-risk confirm button calling PATCH confirm endpoint with optimistic update
  - Enter workbench button disabled when unconfirmed high-risk items exist
  - Correct risk level field handling (backend level vs legacy frontend severity)

affects:
  - 02-04 (workbench — reqId param routing)
  - 02-05 (coverage tab in same right panel)

tech-stack:
  added: []
  patterns:
    - "Drag-split layout: onMouseDown on button element, document-level mousemove/mouseup, splitRatio state clamped 0.3-0.7"
    - "Optimistic update: local Set for confirmed IDs merged with server-side confirmed field"
    - "visible prop pattern: skip useDiagnosis hook when tab is hidden to prevent unnecessary API calls"

key-files:
  created:
    - frontend/src/app/(main)/analysis/_components/AnalysisTab.tsx
  modified:
    - frontend/src/app/(main)/analysis/_components/AnalysisRightPanel.tsx
    - frontend/src/app/(main)/diagnosis/_components/ScanResultsList.tsx
    - frontend/src/lib/api.ts

key-decisions:
  - "DiagnosisRisk interface: keep legacy severity field and add level field — both coexist for backward compat"
  - "Drag divider implemented as button element (not div) to satisfy Biome a11y rules"
  - "AnalysisRightPanel: removed useDiagnosis duplication — new AnalysisTab manages its own data fetching"

patterns-established:
  - "Risk level resolution: r.level ?? r.severity — always prefer level (backend canonical field)"
  - "Enter workbench button inside AnalysisTab (not in tab bar) — enables conditional disabled state per requirement"

requirements-completed:
  - ANA-04
  - ANA-06
  - ANA-07

duration: 20min
completed: 2026-03-15
---

# Phase 02 Plan 03: AI Analysis Tab Enhancement Summary

**Vertical drag-split AnalysisTab with per-risk confirm buttons and workbench gating based on unconfirmed high-risk items**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-15T12:30:00Z
- **Completed:** 2026-03-15T12:50:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `analysis/_components/AnalysisTab.tsx` with draggable split layout (30%-70% range)
- Upper pane renders risk cards with per-item confirm buttons, calls `PATCH /diagnosis/risks/{id}/confirm`
- Lower pane renders Socratic dialogue chat with streaming support and disabled input during SSE
- "Enter workbench" button disabled when unconfirmed high-risk items exist with hover tooltip showing exact count
- Wired into `AnalysisRightPanel` replacing the old placeholder button and diagnosis/_components import
- Fixed `DiagnosisRisk` field mismatch — backend returns `level`, frontend type had only `severity`

## Task Commits

1. **Task 1: New AnalysisTab with drag-split and risk confirm** - `5f10a5a` (feat)
2. **Task 2: Fix field name mismatch + wire into AnalysisRightPanel** - `10e52f1` (feat)

## Files Created/Modified
- `frontend/src/app/(main)/analysis/_components/AnalysisTab.tsx` - New enhanced AI analysis tab component
- `frontend/src/app/(main)/analysis/_components/AnalysisRightPanel.tsx` - Updated to use new AnalysisTab with requirementId/visible props
- `frontend/src/app/(main)/diagnosis/_components/ScanResultsList.tsx` - Fixed risk level resolution (level ?? severity)
- `frontend/src/lib/api.ts` - Added level and confirmed fields to DiagnosisRisk interface

## Decisions Made
- Kept legacy `severity` field in `DiagnosisRisk` interface and added `level` alongside it — both fields coexist to avoid breaking existing ScanResultsList usage while supporting backend-canonical field name
- Used `<button>` element for drag divider (instead of `<div>`) to satisfy Biome `a11y/useFocusableInteractive` rule
- Moved "Enter workbench" button inside AnalysisTab rather than tab bar — AnalysisTab now manages its own data and can compute disabled state without prop drilling

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added level and confirmed fields to DiagnosisRisk**
- **Found during:** Task 2 (wiring AnalysisRightPanel)
- **Issue:** Backend `DiagnosisRiskResponse` schema returns `level` and `confirmed` fields, but frontend `DiagnosisRisk` interface only had `severity` (legacy) and no `confirmed`. Risk card confirm logic and level-based filtering would produce incorrect results.
- **Fix:** Added `level?: string`, `confirmed?: boolean`, and `risk_status?: string` to `DiagnosisRisk` interface in `api.ts`. Updated `ScanResultsList` to use `r.level ?? r.severity` for backward compat.
- **Files modified:** `frontend/src/lib/api.ts`, `frontend/src/app/(main)/diagnosis/_components/ScanResultsList.tsx`
- **Verification:** TypeScript compiles without errors; Biome passes
- **Committed in:** `10e52f1` (Task 2 commit)

**2. [Rule 2 - Missing Critical] Fixed drag divider a11y violations**
- **Found during:** Task 1 verification (Biome check)
- **Issue:** `<div onMouseDown>` triggered 3 Biome a11y lint errors (`noStaticElementInteractions`, `useFocusableInteractive`, `useSemanticElements`)
- **Fix:** Replaced drag-handle div with `<button type="button">` element with aria-label
- **Files modified:** `frontend/src/app/(main)/analysis/_components/AnalysisTab.tsx`
- **Verification:** `bunx biome check` passes with no errors
- **Committed in:** `10e52f1` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 2 — missing critical correctness fixes)
**Impact on plan:** Both fixes necessary for type correctness and code quality compliance. No scope creep.

## Issues Encountered
- `AnalysisRightPanel.tsx` was already updated by Plan 02 executor to use `./AnalysisTab` import and new props — confirming Plan 02 and 03 were designed to work together seamlessly

## Next Phase Readiness
- AI Analysis Tab complete — users can confirm high-risk items and activate workbench navigation
- `reqId` parameter routing is ready for Plan 04 (workbench) to receive via URL query
- `DiagnosisRisk.level` field alignment sets correct precedent for Plan 05 coverage tab

---
*Phase: 02-main-refactor*
*Completed: 2026-03-15*
