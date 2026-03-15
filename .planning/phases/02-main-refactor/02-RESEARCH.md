# Phase 2: 主链路重构 - Research

**Researched:** 2026-03-15
**Domain:** Next.js App Router 前端重构 + FastAPI 后端扩展（分析台 M03 + 工作台 M05）
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**分析台左栏 — 需求列表**
- 需求按迭代分组，分组头默认全部折叠，点击才展开（非当前迭代默认收起）
- 每条需求显示：需求标题 + 状态 Badge（未分析/分析中/已完成）+ 高风险数字（若 > 0 则显示红色数字）
- 左栏支持拖拽调宽，范围 200–320px
- 左栏头部有搜索框，输入过滤所有迭代内的需求，搜索范围为标题

**分析台右栏 — 三Tab 状态保持**
- 三Tab（需求详情/AI 分析/覆盖追踪）所有 Tab 载入后常驻 DOM，切换时仅 show/hide，不重新请求，刷新后通过持久化数据恢复状态
- Tab 切换零状态丢失（满足 ANA-03 要求）

**分析台右栏 — AI 分析 Tab 内布局**
- 上方「广度扫描结果」+ 下方「苏格拉底追问对话框」动态分割，用户可拖拽分割线调节上下比例
- 广度扫描结果区：高风险条目以内联展开卡片呈现，风险级别用颜色左边框区分（critical=sy-danger / major=sy-warn / minor=sy-info）
- 追问对话区：流式输出期间禁用输入框，完成后恢复，与现有 ChatInput 逻辑一致

**「进入工作台」置灰逻辑**
- 置灰触发条件：`DiagnosisRisk` 中存在 `risk_level=high` 且 `has_action_item=true` 且 `confirmed=false` 的记录
- 置灰时 hover 文案：`「存在 N 个高风险遗漏项未确认，请先在 AI 分析 Tab 中处理」`（N 为实际数量）
- 用户确认高风险项的操作：每条风险项旁有「确认知晓」按钮，点击后该条 `confirmed=true`，确认后按钮变为「已确认」灰态
- 点击「进入工作台」放行时，跳转携带 `?reqId=xxx`，工作台自动选中该需求

**工作台 Step1 — 测试点草稿**
- 步骤条固定顶部（`ProgressSteps` 组件复用），Step1/Step2 当前步骤高亮
- 测试点草稿按场景类型分组，分组默认展开，超过 5 条显示「展示更多」收折
- 每条测试点显示：名称 + 场景类型 Badge + 预估用例数
- 支持勾选/取消；每组末尾有「+ 添加测试点」行，新增条目自动归属该组
- 至少勾选 1 个测试点后「开始生成」按钮才激活

**工作台 Step1 — 右栏 RAG 预览**
- 勾选测试点后即时触发 RAG 请求，展示 top-5 相关历史用例（相似度 ≥ 0.72）
- 右栏固定显示：「已选测试点汇总」+「历史用例预览」两部分

**工作台 Step2 — 流式输出**
- SSE 流式输出 + `ThinkingStream` 折叠块（复用现有组件）+ `CaseCard` 逐条渲染
- 右栏实时展示已生成用例列表，按测试点分组，实时计数

**工作台 Step1/Step2 来回切换**
- Step2 完成后可点步骤条回到 Step1 补充测试点；已生成用例保留
- 回到 Step1 补充新测试点后，点「应用」追加生成新用例，添加到现有列表末尾，不清空已有结果

### Claude's Discretion
- 拖拽分割线的最小/最大高度约束
- 空状态页面（无需求、无测试点草稿）的具体插图和文案
- 覆盖追踪 Tab 的矩阵视图具体交互细节
- 错误状态处理（网络超时、SSE 中断）

