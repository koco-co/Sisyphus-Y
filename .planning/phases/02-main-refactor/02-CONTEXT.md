# Phase 2: 主链路重构 - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

重构分析台（M03）和工作台（M05），实现「分析需求 → 确认测试点 → 生成用例」的完整无中断主链路。不包括：RAG 数据清洗入库（Phase 3）、Prompt 重写（Phase 3）、用例库增强（Phase 4）等外围模块。

</domain>

<decisions>
## Implementation Decisions

### 分析台左栏 — 需求列表

- 需求按迭代分组，分组头默认**全部折叠**，点击才展开（非当前迭代默认收起）
- 每条需求显示：需求标题 + 状态 Badge（未分析/分析中/已完成）+ 高风险数字（若 > 0 则显示红色数字）
- 左栏支持**拖拽调宽**，范围 200–320px
- 左栏头部有**搜索框**，输入过滤所有迭代内的需求，搜索范围为标题

### 分析台右栏 — 三Tab 状态保持

- 三Tab（需求详情/AI 分析/覆盖追踪）所有 Tab 载入后**常驻 DOM**，切换时仅 show/hide，不重新请求，刷新后通过持久化数据恢复状态
- Tab 切换零状态丢失（满足 ANA-03 要求）

### 分析台右栏 — AI 分析 Tab 内布局

- 上方「广度扫描结果」+ 下方「苏格拉底追问对话框」**动态分割**，用户可拖拽分割线调节上下比例
- 广度扫描结果区：高风险条目以**内联展开卡片**呈现，风险级别用颜色左边框区分（critical=sy-danger / major=sy-warn / minor=sy-info）
- 追问对话区：流式输出期间**禁用输入框**，完成后恢复，与现有 ChatInput 逻辑一致

### 「进入工作台」置灰逻辑

- 置灰触发条件：`DiagnosisRisk` 中存在 `risk_level=high` 且 `has_action_item=true` 且 `confirmed=false` 的记录
- 置灰时 hover 文案：`「存在 N 个高风险遗漏项未确认，请先在 AI 分析 Tab 中处理」`（N 为实际数量）
- 用户确认高风险项的操作：每条风险项旁有**「确认知晓」按钮**，点击后该条 `confirmed=true`，确认后按钮变为「已确认」灰态
- 点击「进入工作台」放行时，跳转携带 `?requirementId=xxx`，工作台自动选中该需求

### 工作台 Step1 — 测试点草稿

- 步骤条固定顶部（`ProgressSteps` 组件复用），Step1/Step2 当前步骤高亮
- 测试点草稿按**场景类型分组**，分组默认展开，超过 5 条显示「展示更多」收折
- 每条测试点显示：名称 + 场景类型 Badge + 预估用例数
- 支持勾选/取消；每组末尾有**「+ 添加测试点」行**，新增条目自动归属该组
- 至少勾选 1 个测试点后「开始生成」按钮才激活

### 工作台 Step1 — 右栏 RAG 预览

- **勾选测试点后即时触发 RAG 请求**，展示 top-5 相关历史用例（相似度 ≥ 0.72）
- 右栏固定显示：「已选测试点汇总」+ 「历史用例预览」两部分

### 工作台 Step2 — 流式输出

- SSE 流式输出 + `ThinkingStream` 折叠块（复用现有组件）+ `CaseCard` 逐条渲染
- 右栏实时展示已生成用例列表，按测试点分组，实时计数

### 工作台 Step1/Step2 来回切换

- Step2 完成后可点步骤条回到 Step1 补充测试点；**已生成用例保留**
- 回到 Step1 补充新测试点后，点「应用」**追加生成**新用例，添加到现有列表末尾，不清空已有结果

### Claude's Discretion

- 拖拽分割线的最小/最大高度约束
- 空状态页面（无需求、无测试点草稿）的具体插图和文案
- 覆盖追踪 Tab 的矩阵视图具体交互细节
- 错误状态处理（网络超时、SSE 中断）

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `ProgressSteps.tsx` (`components/ui/`) — Step1/Step2 步骤条，已有 done/active/pending 状态，直接复用
- `ThinkingStream.tsx` (`components/ui/`) — AI 思考过程折叠展示，Step2 流式输出复用
- `CaseCard.tsx` (`components/workspace/`) — 用例卡片渲染，Step2 右栏逐条复用
- `StreamCursor.tsx` (`components/workspace/`) — 流式输出光标动画
- `StatusBadge.tsx` (`components/ui/`) — 需求/测试点状态 Badge
- `ThreeColLayout.tsx` (`components/layout/`) — 三栏固定高布局，工作台已在用
- `ChatInput.tsx` (workbench/_components/) — 已有禁用逻辑，追问对话区可参考
- `AiConfigBanner.tsx` (`components/ui/`) — AI 未配置警告横幅，两页面均需复用

### Established Patterns

- 三栏各自独立 `overflow-y-auto`，高度 `calc(100vh - 49px - subNavHeight)`
- 状态管理：Zustand store（`diagnosis-store`、`useWorkbench` hook）— 新页面保持同一模式
- SSE 流式：`event: thinking | content | done`，前端已有完整处理逻辑（`useWorkbench`）
- 软删除查询：所有 service 必须过滤 `deleted_at.is_(None)`
- `?requirementId=xxx` 已是工作台的跳转约定（`getWorkbenchRequirementId` 函数存在）

### Integration Points

- `/analysis` 页面目前 re-export 自 `/requirements`，需重建为独立三栏布局
- 分析台「进入工作台」按钮 → 工作台 `?requirementId=xxx`（已有 query 工具函数）
- `DiagnosisRisk` 模型需新增 `confirmed` 字段（bool，默认 false）
- 后端 `diagnosis/router.py` 需新增 `PATCH /diagnosis/risks/{risk_id}/confirm` 端点

</code_context>

<specifics>
## Specific Ideas

- 高风险项颜色左边框区分风险级别：与现有 `StatusBadge` 的 sy-danger/sy-warn/sy-info 一致
- 拖拽调宽/调高参考 Linear 的 sidebar resize 体验：拖拽手柄宽度 4px，hover 时变蓝
- Step1「+ 添加测试点」行：样式参考 Notion 的 inline 添加行，虚线边框 + sy-text-3 文字，hover 高亮

</specifics>

<deferred>
## Deferred Ideas

- 测试点草稿支持拖拽排序 — Phase 4 或后续迭代
- AI 分析 Tab 内「重新分析」按钮（清空当前结果重跑）— Phase 3 Prompt 重写后再加
- 覆盖追踪 Tab 内矩阵视图的交互（点击单元格跳转用例）— Phase 4 用例库增强后关联

</deferred>

---

*Phase: 02-main-refactor*
*Context gathered: 2026-03-15*
