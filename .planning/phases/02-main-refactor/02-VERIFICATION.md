---
phase: 02-main-refactor
verified: 2026-03-15T14:30:00Z
status: human_needed
score: 5/5 success criteria verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "工作台 Step1 中栏 TestPointGroupList 已连入 workbench/page.tsx（WRK-02 gap 关闭，commit afaff22）"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "完整主链路端到端走通"
    expected: "分析台选需求 → AI分析 → 确认高风险 → 进入工作台 → Step1勾选测试点 → 开始生成 → 观察SSE流 → 返回Step1 → 追加勾选 → 追加生成，全程无中断"
    why_human: "SSE流式输出、追加差集逻辑、用例不覆盖行为均为运行时状态，静态代码扫描无法验证"
  - test: "分析台刷新状态恢复"
    expected: "刷新浏览器后仍选中同一需求，AI分析 Tab 仍激活，分析结果从DB恢复显示"
    why_human: "URL参数读取和 useDiagnosis DB恢复是运行时行为"
  - test: "Step1 折叠阈值展示"
    expected: "某分组测试点超过5条时显示「展示更多 (N)」按钮，点击展开；再次点击收起"
    why_human: "需要实际数据和浏览器交互验证 FOLD_THRESHOLD 运行时行为"
  - test: "拖拽交互行为"
    expected: "① 拖拽 AnalysisLeftPanel 右边缘宽度在200-320px范围内变化；② 拖拽 AnalysisTab 中间分割线高度比在30%-70%范围内变化"
    why_human: "MouseEvent 交互无法静态验证"
  - test: "高风险置灰逻辑"
    expected: "有未确认高风险时「进入工作台」按钮置灰，hover显示正确文案；全部确认后激活"
    why_human: "需要实际后端数据和浏览器 hover 行为"
---

# Phase 2: 主链路重构 Verification Report

**Phase Goal:** 分析台和工作台完成重构，测试工程师可无中断地完成「分析需求 → 确认测试点 → 生成用例」全流程
**Verified:** 2026-03-15T14:30:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (WRK-02 / TestPointGroupList wiring)

---

## Re-verification Summary

| Item | Previous | Current |
|------|----------|---------|
| Overall status | gaps_found | human_needed |
| Score | 4/5 | 5/5 |
| WRK-02 gap | PARTIAL | CLOSED |
| Regressions | — | None |

**Gap closure evidence:**
- Commit `afaff22` (`feat(02-07): replace TestPointList with TestPointGroupList in workbench Step1`)
- `workbench/page.tsx` line 20: `import TestPointGroupList from './_components/TestPointGroupList';`
- `workbench/page.tsx` lines 272-288: JSX uses `TestPointGroupList` with all required props
- `TestPointList` import fully removed (grep confirms zero occurrences)
- `TestPointGroupList.tsx` line 9: `const FOLD_THRESHOLD = 5;` — fold logic confirmed active
- `TestPointGroupList.tsx` lines 139-149: conditional render of `展示更多 (N)` / `收起` button

---

## Goal Achievement

### Observable Truths (from Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 分析台所有「诊断」字样已替换为「分析」，包括按钮、路由、日志 | ✓ VERIFIED | analysis/_components/ 下 grep 无「诊断」；导航栏已是「分析台」；AIModelSettings 已替换；后端 API 路径 /api/diagnosis 保持不变（符合计划） |
| 2 | 分析台左侧需求列表按迭代分组显示状态 Badge；右侧三 Tab 切换不刷新，刷新后状态完整恢复 | ✓ VERIFIED | AnalysisLeftPanel.tsx (260行) 实现按 product→iteration 分组、StatusBadge、高风险数字 badge；page.tsx 通过 URL searchParams (?reqId+?tab) 持久化状态 |
| 3 | AI 分析 Tab 内广度扫描结果在上、苏格拉底追问对话框在下，两区同屏可见 | ✓ VERIFIED | AnalysisTab.tsx (438行) 实现上下 splitRatio 分割布局，上区显示 risks 列表，下区为 DiagnosisChat；拖拽分割线 (4px cursor-row-resize) 已连线 |
| 4 | 存在未处理高风险项时「进入工作台」按钮置灰，hover 显示提示文案 | ✓ VERIFIED | AnalysisTab.tsx 第282-307行：disabled={hasUnhandledHighRisk}，title 属性含文案，group-hover 下方 tooltip 实现；调用 PATCH /api/diagnosis/risks/{id}/confirm 端点 |
| 5 | 工作台步骤条固定顶部，Step1 可勾选/手动添加测试点并预览 RAG 历史用例，Step2 SSE 流式输出用例，完成后可回到 Step1 补充再生成 | ✓ VERIFIED | 步骤条 (WorkbenchStepBar)、RAG 预览、SSE 生成、回退 Step1 均正确实现；TestPointGroupList 已连入 Step1 中栏，FOLD_THRESHOLD=5 折叠逻辑激活（commit afaff22） |