### Deferred Ideas (OUT OF SCOPE)
- 测试点草稿支持拖拽排序 — Phase 4 或后续迭代
- AI 分析 Tab 内「重新分析」按钮（清空当前结果重跑）— Phase 3 Prompt 重写后再加
- 覆盖追踪 Tab 内矩阵视图的交互（点击单元格跳转用例）— Phase 4 用例库增强后关联
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANA-01 | 「诊断」全局重命名为「分析」（页面/按钮/API路由/注释/数据库字段注释） | 后端 `/diagnosis` 路由保持兼容或新增 `/analysis` 别名；前端组件名和路由路径同步重命名 |
| ANA-02 | 分析台布局：左侧需求列表按迭代分组，每条需求显示状态 Badge | 现有 `useRequirementTree` hook 已实现树形加载；需扩展状态 badge 和搜索过滤逻辑 |
| ANA-03 | 右侧三 Tab 同页切换，切换不丢失状态 | 现有 diagnosis/page.tsx 已实现 `absolute inset-0 hidden` 常驻 DOM 模式，可复用该模式 |
| ANA-04 | AI 分析 Tab 内：上方广度扫描结果 + 下方苏格拉底追问对话框，动态分割 | 现有 `AnalysisTab.tsx` 已实现上下布局，需改为可拖拽分割线 |
| ANA-05 | 覆盖追踪 Tab：需求点 × 场景类型矩阵视图 | 现有 `CoverageMatrix.tsx` 已有基础，`CoverageMatrix` 后端模型+API 已就绪 |
| ANA-06 | 分析结果刷新后完整恢复（持久化到 DB） | 后端已做 DiagnosisReport/DiagnosisChatMessage 持久化；前端 useDiagnosis 加载时恢复 |
| ANA-07 | 存在未处理高风险遗漏项时「进入工作台」按钮置灰 | 需后端新增 `confirmed` 字段 + `PATCH /diagnosis/risks/{risk_id}/confirm` 端点；前端 hasUnhandledHighRisk 逻辑已有雏形 |
| WRK-01 | 步骤条固定顶部，Step 1/2 当前步骤高亮 | `ProgressSteps` 组件已存在且支持 done/active/pending 状态，需包装为固定顶部条 |
| WRK-02 | Step1 中栏：AI 生成测试点草稿，按场景类型分组 | 后端 `TestPoint` 有 `group_name` 字段；`scene-map` API 已可获取测试点列表 |
| WRK-03 | Step1 支持勾选/取消/手动添加测试点，至少勾选1个「开始生成」才激活 | `useSceneMap` hook + `checkedPointIds: Set<string>` 已有完整勾选逻辑，可复用 |
| WRK-04 | Step1 右栏：已选测试点汇总 + RAG 检索历史用例预览（top-5，相似度≥0.72） | `retrieve_similar_cases()` 函数已实现，需新增 `POST /scene-map/rag-preview` 端点暴露给前端 |
| WRK-05 | Step2 中栏：SSE 流式输出 + AI 思考过程折叠块 + CaseCard 逐条渲染 | `ThinkingStream.tsx`、`CaseCard.tsx`、`useSSE` hook 均已就绪 |
| WRK-06 | Step2 右栏：已生成用例列表，实时计数，按测试点分组 | `GeneratedCases.tsx` 组件已有，需扩展为按测试点分组 |
| WRK-07 | Step2 完成后可点步骤条回到 Step1 补充测试点继续追加生成 | 工作台 `viewStep` 状态控制已存在，需实现追加生成逻辑（不清空已有用例）|
</phase_requirements>

---

## Summary

Phase 2 的核心工作是将现有分析台（diagnosis）和工作台（workbench）从 MVP 状态重构为符合产品规格的完整形态。关键挑战有三：

第一，分析台当前的 `/analysis/page.tsx` 是 `/requirements/page.tsx` 的 re-export，`/analysis/diagnosis/page.tsx` 是 `/diagnosis/page.tsx` 的 re-export。Phase 2 必须将分析台重建为独立的三栏布局，同时现有 `diagnosis/page.tsx` 中已有的三 Tab 常驻 DOM 模式、`useRequirementTree` 树形加载、状态 badge 逻辑都是直接复用资产，避免重复开发。

第二，后端 `DiagnosisRisk` 模型缺少 `confirmed` 字段（ANA-07 必需），且 RAG 历史用例预览端点（WRK-04 必需）尚未暴露给前端。这两处后端改动是解锁前端功能的前提，属于 Wave 0 任务。

