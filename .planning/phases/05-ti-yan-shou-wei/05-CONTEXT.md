# Phase 5: 体验收尾 - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

全平台 UI 规范统一、回收站软删除链路完整、模板库 Prompt Tab 可用、帮助系统和首次引导完善，整体体验无明显缺陷。

不包括：RAG 数据清洗（Phase 3 已完成）、用例库导入导出（Phase 4 已完成）、仪表盘质量分析（Phase 4 已完成）。

</domain>

<decisions>
## Implementation Decisions

### 首次引导弹窗（UX-06）

- **内容**：展示核心流程图「需求录入 → AI 分析 → 测试点确认 → 用例生成 → 用例库」，让用户理解平台核心价值
- **存储方式**：localStorage，key 为 `sisyphus-onboarding-complete`，值为 `"true"` 或时间戳
- **触发时机**：首次访问任意页面时弹出（检查 localStorage 中无标记时触发）
- **重新查看**：右下角帮助浮动按钮点击后可重新打开引导弹窗
- **弹窗结构**：全屏模态框，底部「跳过」和「下一步」按钮，最后一步「开始使用」

### 全局 UI 规范（UX-01~05）

- **按钮文案统一**：
  - 运行脚本全局扫描替换「新增」「创建」→「新建」
  - 保留例外：上传、添加、导入（不改为「新建」）
  - 格式：「新建 + 对象名」，如「新建需求」「新建用例」「新建模板」
- **删除弹窗模板**：
  - 统一使用 `ConfirmDialog` 组件，通过 `variant` prop 切换
  - `variant="simple"`：简单删除，description 为「确定删除「xxx」？删除后可在回收站中找回。」
  - `variant="cascade"`：级联删除，description 显示影响范围「将同时删除 N 条关联用例」，确认按钮用 `sy-danger`
- **空状态页面**：
  - 复用现有 `EmptyState` 组件
  - 统一规范：图标 48px + 暂无文案 + 引导操作按钮
  - 搜索无结果时不显示新建按钮
- **加载状态规范**：
  - 列表首次加载：骨架屏（animate-pulse）
  - 按钮操作：Loader2 + 文字切换（如「保存中...」）
  - 路由跳转：nprogress 进度条
  - 弹窗内：Spinner 居中
  - 规范记录在 CLAUDE.md，通过代码审查确保一致性

### 回收站完善（REC-01~03）

- **30 天自动清理**：
  - 触发方式：前端访问回收站页面时调用 `POST /recycle/cleanup` API
  - 后端 `cleanup_expired()` 根据 `deleted_at < now() - 30 days` 自动判断并物理删除
  - 无需 Celery 定时任务（当前为 stub）
- **恢复时原目录不存在**：
  - 自动移入「未分类」目录
  - Toast 提示「原目录已删除，已移入未分类」
  - 「未分类」目录不可删除/重命名，作为兜底
- **即将过期通知**：
  - 仅页面提示：剩余天数列 + 到期前 3 天标红
  - 无主动推送通知（无通知中心）
- **批量恢复**：
  - 已有 `batch_restore` API，Toast 汇总「成功恢复 N 条」

### 模板库 Prompt Tab（TPL-01~03）

- **CRUD 与设置页关系**：
  - Prompt Tab 只读展示系统 Prompt 列表
  - 编辑按钮点击跳转「设置 → Prompt 管理」
  - 不在模板库内直接编辑，保持单一编辑入口
- **数据来源**：
  - 读取 `app/ai/prompts.py` 中的 `_MODULE_PROMPTS` 字典
  - 支持查看默认值和「恢复默认」功能
  - 用户覆盖值存储在 DB `prompt_config` 表，读取时合并
- **Prompt 模板字段结构**：
  - 适用模块（module）：如 diagnosis、scene_map、generation
  - 身份声明（identity）：角色描述
  - 任务边界（task_boundary）：职责范围
  - 输出规范（output_format）：响应格式要求
  - 质量红线（quality_constraints）：禁止事项
- **导出/导入格式**：
  - 导出：Markdown 文件，每个 Prompt 一个 section
  - 导入：解析 Markdown 填充表单，预览后确认
  - 便于版本控制和阅读