**Score:** 5/5 truths verified

---

## Required Artifacts

### Plan 01 Backend (ANA-07, WRK-04)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/alembic/versions/4bf80568fe2c_add_confirmed_to_diagnosis_risks.py` | DB migration for confirmed column | ✓ VERIFIED | 存在，op.add_column('diagnosis_risks', confirmed boolean) |
| `backend/app/modules/diagnosis/router.py` | confirm risk endpoint | ✓ VERIFIED | 存在，第118行 async def confirm_risk |
| `backend/app/modules/scene_map/router.py` | RAG preview endpoint | ✓ VERIFIED | 存在，第117行 POST /{requirement_id}/rag-preview |

### Plan 02 Frontend Layout (ANA-02, ANA-03, ANA-06)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/app/(main)/analysis/page.tsx` | 分析台主页三栏容器，min 60行 | ✓ VERIFIED | 61行，独立页面，URL 持久化双参数，含 AiConfigBanner |
| `frontend/src/app/(main)/analysis/_components/AnalysisLeftPanel.tsx` | 需求列表，迭代分组，搜索，拖拽调宽，min 100行 | ✓ VERIFIED | 260行，完整实现拖拽 (200-320px)、搜索过滤、迭代分组 |
| `frontend/src/app/(main)/analysis/_components/AnalysisRightPanel.tsx` | 三 Tab 常驻 DOM 容器，min 60行 | ✓ VERIFIED | 96行，absolute inset-0 hidden 模式切换，三 Tab 常驻 DOM |

### Plan 03 AI Analysis Tab (ANA-04, ANA-06, ANA-07)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/app/(main)/analysis/_components/AnalysisTab.tsx` | 增强版 AI 分析 Tab，min 150行 | ✓ VERIFIED | 438行，上下分割、风险确认按钮、置灰逻辑完整 |

### Plan 04 Coverage + Workbench Step1 (ANA-05, WRK-01-04)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/app/(main)/analysis/_components/CoverageTab.tsx` | 覆盖追踪矩阵 Tab，min 40行 | ⚠️ STUB-THIN | 13行，薄包装层（符合计划设计，直接复用 CoverageMatrix） |
| `frontend/src/app/(main)/workbench/_components/WorkbenchStepBar.tsx` | 固定顶部步骤条，min 30行 | ✓ VERIFIED | 41行，sticky top-0，ProgressSteps 封装 |
| `frontend/src/app/(main)/workbench/_components/TestPointGroupList.tsx` | 测试点分组列表，min 80行 | ✓ VERIFIED | 251行，FOLD_THRESHOLD=5 折叠逻辑，已连入 workbench/page.tsx |
| `frontend/src/app/(main)/workbench/_components/RagPreviewPanel.tsx` | 已选测试点 + RAG 历史用例预览，min 60行 | ✓ VERIFIED | 148行，fetch /scene-map/{id}/rag-preview，top-5 展示，相似度分数 |