第三，工作台的"回到 Step1 追加生成"需要在 Zustand store 中区分「本次新增测试点」和「已有测试点」，生成时只传入新增部分，同时保留已有 testCases 列表。现有 `workspace-store.ts` 中的数据结构需要扩展。

**Primary recommendation:** 先完成后端 DB 迁移（`confirmed` 字段）+ RAG 预览端点，再并行重构分析台和工作台前端，最后做「诊断」→「分析」的全局文字替换。

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16 (项目固定) | 路由、页面、布局 | 项目技术栈 |
| Zustand | latest | 前端状态管理 | 项目已用，diagnosis-store / scene-map-store / workspace-store 均为 Zustand |
| FastAPI | latest | 后端 API | 项目技术栈 |
| SQLAlchemy 2.0 async | 2.0 | ORM | 项目已用 |
| Alembic | latest | DB 迁移 | 项目已用，迁移文件在 `backend/alembic/versions/` |
| Tailwind CSS v3 + sy-* token | v3 | 样式 | 项目设计规范，禁止硬编码色值 |
| shadcn/ui | latest | 基础 UI 组件 | 项目技术栈 |
| lucide-react | latest | 图标（禁止 emoji） | 项目规范 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | latest | 服务端数据请求/缓存 | requirements/page.tsx 已在用，新页面可复用 |
| useSSE (项目内部 hook) | — | SSE 流式消费 | Step2 生成用例时复用 |
| Qdrant | latest | 向量检索 | RAG 预览后端调用 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 自实现拖拽调宽 | react-resizable-panels | 项目简单场景（仅2处），自实现 `onMouseDown` + `mousemove` 监听足够；引入新依赖不合算 |
| 常驻 DOM + hidden | React Tabs / Radix Tabs | 项目已有 `absolute inset-0 hidden` 模式，保持一致 |

**Installation:** 无需新增依赖，全部复用现有技术栈。

---

## Architecture Patterns

### 分析台重构目标结构

```
frontend/src/app/(main)/analysis/
├── layout.tsx                  # 移除子路由 Tab nav（改为右栏内 Tab）
├── page.tsx                    # 独立三栏布局（不再 re-export requirements）
└── _components/
    ├── AnalysisLeftPanel.tsx   # 需求列表（搜索 + 迭代分组 + 拖拽调宽）
    ├── AnalysisRightPanel.tsx  # 三 Tab 常驻 DOM 容器
    ├── RequirementDetailTab.tsx # 复用 diagnosis/_components/RequirementDetailTab
    ├── AnalysisTab.tsx         # 复用+增强 diagnosis/_components/AnalysisTab（可拖拽分割）
    └── CoverageTab.tsx         # 复用 diagnosis/_components/CoverageMatrix
```

```
backend/app/modules/diagnosis/
├── models.py      # DiagnosisRisk 新增 confirmed: bool
├── schemas.py     # DiagnosisRiskResponse 新增 confirmed 字段
├── service.py     # 新增 confirm_risk() 方法
└── router.py      # 新增 PATCH /diagnosis/risks/{risk_id}/confirm
```

### 工作台重构目标结构

```
frontend/src/app/(main)/workbench/
├── page.tsx                    # 重构：Step1/Step2 视图切换，追加生成逻辑
└── _components/
    ├── WorkbenchStepBar.tsx    # 封装固定顶部步骤条（复用 ProgressSteps）
    ├── TestPointGroupList.tsx  # Step1 中栏：按 group_name 分组 + 收折 + 添加行
    ├── RagPreviewPanel.tsx     # Step1 右栏：已选汇总 + RAG 历史用例预览
    ├── GenerationPanel.tsx     # Step2 中栏：SSE 流 + ThinkingStream + CaseCard
    └── GeneratedCasesByPoint.tsx # Step2 右栏：按测试点分组的实时用例列表
```

### Pattern 1: 三 Tab 常驻 DOM

**What:** 所有 Tab 内容同时挂载，通过 `hidden` class 控制显隐，不卸载。
**When to use:** Tab 切换需要零状态丢失，且 Tab 内有异步加载状态。