### 帮助浮动按钮（UX-07）

- **位置**：`fixed bottom-6 right-6`
- **样式**：sy-accent 背景 + HelpCircle 图标 + 圆形
- **点击行为**：打开帮助菜单，包含「重新查看引导」「快捷键」「反馈问题」
- **常驻显示**：所有页面可见，不随滚动隐藏

### AI 未配置警告横幅（UX-08）

- **复用现有**：`AiConfigBanner` 组件已在分析台/工作台使用
- **扩展位置**：确保分析台、工作台、用例库（如涉及 AI 功能）均显示
- **内容**：「AI 未配置，部分功能不可用」+「前往配置」跳转链接

### Claude's Discretion

- 首次引导弹窗的具体步骤数和动画效果
- 帮助按钮菜单的具体选项和图标
- 空状态图标的颜色和具体样式
- Markdown 导出的具体格式细节

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UI 设计规范
- `CLAUDE.md` §UI 设计规范 — Design Token、布局架构、核心复用组件、场景节点颜色编码
- `Sisyphus-Y.html` — UI 原型，唯一视觉标准

### 现有组件参考
- `frontend/src/components/ui/ConfirmDialog.tsx` — 确认弹窗组件，需扩展 variant prop
- `frontend/src/components/ui/EmptyState.tsx` — 空状态组件
- `frontend/src/components/ui/AiConfigBanner.tsx` — AI 未配置警告横幅
- `frontend/src/app/(main)/recycle/page.tsx` — 回收站页面，已有基础功能
- `frontend/src/app/(main)/templates/page.tsx` — 模板库页面，需实现 Prompt Tab

### 后端 API 参考
- `backend/app/modules/recycle/service.py` — `cleanup_expired()` 方法
- `backend/app/ai/prompts.py` — `_MODULE_PROMPTS` 字典，Prompt 定义

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `ConfirmDialog.tsx` — 已有基础结构，需扩展 `variant` prop 支持 simple/cascade
- `EmptyState.tsx` — 已有空状态组件，统一使用
- `AiConfigBanner.tsx` — 已有 AI 未配置警告，直接复用
- `recycle/page.tsx` — 已有回收站页面，需添加 `POST /recycle/cleanup` 调用
- `templates/page.tsx` — 已有双 Tab 框架，Prompt Tab 显示「即将上线」
- `backend/app/modules/recycle/service.py` — 已有 `cleanup_expired()` 方法，需暴露 API 端点

### Established Patterns

- localStorage 存储偏好设置（如主题、引导状态）
- Toast 通知使用 sonner（`toast.success()`、`toast.error()`）
- 全屏模态框使用固定定位 + 毛玻璃背景
- 固定浮动按钮使用 `fixed bottom-6 right-6` 模式

### Integration Points

- 首次引导：`frontend/src/app/(main)/layout.tsx` 添加 OnboardingGuide 组件
- 帮助按钮：`frontend/src/app/(main)/layout.tsx` 添加 HelpFab 组件
- 回收站清理 API：`backend/app/modules/recycle/router.py` 新增 `POST /cleanup` 端点
- Prompt Tab：`frontend/src/app/(main)/templates/page.tsx` 实现 Prompt 列表展示
- Prompt 数据 API：`backend/app/modules/templates/router.py` 新增 Prompt 列表端点

</code_context>

<specifics>
## Specific Ideas

- 首次引导弹窗风格参考 Linear 的 Onboarding：深色背景 + 流程图 + 步骤指示器
- 帮助按钮参考 Vercel Dashboard 的右下角 Help 按钮
- 删除弹窗的级联模式参考 GitHub 删除 Repository 的确认流程

</specifics>

<deferred>
## Deferred Ideas

- 系统通知中心（登录时 Toast 提示即将过期数据）—— 需要通知系统重构后实现
- Prompt 模板在线分享/市场 —— 超出当前迭代范围
- 移动端首次引导适配 —— 当前优先桌面端

</deferred>

---

*Phase: 05-ti-yan-shou-wei*
*Context gathered: 2026-03-16*