### Plan 05 Workbench Step2 (WRK-05-07)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/app/(main)/workbench/_components/GenerationPanel.tsx` | Step2 中栏 SSE+ThinkingStream+CaseCard，min 80行 | ✓ VERIFIED | 207行，两步 SSE 启动，ThinkingStream，CaseCard 渲染，重试按钮 |
| `frontend/src/app/(main)/workbench/_components/GeneratedCasesByPoint.tsx` | Step2 右栏按测试点分组，min 60行 | ✓ VERIFIED | 96行，按 test_point_id 分组，实时计数，streaming 动画 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `diagnosis/router.py` | `diagnosis/service.py` | `svc.confirm_risk(risk)` | ✓ WIRED | router.py 第123行调用，service.py 第52行实现 |
| `scene_map/router.py` | `engine/rag/retriever.py` | `retrieve_similar_cases()` | ✓ WIRED | router.py 第129-130行 import + 调用 |
| `analysis/page.tsx` | `AnalysisLeftPanel.tsx` | `onSelectRequirement` prop | ✓ WIRED | page.tsx 第41行传入 prop |
| `AnalysisLeftPanel.tsx` | `useRequirementTree` hook | import | ✓ WIRED | 第7行 import，第34行使用 |
| `analysis/page.tsx` | URL searchParams | `router.push ?reqId+?tab` | ✓ WIRED | 第26-34行均写入 URL，useState 初始化时读取 |
| `AnalysisTab.tsx` | `PATCH /api/diagnosis/risks/{id}/confirm` | fetch PATCH | ✓ WIRED | 第221行 fetch PATCH |
| `AnalysisTab.tsx` (进入工作台) | `/workbench?reqId={reqId}` | `router.push` | ✓ WIRED | 第285行 router.push 使用 reqId 参数 |
| `workbench/page.tsx` | `TestPointGroupList.tsx` | import + JSX | ✓ WIRED | 第20行 import，第272-288行 JSX，props: requirementId/checkedPointIds/onToggle/onAdd/onStartGenerate |
| `TestPointGroupList.tsx` | `workspace-store` (checkedPointIds) | checkedPointIds/onToggle prop | ✓ WIRED | sm.checkedPointIds + sm.toggleCheckPoint 通过 props 传入 |
| `RagPreviewPanel.tsx` | `POST /scene-map/{req_id}/rag-preview` | fetch POST | ✓ WIRED | 第52行 apiClient POST |
| `workbench/page.tsx` | `workspace-store` (appendTestCases) | appendTestCases | ✓ WIRED | 第174行调用 store.appendTestCases |
| `workbench/page.tsx` | `workspace-store` (lastGeneratedPointIds) | setLastGeneratedPointIds | ✓ WIRED | 第145、158行调用 |
| `GenerationPanel.tsx` | `POST /api/generation/sessions/{id}/chat` | sse.startStream | ✓ WIRED | 第65行 sse.startStream(`/generation/sessions/${sessionData.id}/chat`) |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ANA-01 | 02-06 | 「诊断」全局重命名为「分析」 | ✓ SATISFIED | analysis/ 目录无「诊断」可见文案；导航栏「分析台」；settings 已替换 |
| ANA-02 | 02-02 | 分析台布局：左侧需求列表按迭代分组，状态 Badge | ✓ SATISFIED | AnalysisLeftPanel.tsx 完整实现 product→iteration→requirement 三级树 |
| ANA-03 | 02-02 | 右侧三 Tab 同页切换，切换不丢失状态 | ✓ SATISFIED | AnalysisRightPanel.tsx absolute inset-0 hidden 模式，Tab 状态由 URL 持久化 |
| ANA-04 | 02-03 | AI 分析 Tab：上方广度扫描 + 下方苏格拉底追问，上下布局 | ✓ SATISFIED | AnalysisTab.tsx 上下 splitRatio 分割，两区均渲染 |
| ANA-05 | 02-04 | 覆盖追踪 Tab：需求点 x 场景类型矩阵视图 | ✓ SATISFIED | CoverageTab.tsx 包装 CoverageMatrix，传 requirementId+visible |
| ANA-06 | 02-02/03 | 分析结果刷新后完整恢复（持久化到 DB） | ✓ SATISFIED | URL 双参数持久化；useDiagnosis hook 从 DB 加载历史数据 |
| ANA-07 | 02-01/03 | 未处理高风险项时「进入工作台」按钮置灰，hover 提示 | ✓ SATISFIED | PATCH confirm 端点实现；AnalysisTab.tsx 置灰 + tooltip 实现 |
| WRK-01 | 02-04 | 步骤条固定顶部，Step1/Step2，当前步骤高亮 | ✓ SATISFIED | WorkbenchStepBar sticky top-0，在 workbench/page.tsx 中挂载 |
| WRK-02 | 02-04/07 | Step1 中栏：AI 生成测试点草稿，按场景类型分组，每条显示名称/Badge/预估用例数，超5条折叠 | ✓ SATISFIED | TestPointGroupList 已连入 Step1 中栏（commit afaff22）；FOLD_THRESHOLD=5；「展示更多 (N)」/ 收起 按钮存在 |
| WRK-03 | 02-04 | Step1 支持勾选/取消/手动添加，至少勾选1个「开始生成」才激活 | ✓ SATISFIED | TestPointGroupList 内置 checkedPointIds.size === 0 时 disabled 控制 |
| WRK-04 | 02-01/04 | Step1 右栏：已选测试点汇总 + RAG 预览 top-5，相似度≥0.72 | ✓ SATISFIED | RagPreviewPanel.tsx 实现；后端 score_threshold=0.72；前端显示 top-5 |
| WRK-05 | 02-05 | Step2 中栏：SSE 流式输出 + AI 思考过程折叠块 + CaseCard 逐条渲染 | ✓ SATISFIED | GenerationPanel.tsx ThinkingStream + CaseCard + StreamCursor 完整实现 |
| WRK-06 | 02-05 | Step2 右栏：已生成用例列表，实时计数，按测试点分组 | ✓ SATISFIED | GeneratedCasesByPoint.tsx 按 test_point_id 分组，streaming 动画计数 |
| WRK-07 | 02-05 | Step2 完成后可点步骤条回到 Step1 补充测试点继续追加生成 | ✓ SATISFIED | 步骤条 onStepClick 回退；page.tsx isAppendModeRef 差集计算；appendTestCases 不覆盖 |

