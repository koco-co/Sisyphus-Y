# TestGen Pro — 阶段一开发设计文档

**日期**：2026-03-09
**作者**：AI 辅助设计
**状态**：已确认

---

## 1. 背景与目标

基于 `TestGen_Proto_FULL.html` 原型（11 页完整设计），采用方案 A（核心主流程优先）分阶段开发。

**阶段一交付范围**：走通「需求录入 → 健康诊断 → 测试点确认 → 用例生成 → 用例管理」完整链路，共 6 个页面、4 个新后端模块。

---

## 2. 交付范围

| 页面 | 路由 | 后端模块 | 当前状态 |
|------|------|---------|---------|
| ① 项目列表 | `/` | `products`（已完整） | 需重写前端 |
| ② 需求卡片 | `/requirements/[id]` | `products`（已完整） | 需重写前端 |
| ③ 健康诊断 | `/diagnosis/[id]` | `diagnosis`（空） | 前后端新建 |
| ④ 测试点确认 | `/scene-map/[id]` | `scene_map`（空） | 前后端新建 |
| ⑤ 生成工作台 | `/workbench/[id]` | `generation`（空） | 前后端新建 |
| ⑥ 用例管理 | `/testcases` | `testcases`（空） | 前后端新建 |

---

## 3. 设计系统

### 配色 Token（来自原型）

```css
--bg:       #0d0f12;
--bg1:      #131619;
--bg2:      #1a1e24;
--bg3:      #212730;
--border:   #2a313d;
--border2:  #353d4a;
--text:     #e2e8f0;
--text2:    #94a3b8;
--text3:    #566577;
--accent:   #00d9a3;
--accent2:  #00b386;
--amber:    #f59e0b;
--red:      #f43f5e;
--blue:     #3b82f6;
--purple:   #a855f7;
```

### 字体

- 正文：DM Sans
- 数据/代码：JetBrains Mono
- 标题：Syne

### 实现方式

- CSS 变量定义在 `globals.css`，Tailwind `@layer base` 引用
- Ant Design 6 通过 `ConfigProvider` 覆盖主题 token，与 CSS 变量统一
- 深色主题为唯一主题，不支持亮色切换（阶段一）

### 通用 UI 组件 `src/components/ui/`

| 组件 | 描述 |
|------|------|
| `StatusPill` | 状态徽章（green/amber/red/blue/gray） |
| `StatCard` | 统计卡片（数值 + 标签 + delta + 进度条） |
| `SidebarNav` | 左侧导航（section/item/count/active 状态） |
| `DataTable` | 通用表格（列定义 + 分页 + hover 行状态） |
| `ThinkingStream` | 思考过程面板（可折叠，逐字流入，灰色） |
| `ChatBubble` | 对话气泡（AI 绿色 / 用户暗灰，含时间戳） |
| `ProgressSteps` | 流程步骤条（需求→诊断→测试点→生成） |

---

## 4. 流式输出与思考过程

### SSE 事件协议

```
event: thinking
data: {"delta": "正在分析需求中的验收标准..."}

event: content
data: {"delta": "TC-001 正常保存流程\n步骤1: 用户打开编辑器..."}

event: done
data: {"usage": {"input_tokens": 1200, "output_tokens": 340}}
```

### 前端渲染结构

```
┌─────────────────────────────────────┐
│ 🧠 思考过程  [可折叠]               │
│   正在分析 REQ-089 的验收标准...    │  ← 灰色逐字流入
│   发现 3 个边界条件需要覆盖...      │
├─────────────────────────────────────┤
│ ✦ AI 回复                           │
│   已为你生成以下测试用例：          │  ← 正常颜色逐字流入
│   TC-089-001 正常保存流程...        │
└─────────────────────────────────────┘
```

### 模型适配（ThinkingStreamAdapter）

