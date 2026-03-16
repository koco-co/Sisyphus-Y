---
phase: 04-wai-wei-mo-kuai-kuo-zhan
plan: "08"
subsystem: ui
tags: [recharts, dashboard, lineChart, pieChart, doughnut, trending, iteration-selector]

# Dependency graph
requires:
  - phase: 04-wai-wei-mo-kuai-kuo-zhan
    provides: "dashboard /dashboard/trend and /dashboard/quality API endpoints (Plan 04-02)"

provides:
  - "TrendChart: Recharts LineChart with 3 trend lines (testcase_count, p0_count, coverage_rate)"
  - "SourcePieChart: Recharts donut chart for case source distribution with center total overlay"
  - "Dashboard page.tsx refactored with iteration-selector-driven data fetching and null-safe quality state"

affects: [dashboard, 04-wai-wei-mo-kuai-kuo-zhan]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS variable strings for Recharts colors (not Tailwind classes): stroke='var(--accent)' fill='var(--blue)'"
    - "Inline animated skeleton divs as fallback when shadcn Skeleton is absent"
    - "Null-sentinel quality state (null vs fallback static data) to distinguish loading from empty"

key-files:
  created:
    - frontend/src/app/(main)/_components/TrendChart.tsx
    - frontend/src/app/(main)/_components/SourcePieChart.tsx
  modified:
    - frontend/src/app/(main)/page.tsx

key-decisions:
  - "Removed fallbackQuality static data; quality state defaults to null so loading/empty state is unambiguous"
  - "TrendChart fetch has no iteration_id param (trend spans all iterations); quality fetch depends on selectedIterationId"
  - "SourcePieChart uses inline skeleton div (animated pulse) because @/components/ui/skeleton does not exist in project"
  - "DSH-04 (PendingItems navigation) confirmed already implemented via Link href={item.link} in PendingItems.tsx"

patterns-established:
  - "CSS vars for Recharts: use 'var(--token)' string in stroke/fill/contentStyle props, never Tailwind SVG classes"
  - "Null-safe quality rendering: quality?.total_cases ?? '—' pattern throughout quality tab"

requirements-completed: [DSH-01, DSH-02, DSH-03, DSH-04, DSH-05, DSH-06]

# Metrics
duration: 5min
completed: 2026-03-16
---

# Phase 4 Plan 08: 仪表盘图表重构 Summary

**Recharts LineChart 趋势折线图 + 环形图来源占比新增，迭代选择器联动全部 fetch，移除 fallbackQuality 静态数据**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-16T10:40:59Z
- **Completed:** 2026-03-16T10:45:45Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 新增 TrendChart.tsx：Recharts LineChart，3条折线（用例总量/P0数量/覆盖率%），loading 骨架屏，空数据提示
- 新增 SourcePieChart.tsx：Recharts 环形图（innerRadius=55），中心总数覆盖层，loading 骨架屏，空数据处理
- page.tsx 重构：移除 fallbackQuality 静态数据，quality state 改为 null；TrendChart 插入4卡片下方；质量分析 Tab 来源分布从 BarChart 切换为 SourcePieChart；迭代选择器通过 loadQuality 的 useCallback 依赖驱动重新 fetch

## Task Commits

1. **Task 1: TrendChart 和 SourcePieChart 组件** - `dbc6de8` (feat)
2. **Task 2: 仪表盘 page.tsx 重构** - `6dd6945` (feat)

## Files Created/Modified

- `frontend/src/app/(main)/_components/TrendChart.tsx` - Recharts LineChart 趋势图组件，ResponsiveContainer 100% 宽，3条 Line
- `frontend/src/app/(main)/_components/SourcePieChart.tsx` - Recharts 环形 PieChart，中心总数绝对定位，3种来源颜色
- `frontend/src/app/(main)/page.tsx` - 集成两图表，loadTrend/loadQuality useCallback，nullsafe quality 渲染，移除 fallbackQuality

## Decisions Made

- `fallbackQuality` 静态数据移除：quality state 默认 null，区分"加载中"和"无数据"，避免假数据误导用户
- TrendChart 趋势 fetch 无需 iteration_id（趋势是跨迭代的），loadQuality 依赖 selectedIterationId 实现联动
- `@/components/ui/skeleton` 不存在于项目：使用内联 `div.animate-pulse` 替代，避免引入外部依赖
- DSH-04 确认：PendingItems.tsx 每条事项已通过 `<Link href={item.link}>` 实现「去处理」跳转

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @/components/ui/skeleton 模块不存在**
- **Found during:** Task 1 verification (TypeScript check)
- **Issue:** 两个组件均 import Skeleton from '@/components/ui/skeleton'，但该组件未在项目中安装
- **Fix:** 替换为内联 `div` 带 `animate-pulse` 和 CSS 变量背景色的骨架屏，功能等效
- **Files modified:** TrendChart.tsx, SourcePieChart.tsx
- **Verification:** bunx tsc --noEmit 无相关错误
- **Committed in:** dbc6de8 / 6dd6945 (各自 task commit)

**2. [Rule 1 - Bug] Tooltip formatter 类型参数不兼容**
- **Found during:** Task 1 verification
- **Issue:** `formatter={(value: number) => [...]}` 与 Recharts Formatter 泛型不匹配
- **Fix:** 移除显式 `: number` 类型标注，让 TypeScript 推断
- **Files modified:** SourcePieChart.tsx
- **Verification:** TypeScript 无 error TS2322
- **Committed in:** 6dd6945

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** 两处修复均为正确性必需，无范围蔓延。

## Issues Encountered

- testcases/MoveFolderDialog.tsx 存在预存 `@/components/ui/button|dialog|scroll-area` 缺失，导致 `bun run build` 整体失败，但与本计划仪表盘模块无关。已记录为已有问题，不在本计划修复范围。

## Next Phase Readiness

- 仪表盘图表组件已完备，DSH-01~06 全部实现
- testcases 模块的 shadcn UI 缺失问题需在后续专项计划中处理

---

## Self-Check: PASSED

- TrendChart.tsx: FOUND
- SourcePieChart.tsx: FOUND
- page.tsx: FOUND (modified)
- Commit dbc6de8: FOUND
- Commit 6dd6945: FOUND

---
*Phase: 04-wai-wei-mo-kuai-kuo-zhan*
*Completed: 2026-03-16*
