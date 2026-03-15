---
phase: 02-main-refactor
plan: "04"
subsystem: ui
tags: [react, zustand, sse, rag, workbench, coverage, test-points]

requires:
  - phase: 02-main-refactor/02-02
    provides: AnalysisRightPanel.tsx with CoverageMatrix placeholder that this plan replaces with CoverageTab

provides:
  - CoverageTab.tsx wrapping CoverageMatrix for analysis coverage tracking tab
  - WorkbenchStepBar.tsx using ProgressSteps with clickable step navigation
  - TestPointGroupList.tsx with group-by-group_name, checkbox toggle, fold/expand, inline add
  - RagPreviewPanel.tsx with selected points summary and RAG top-5 preview
  - workspace-store extended with appendTestCases, appendedTestPointIds, lastGeneratedPointIds

affects:
  - 02-05 (Step2 generation panel — depends on workspace-store lastGeneratedPointIds and appendTestCases)
  - 02-06 (workbench integration — depends on Step1 components)

tech-stack:
  added: []
  patterns:
    - "Thin wrapper pattern: CoverageTab delegates entirely to CoverageMatrix with visible guard"
    - "Button-based test point rows for a11y compliance instead of div+onClick"
    - "useRef+useEffect for input focus instead of autoFocus attribute"
    - "ProgressSteps extended with optional onStepClick prop for clickable step navigation"

key-files:
  created:
    - frontend/src/app/(main)/analysis/_components/CoverageTab.tsx
    - frontend/src/app/(main)/workbench/_components/WorkbenchStepBar.tsx
    - frontend/src/app/(main)/workbench/_components/TestPointGroupList.tsx
    - frontend/src/app/(main)/workbench/_components/RagPreviewPanel.tsx
  modified:
    - frontend/src/stores/workspace-store.ts
    - frontend/src/app/(main)/analysis/_components/AnalysisRightPanel.tsx
    - frontend/src/components/ui/ProgressSteps.tsx
    - frontend/src/app/(main)/workbench/page.tsx

key-decisions:
  - "CoverageTab returns null when visible=false to prevent hidden-tab API requests"
  - "TestPointGroupList uses button elements for each test point row (a11y rule: no div+onClick)"
  - "ProgressSteps extended with optional onStepClick — existing callers unaffected (prop is optional)"
  - "workspace-store appendTestCases appends to existing testCases (not replace) for incremental generation"

patterns-established:
  - "Workbench Step1 right column: RagPreviewPanel triggers POST /rag-preview on checkedPointIds change via useEffect"
  - "Group fold pattern: FOLD_THRESHOLD=5, show more/less button at group level"

requirements-completed: [ANA-05, WRK-01, WRK-02, WRK-03, WRK-04]

duration: 9min
completed: 2026-03-15
---

# Phase 02 Plan 04: Coverage Tab + Workbench Step1 Summary

**Coverage tracking tab via CoverageMatrix wrapper, workbench Step1 with group-by-group_name test point list, checkbox toggle, RAG preview panel, and workspace-store incremental generation state**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-03-15T12:31:12Z
- **Completed:** 2026-03-15T12:39:22Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- CoverageTab.tsx created as a thin wrapper over CoverageMatrix with a `visible` guard that prevents background API calls when the tab is hidden
- WorkbenchStepBar replaces manual step pill buttons in workbench/page.tsx — ProgressSteps extended with optional `onStepClick` for clickable navigation
- TestPointGroupList renders test points grouped by `group_name`, supports fold/expand at >5 items, inline add via keyboard input, and checkbox toggle via button elements
- RagPreviewPanel shows selected test points summary and fires POST `/rag-preview` on checkedPointIds change, displaying top-5 results with similarity scores
- workspace-store extended with `appendTestCases`, `appendedTestPointIds`, `lastGeneratedPointIds`, and their setters — all additive, no existing state broken

## Task Commits

1. **Task 1: CoverageTab + workspace-store + WorkbenchStepBar** - `c524e62` (feat)
2. **Task 2: TestPointGroupList + RagPreviewPanel** - `ab9f147` (feat)

## Files Created/Modified

- `frontend/src/app/(main)/analysis/_components/CoverageTab.tsx` - Thin CoverageMatrix wrapper with visible guard
- `frontend/src/app/(main)/workbench/_components/WorkbenchStepBar.tsx` - Sticky step bar using ProgressSteps
- `frontend/src/app/(main)/workbench/_components/TestPointGroupList.tsx` - Grouped test point list with checkbox, fold, inline add
- `frontend/src/app/(main)/workbench/_components/RagPreviewPanel.tsx` - Selected points summary + RAG top-5 preview
- `frontend/src/stores/workspace-store.ts` - Added appendTestCases, appendedTestPointIds, lastGeneratedPointIds
- `frontend/src/app/(main)/analysis/_components/AnalysisRightPanel.tsx` - Replaced CoverageMatrix import with CoverageTab
- `frontend/src/components/ui/ProgressSteps.tsx` - Added optional onStepClick prop, div->button for accessibility
- `frontend/src/app/(main)/workbench/page.tsx` - Replaced manual step buttons with WorkbenchStepBar

## Decisions Made

- CoverageTab returns null when `visible=false` to prevent hidden-tab API requests (consistent with AnalysisTab pattern in 02-02)
- ProgressSteps `onStepClick` is optional — existing callers unaffected
- TestPointGroupList uses `button` elements for test point rows to satisfy biome a11y rules (noStaticElementInteractions)
- `autoFocus` replaced with `useRef + useEffect` to avoid biome `noAutofocus` lint error

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ProgressSteps missing onStepClick prop**
- **Found during:** Task 1 (WorkbenchStepBar creation)
- **Issue:** Plan specified `onStepClick` on ProgressSteps but the component only had `steps` prop — WorkbenchStepBar would not compile
- **Fix:** Added optional `onStepClick?: (idx: number) => void` to ProgressSteps; changed `div` to `button` for each step for accessibility
- **Files modified:** `frontend/src/components/ui/ProgressSteps.tsx`
- **Verification:** TypeScript compiles, biome passes
- **Committed in:** c524e62 (Task 1 commit)

**2. [Rule 1 - Bug] TestPointGroupList a11y violations**
- **Found during:** Task 2 (biome check)
- **Issue:** div+onClick for test point rows violated `noStaticElementInteractions` and `useKeyWithClickEvents`; SVG lacked `aria-hidden`; `autoFocus` violated `noAutofocus`; `??=` violated `noAssignInExpressions`
- **Fix:** Converted rows to `button` elements; added `aria-hidden` to SVG; replaced `autoFocus` with `useRef+useEffect`; rewrote `??=` to explicit if-block
- **Files modified:** `frontend/src/app/(main)/workbench/_components/TestPointGroupList.tsx`
- **Verification:** biome check passes with 0 errors
- **Committed in:** ab9f147 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug/lint)
**Impact on plan:** Both fixes required for correct build and lint compliance. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Step1 components are complete and wired to workspace-store
- Plan 05 (Step2 generation panel) can now use `lastGeneratedPointIds`, `appendTestCases`, and `setLastGeneratedPointIds` from workspace-store
- RagPreviewPanel requires backend `/scene-map/{req_id}/rag-preview` endpoint (added in Plan 01)

---
*Phase: 02-main-refactor*
*Completed: 2026-03-15*