```tsx
// 参考 diagnosis/page.tsx 现有实现
<div className="flex-1 overflow-hidden relative">
  <div className={`absolute inset-0 ${activeTab === 'detail' ? '' : 'hidden'}`}>
    <RequirementDetailTab ... />
  </div>
  <div className={`absolute inset-0 ${activeTab === 'analysis' ? '' : 'hidden'}`}>
    <AnalysisTab ... />
  </div>
  <div className={`absolute inset-0 ${activeTab === 'coverage' ? '' : 'hidden'}`}>
    <CoverageMatrix ... />
  </div>
</div>
```

### Pattern 2: 拖拽调宽/调高（原生实现）

**What:** 通过 `onMouseDown` 监听 + `document.addEventListener('mousemove')` 实现，无需额外依赖。
**When to use:** 左栏调宽（200–320px 范围）、AI 分析 Tab 内上下分割线调节。

```tsx
// 拖拽手柄宽度 4px，hover 时变 sy-accent 色
const handleMouseDown = (e: React.MouseEvent) => {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = panelWidth;
  const onMove = (e: MouseEvent) => {
    const delta = e.clientX - startX;
    setPanelWidth(Math.min(320, Math.max(200, startWidth + delta)));
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
};
```

### Pattern 3: 软删除查询（强制规范）

```python
# 所有 service 查询必须过滤，不可省略
.where(Model.deleted_at.is_(None))
```

### Pattern 4: Zustand 追加生成状态设计

**What:** 工作台 store 需区分「全量用例列表」和「本次生成的测试点 ID 集合」，追加生成时 merge 而非覆盖。

```typescript
// workspace-store.ts 需新增
appendedTestPointIds: Set<string>;      // 本次 Step1 新勾选（相对上次生成）
setAppendedPointIds: (ids: Set<string>) => void;

// 追加生成时：将新生成的用例 push 到 testCases 末尾，不 setTestCases([])
appendTestCases: (cases: WorkbenchTestCase[]) => void;
```

### Anti-Patterns to Avoid

- **直接修改 `/analysis/layout.tsx` 的子路由 Tab Nav：** Phase 2 分析台改为右栏内三 Tab，原 layout 的 Tab 导航需移除或改为仅保留「需求列表」入口。
- **在 router/service 写 Prompt 内容：** 新增 RAG 预览端点不能包含 Prompt 逻辑，仅调用 `retrieve_similar_cases()`。
- **用 `json.loads()` 直接解析 LLM 输出：** 必须用 `re.search(r'\{.*\}', content, re.DOTALL)` 安全提取。
- **跨模块直接访问 model 层：** `scene_map` 调 RAG 要通过 `engine/rag/retriever.py`，不直接查 knowledge 表。
- **物理删除业务数据：** 所有软删除走 `SoftDeleteMixin`，通过 `deleted_at`。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE 流式消费 | 自己写 fetch + ReadableStream | `useSSE` hook（已存在） | 已处理心跳、超时、error 边界 |
| 需求树形加载 | 重新实现 product→iteration→requirement 三级懒加载 | `useRequirementTree` hook（已存在） | 已处理展开/折叠/loading 状态 |
| 三 Tab 常驻 DOM | 引入 Radix Tabs | `absolute inset-0 hidden` 模式（已用于 diagnosis/page.tsx） | 项目已有一致实现，零依赖 |
| 向量相似度检索 | 自己查 Qdrant | `retrieve_similar_cases()` in `engine/rag/retriever.py` | 已处理 collection 不存在的降级 |
| 流式光标动画 | 自实现 CSS | `StreamCursor.tsx`（已存在） | 已封装 `animate-blink` |

**Key insight:** Phase 2 的大量 UI 基础设施在 Phase 1 的 diagnosis/workbench 页面中已经实现。核心工作是「重组」而非「重建」。

---

## Common Pitfalls

### Pitfall 1: URL 参数命名不一致