| Provider | 思考流来源 |
|----------|-----------|
| `openai` (gpt-4o) | LangChain `on_llm_new_token` callback 模拟思考步骤 |
| `anthropic` | Claude 扩展思考 `thinking` block 原生支持 |
| `deepseek` | DeepSeek R1 `reasoning_content` 字段 |

后端统一通过 `ThinkingStreamAdapter` 抽象，前端无感知模型差异。

---

## 5. 后端 API 设计

### M03 diagnosis（需求健康诊断）

```
POST /api/diagnosis/{requirement_id}/run      → SSE：触发诊断
GET  /api/diagnosis/{requirement_id}           → 获取诊断报告
POST /api/diagnosis/{requirement_id}/chat      → SSE：对话式补全
PATCH /api/diagnosis/{requirement_id}/risks/{risk_id} → 标记风险状态
```

### M04 scene_map（测试点 & 场景地图）

```
GET  /api/scene-map/{requirement_id}           → 获取场景地图
POST /api/scene-map/{requirement_id}/generate  → SSE：AI 生成测试点
PATCH /api/scene-map/test-points/{tp_id}       → 编辑/确认测试点
POST /api/scene-map/{requirement_id}/test-points → 手动添加测试点
DELETE /api/scene-map/test-points/{tp_id}      → 软删除
GET  /api/scene-map/{requirement_id}/export    → 导出（PNG/MD/JSON）
```

### M05 generation（对话式用例生成）

```
POST /api/generation/sessions                              → 创建会话
POST /api/generation/sessions/{session_id}/chat            → SSE：对话生成
GET  /api/generation/sessions/{session_id}/cases           → 已生成用例列表
POST /api/generation/sessions/{session_id}/cases/{case_id}/accept → 接受用例
POST /api/generation/sessions/{session_id}/export          → 批量导出
```

### M06 testcases（用例管理）

```
GET  /api/testcases                           → 列表（过滤 + 分页）
GET  /api/testcases/{case_id}                 → 详情
POST /api/testcases                           → 手动创建
PATCH /api/testcases/{case_id}                → 编辑
POST /api/testcases/{case_id}/rewrite         → SSE：AI 重写
DELETE /api/testcases/{case_id}               → 软删除
POST /api/testcases/batch-export              → 批量导出
```

### 公共约定

- 所有列表接口支持 `?page=1&page_size=20`
- SSE 端点响应头 `Content-Type: text/event-stream`，使用 FastAPI `StreamingResponse`
- AI 调用超时 120s，通过 `LLM_TIMEOUT` 环境变量配置

---

## 6. 数据库新增表

```sql
-- M03
diagnosis_reports        (requirement_id, status, overall_score, summary)
diagnosis_risks          (report_id, level, title, description, tags, status)
diagnosis_chat_messages  (report_id, role, content, round_num)

-- M04
scene_maps               (requirement_id, status, confirmed_at)
test_points              (scene_map_id, group_name, title, description,
                          priority, status, estimated_cases, source)

-- M05
generation_sessions      (requirement_id, mode, status, model_used)
generation_messages      (session_id, role, content, thinking_content, token_count)

-- M06
test_cases               (requirement_id, tp_id, case_id, title,
                          priority, type, status, source, ai_score)
test_case_steps          (test_case_id, step_num, action, expected_result)
test_case_versions       (test_case_id, version, snapshot JSONB, change_reason)
```

全部继承 `BaseModel`（UUID 主键 + 时间戳 + `deleted_at` 软删除）。

---

## 7. 前端页面组件拆分

### P1 项目列表 `/`

```
ProjectListPage
├── StatCardRow          ← 4个KPI卡片
├── ProductFilterBar     ← 产品类型筛选
├── ProjectCardGrid
│   └── ProjectCard      ← 图标/名称/stats三列/进度/团队
└── RecentActivityTable
```

### P2 需求卡片 `/requirements/[id]`

```
RequirementDetailPage
├── RequirementSidebar   ← 子产品/迭代/需求三级导航
└── RequirementEditor
    ├── RequirementMeta  ← 优先级/负责人/标签/诊断状态
    ├── RichEditor       ← 内容编辑区
    └── LinkedPanel      ← 关联测试点 + 用例（右侧两列）
```