**Orphaned requirements:** 无（所有14个要求均有 plan 声明，无遗漏）

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `analysis/_components/CoverageTab.tsx` | 全文 | 13行薄包装（非 stub，设计合理） | Info | 符合 Plan 04 设计意图，直接复用 CoverageMatrix |

**Note:** `TestPointGroupList` 孤儿化反模式已消除（commit afaff22）。

---

## Human Verification Required

### 1. 完整主链路端到端走通

**Test:** 访问 http://localhost:3000/analysis → 选择需求 → AI分析Tab → 点「确认知晓」处理高风险 → 进入工作台 → Step1勾选测试点 → 开始生成 → 观察SSE流 → 返回Step1 → 追加勾选 → 追加生成
**Expected:** 全程无页面刷新中断，追加生成不清空已有用例，追加按钮文案由「开始生成」变为「追加生成」
**Why human:** SSE流式输出、追加差集逻辑、用例不覆盖行为均为运行时状态，静态代码扫描无法验证

### 2. 分析台刷新状态恢复

**Test:** 选中需求并切到 AI分析 Tab，刷新浏览器
**Expected:** 刷新后仍选中同一需求，AI分析 Tab 仍激活，分析结果从DB恢复显示
**Why human:** URL参数读取和 useDiagnosis DB恢复是运行时行为

### 3. Step1 折叠阈值展示

**Test:** 确保某分组下测试点超过5条，进入工作台 Step1
**Expected:** 该分组超出5条的部分被折叠，显示「展示更多 (N)」按钮；点击后全部展开，按钮变为「收起」
**Why human:** 需要实际数据和浏览器交互验证 FOLD_THRESHOLD 运行时行为

### 4. 拖拽交互行为

**Test:** ① 拖拽 AnalysisLeftPanel 右边缘调宽 ② 拖拽 AnalysisTab 中间分割线调高度比
**Expected:** ① 宽度在200-320px范围内变化 ② 高度比在30%-70%范围内变化
**Why human:** MouseEvent 交互无法静态验证

### 5. 高风险置灰逻辑

**Test:** 确认存在高风险项的需求，在 AI分析 Tab 验证「进入工作台」按钮状态
**Expected:** 有未确认高风险时按钮置灰，hover显示「存在 N 个高风险遗漏项未确认」文案；全部确认后激活
**Why human:** 需要实际后端数据和浏览器 hover 行为

---

## Final Summary

本次复核验证确认 Plan 07 成功关闭了初次验证发现的唯一 gap：

**WRK-02 gap 已关闭：** `workbench/page.tsx` 第20行通过 `import TestPointGroupList from './_components/TestPointGroupList'` 引入，第272-288行完整传入5个 props（requirementId / checkedPointIds / onToggle / onAdd / onStartGenerate）。`TestPointList` 引用已从文件中完全移除。`TestPointGroupList` 内部的 `FOLD_THRESHOLD=5` 折叠逻辑及「展示更多 (N) / 收起」交互现已对工作台用户生效。

所有14个需求（ANA-01 至 ANA-07，WRK-01 至 WRK-07）均有代码证据支撑，无孤儿需求。无代码级 blockers。剩余5项均为需要浏览器运行时的人工验收项目。

---

*Verified: 2026-03-15T14:30:00Z*
*Verifier: Claude (gsd-verifier)*