**What goes wrong:** 分析台跳转工作台用 `?requirementId=xxx`，但工作台 `getWorkbenchRequirementId()` 读的是 `reqId`（同时兼容 `req`）。
**Why it happens:** CONTEXT.md 写「携带 `?requirementId=xxx`」，但代码约定是 `?reqId=xxx`。
**How to avoid:** 统一用 `?reqId=xxx`（沿用现有约定，`getWorkbenchRequirementId` 函数读 `reqId`）。

### Pitfall 2: `DiagnosisRisk` 字段映射错误

**What goes wrong:** 后端 model 的字段是 `level`（值为 `"high"/"medium"/"low"`），前端 api.ts 的 `DiagnosisRisk` 接口是 `severity`。置灰逻辑用的是哪个字段需确认。
**Why it happens:** 后端 model 和前端类型定义出现字段名不一致。
**How to avoid:** 新增 `confirmed` 字段时，同步检查 service.py 的 `update_risk_status` 和 schema 的 `DiagnosisRiskUpdate`，确保 `PATCH confirm` 端点字段命名一致。置灰计数用后端 `level == "high"` 字段。

### Pitfall 3: Tab 常驻 DOM 导致不必要的并发请求

**What goes wrong:** 三个 Tab 同时挂载后，覆盖追踪 Tab 即使不可见也会在切换需求时立即发起 API 请求。
**Why it happens:** 常驻 DOM 模式下所有 Tab 的 `useEffect` 都会触发。
**How to avoid:** 覆盖追踪 Tab 内部判断 `reqId` 是否变化再请求，或使用 `hidden` 时跳过请求（通过 `visible` prop 传入）。

### Pitfall 4: `confirmed` 字段缺失导致 DB 迁移遗漏

**What goes wrong:** 直接在 `DiagnosisRisk` model 加字段但忘记生成 Alembic migration，运行时报 `column not found`。
**Why it happens:** SQLAlchemy async 不会自动建列。
**How to avoid:** 每次修改 model 后必须 `uv run alembic revision --autogenerate -m "add confirmed to diagnosis_risks"` + `uv run alembic upgrade head`。

### Pitfall 5: RAG 预览端点在 Qdrant 未启动时崩溃

**What goes wrong:** `retrieve_similar_cases()` 内部 `_get_client()` 会抛出连接错误，导致整个请求 500。
**Why it happens:** `TESTCASE_COLLECTION` 不存在时函数有 `logger.warning + return []` 降级，但 Qdrant 连接失败本身没有 try/except。
**How to avoid:** RAG 预览端点对 `retrieve_similar_cases()` 调用套 try/except，失败时返回空列表并记录警告，不 500。

### Pitfall 6: 工作台追加生成清空已有用例

**What goes wrong:** 回到 Step1 补充测试点后点「应用」，`selectRequirement` 里调用了 `store.setTestCases([])` 导致已生成用例被清空。
**Why it happens:** 现有 `selectRequirement` 在切换需求时重置了所有状态。
**How to avoid:** 追加生成路径不走 `selectRequirement`，只更新 `appendedTestPointIds`；生成完成后调用新的 `appendTestCases()` 而非 `setTestCases()`。

---

## Code Examples

### ANA-07: 高风险置灰逻辑（前端）

```tsx
// diagnosis/page.tsx 现有模式，需扩展 confirmed 字段判断
const hasUnhandledHighRisk = (report?.risks ?? []).some(
  (r) => r.level === 'high' && !r.confirmed
);
const unhandledCount = (report?.risks ?? []).filter(
  (r) => r.level === 'high' && !r.confirmed
).length;

// hover 文案
`存在 ${unhandledCount} 个高风险遗漏项未确认，请先在 AI 分析 Tab 中处理`
```

### ANA-07: 后端新增 confirm 端点

```python
# backend/app/modules/diagnosis/router.py
@router.patch("/risks/{risk_id}/confirm", response_model=DiagnosisRiskResponse)
async def confirm_risk(
    risk_id: uuid.UUID,
    session: AsyncSessionDep,
) -> DiagnosisRiskResponse:
    svc = DiagnosisService(session)
    risk = await svc.get_risk(risk_id)
    if not risk:
        raise HTTPException(status_code=404, detail="DiagnosisRisk not found")
    risk = await svc.confirm_risk(risk)
    return DiagnosisRiskResponse.model_validate(risk)
```