### P3 健康诊断 `/diagnosis/[id]`

```
DiagnosisPage
├── DiagnosisSidebar     ← 进度步骤条 + 报告概览
└── DiagnosisThreeCol
    ├── RiskList         ← 风险项（高/中/行业分级）
    ├── DiagnosisChat
    │   ├── ChatHistory
    │   ├── ThinkingStream
    │   └── ChatInput    ← textarea + 发送/跳过
    └── SceneMapPreview  ← 实时统计 + 节点列表
```

### P4 测试点确认 `/scene-map/[id]`

```
SceneMapPage
├── ProgressSteps
└── SceneMapThreeCol
    ├── TestPointList    ← 分组树（复选框 + 状态）
    ├── TestPointDetail  ← 描述/粒度/用例预览/变更警告
    └── SceneMapTree     ← CSS 可视化树 + 导出按钮
```

### P5 生成工作台 `/workbench/[id]`

```
WorkbenchPage           ← 全屏，无标准侧边栏
├── WorkbenchToolbar    ← 模式切换（4种模式）
└── WorkbenchThreeCol
    ├── RequirementNav  ← 需求选择 + 上下文注入标签
    ├── GenerationChat
    │   ├── ChatHistory
    │   ├── ThinkingStream
    │   ├── CasePreview  ← 流式生成的用例卡片
    │   └── ChatInput    ← 快捷指令 + textarea + 发送/暂停
    └── CasePreviewList ← 用例列表（进度 + 筛选 + 批量操作）
```

### P6 用例管理 `/testcases`

```
TestCasesPage
├── TestCaseSidebar     ← 子产品/迭代/快速筛选
└── TestCaseMain
    ├── FilterBar       ← 优先级/类型/状态筛选
    ├── DiffWarningBanner
    └── TestCaseTable   ← 行状态颜色（红/黄/普通）+ 操作列
```

---

## 8. 状态管理策略

| 数据类型 | 方案 |
|---------|------|
| 服务端数据（列表/详情） | React Query（缓存 + 自动刷新） |
| 流式 AI 状态 | Zustand（`thinkingText`/`contentText`/`isStreaming`） |
| 全局 UI 状态（当前产品/迭代） | Zustand |
| 表单状态 | React 本地 `useState` |

---

## 9. 开发顺序

### 后端（按模块顺序）

```
Week 1  M06 testcases   ← 纯 CRUD，先打通端到端
Week 1  M04 scene_map   ← SSE 框架跑通
Week 2  M03 diagnosis   ← 对话式 AI + LangChain chain
Week 2  M05 generation  ← 最复杂，依赖前两个模块上下文
```

### 前端（与后端并行）

```
Week 1  设计系统         ← CSS 变量 + 7个基础组件
Week 1  P6 用例管理      ← 配合 testcases CRUD
Week 1  P1 项目列表      ← 复用已有 products API
Week 2  P2 需求卡片      ← 需求详情 + 编辑
Week 2  P3 健康诊断      ← ThinkingStream 首次接入
Week 2  P4 测试点确认    ← 场景地图树
Week 3  P5 生成工作台    ← 最复杂，三列 + 流式 + 用例预览
```

---

## 10. 关键技术决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| AI 流式协议 | SSE（`text/event-stream`） | 原生浏览器支持，无需 WebSocket 握手 |
| 思考流分离 | `event: thinking` / `event: content` | 前端独立渲染，互不阻塞 |
| LangChain 版本 | LangChain 0.3 + LangGraph 0.2 | pyproject.toml 已有依赖 |
| 前端主题 | CSS 变量 + Tailwind + Antd ConfigProvider | 三者统一 token，零损失还原原型 |
| 测试策略 | 后端优先单测 service 层；前端 E2E 暂缓 | 快速交付阶段，service 是最高风险点 |