### ANA-07: DB migration（新增 confirmed 字段）

```python
# alembic migration
def upgrade() -> None:
    op.add_column(
        "diagnosis_risks",
        sa.Column("confirmed", sa.Boolean(), nullable=False, server_default="false"),
    )

def downgrade() -> None:
    op.drop_column("diagnosis_risks", "confirmed")
```

### WRK-04: RAG 预览端点

```python
# backend/app/modules/scene_map/router.py
class RagPreviewRequest(BaseModel):
    test_point_ids: list[uuid.UUID]

@router.post("/{requirement_id}/rag-preview")
async def rag_preview(
    requirement_id: uuid.UUID,
    data: RagPreviewRequest,
    session: AsyncSessionDep,
) -> dict:
    """返回勾选测试点对应的 top-5 历史用例（RAG 检索）。"""
    from app.engine.rag.retriever import retrieve_similar_cases
    svc = SceneMapService(session)
    # 获取测试点标题拼接为查询文本
    points = await svc.get_test_points_by_ids(data.test_point_ids)
    query = " ".join(p.title for p in points)
    try:
        results = await retrieve_similar_cases(query, top_k=5, score_threshold=0.72)
    except Exception:
        results = []
    return {"results": [{"title": r.metadata.get("title",""), "score": r.score, "content": r.content} for r in results]}
```

### WRK-03: 测试点分组渲染（前端）

```tsx
// 按 group_name 聚合
const grouped = testPoints.reduce<Record<string, TestPointItem[]>>((acc, tp) => {
  (acc[tp.group_name] ??= []).push(tp);
  return acc;
}, {});

// 渲染每组
Object.entries(grouped).map(([group, points]) => (
  <TestPointGroup
    key={group}
    group={group}
    points={points}
    checkedIds={checkedPointIds}
    onToggle={onToggleCheck}
    onAdd={() => handleAddPoint(group)}
  />
))
```

---

## Key Integration Points (Critical Path)

| 集成点 | 方向 | 现状 | Phase 2 改动 |
|--------|------|------|-------------|
| 分析台 → 工作台跳转 | 前端路由 | `?reqId=xxx`（diagnosis/page.tsx 用的是 `?reqId=`） | 保持 `?reqId=xxx`，工作台 `getWorkbenchRequirementId` 已兼容 |
| `DiagnosisRisk.confirmed` | 后端 DB | 字段不存在 | 新增字段 + migration + schema + service 方法 |
| RAG 历史用例预览 | 后端 API | `retrieve_similar_cases()` 存在但无 HTTP 端点 | 新增 `POST /scene-map/{req_id}/rag-preview` |
| 分析台三栏布局 | 前端重构 | `/analysis/page.tsx` re-export requirements | 独立实现三栏，复用 diagnosis/page.tsx 组件 |
| 工作台追加生成 | 前端状态 | `workspace-store` 无 append 能力 | 新增 `appendTestCases` action |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `/analysis` re-export `/requirements` | 独立三栏布局 | Phase 2 重构 | 必须重建，不能复用旧页面 |
| 步骤条行内样式 | `ProgressSteps` 组件 | 已存在 | 直接复用，仅需包装为固定顶部 |
| 诊断（diagnosis）术语 | 分析（analysis）术语 | Phase 2 ANA-01 | 路由可保持 `/diagnosis` 不变（后端兼容），前端文案全量替换 |

**关于 ANA-01 重命名策略：** 后端 API 路径 `/api/diagnosis/...` 保持不变（避免破坏性变更），仅更改页面文案、按钮文字、组件注释。如需路由别名，可在 router 注册时同时挂 `/analysis` 前缀（低优先级，按需）。

---

## Open Questions

1. **`DiagnosisRisk.level` vs `DiagnosisRisk.severity` 字段命名不一致**
   - 后端 model: `level`（值 `"high"/"medium"/"low"`）
   - 前端 api.ts interface: `severity`（`ScanResultsList.tsx` 用 `risk.severity`）
   - 什么是清楚的：两者代表同一概念
   - 什么不清楚：前端 `DiagnosisRisk.severity` 是前端自定义字段还是后端序列化时重命名了？
   - **建议：** 计划阶段任务应包含：查看 `DiagnosisReportResponse` 序列化路径，确认字段映射。置灰逻辑应以实际字段名为准。

2. **`TestPoint.category` vs `TestPoint.group_name` 区别**
   - `TestPoint` model 有 `group_name`（分组，如「功能测试」「边界测试」）
   - `TestPoint` model 还有 scene-map-store.ts 中的 `category` 字段
   - **建议：** 工作台 Step1 按 `group_name` 分组（与现有 `TestPointItem` 接口一致）。

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio (asyncio_mode = "auto") |
| Config file | `backend/pyproject.toml` [tool.pytest.ini_options] |
| Quick run command | `uv run pytest tests/unit/test_diagnosis/ -x -q` |
| Full suite command | `uv run pytest -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANA-01 | 路由/文案重命名不破坏现有 API 调用 | unit (smoke) | `uv run pytest tests/unit/test_diagnosis/test_diagnosis_api.py -x` | ✅ |
| ANA-07 | `confirmed` 字段写入/读取正确 | unit | `uv run pytest tests/unit/test_diagnosis/test_diagnosis_service.py -x` | ✅（需增加 confirm 测试用例）|
| ANA-07 | `PATCH /diagnosis/risks/{id}/confirm` 端点返回 200 + confirmed=true | unit | `uv run pytest tests/unit/test_diagnosis/test_diagnosis_api.py::test_confirm_risk -x` | ❌ Wave 0 |
| WRK-04 | `POST /scene-map/{req_id}/rag-preview` 在 Qdrant 不可达时返回空列表而非 500 | unit | `uv run pytest tests/unit/test_scene_map/test_rag_preview.py -x` | ❌ Wave 0 |
| WRK-07 | 追加生成不清空已有用例（store 逻辑） | unit (frontend vitest) | `bun run test -- workbench` | ❌ Wave 0（可选）|

### Sampling Rate

- **Per task commit:** `uv run pytest tests/unit/test_diagnosis/ -x -q`
- **Per wave merge:** `uv run pytest -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/test_diagnosis/test_diagnosis_api.py` — 新增 `test_confirm_risk` 测试 PATCH confirm 端点
- [ ] `tests/unit/test_scene_map/test_rag_preview.py` — 覆盖 RAG 预览端点降级行为（Qdrant 不可达返回 []）
- [ ] Alembic migration: `uv run alembic revision --autogenerate -m "add_confirmed_to_diagnosis_risks"` + `uv run alembic upgrade head`

---

## Sources

### Primary (HIGH confidence)

- 项目代码直接读取 — `backend/app/modules/diagnosis/` 全部文件（models, schemas, service, router）
- 项目代码直接读取 — `frontend/src/app/(main)/diagnosis/page.tsx` + `_components/`
- 项目代码直接读取 — `frontend/src/app/(main)/workbench/page.tsx` + `_components/`
- 项目代码直接读取 — `backend/app/engine/rag/retriever.py`（`retrieve_similar_cases` 实现）
- 项目代码直接读取 — `frontend/src/stores/` 全部 store 文件
- 项目代码直接读取 — `frontend/src/hooks/useWorkbench.ts`、`useRequirementTree.ts`、`useDiagnosis.ts`

### Secondary (MEDIUM confidence)

- CONTEXT.md 锁定决策（代表产品/用户需求，非技术文档）
- REQUIREMENTS.md（ANA/WRK 需求描述）

### Tertiary (LOW confidence)

- 无

---

## Metadata

**Confidence breakdown:**

- Standard Stack: HIGH — 完全基于项目现有代码，无外部依赖引入
- Architecture: HIGH — 基于现有 diagnosis/page.tsx、workbench/page.tsx 直接分析，路径清晰
- Pitfalls: HIGH — 基于代码中发现的实际字段不一致、store 限制等真实问题
- Open Questions: MEDIUM — 字段映射问题需计划任务确认

**Research date:** 2026-03-15
**Valid until:** 2026-04-15（项目代码稳定，无外部 API 依赖）
