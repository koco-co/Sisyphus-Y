# Phase 6: 浏览器全量测试 - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

使用 Chrome DevTools MCP 对平台主链路进行端到端测试，覆盖「分析台 → 工作台 → 用例库」核心流程。测试数据使用真实需求文档 Story-15602.md（东风商用车质量任务告警明细邮件功能）。

前置任务：修复需求模块的 Markdown 渲染和图片显示问题，使需求内容能正确展示格式和图片。

</domain>

<decisions>
## Implementation Decisions

### 测试范围
- **主链路端到端测试**：分析台 → 工作台 → 用例库 核心流程
- 不覆盖全部 21 个模块，聚焦最关键用户场景
- 测试数据仅使用 Story-15602.md 一个真实需求

### 图片处理方案
- **图片上传目标**：MinIO（使用现有 `image_handler.py` 归档流程）
- **图片路径**：手动上传图片到 MinIO，生成临时访问 URL
- **图片语法**：仅支持标准 Markdown `![alt](url)` 语法，不额外支持 Obsidian `![[image.png]]`
- **相关图片位置**：`/Users/poco/Documents/DTStack/XmindCase/Assets/img/Pasted image 20260316170939.png`

### Markdown 渲染
- **渲染范围**：全局需求内容展示（所有显示需求内容的地方都使用 Markdown 渲染）
- **主要组件**：`RequirementDetailTab.tsx` 需要从 `whitespace-pre-wrap` 改为 Markdown 渲染
- **渲染库选择**：使用 `react-markdown` 或类似库，支持图片、链接、代码块等

### 验收标准
- **全功能通过**：所有按钮、表单、交互都正常工作
- 主链路端到端零报错
- 需求内容正确渲染 Markdown 格式和图片

### Claude's Discretion
- 具体使用哪个 Markdown 渲染库（react-markdown / marked / 其他）
- Markdown 渲染的样式细节
- Chrome 自动化测试的具体步骤和断言

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求模块相关
- `backend/app/engine/uda/image_handler.py` — 图片归档处理器，MinIO 上传和 URL 生成
- `frontend/src/app/(main)/diagnosis/_components/RequirementDetailTab.tsx` — 需求详情展示组件（需改为 MD 渲染）
- `frontend/src/app/(main)/analysis/_components/AnalysisRightPanel.tsx` — 分析台右侧面板，引用 RequirementDetailTab

### Chrome DevTools MCP
- MCP 工具 `mcp__chrome-devtools__*` — 浏览器自动化操作

### 测试数据
- `/Users/poco/Documents/DTStack/XmindCase/DataAssets/Story/Story-15602.md` — 测试需求文档
- `/Users/poco/Documents/DTStack/XmindCase/Assets/img/Pasted image 20260316170939.png` — 需求文档中的本地图片

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `image_handler.py`:
  - `archive_image()` — 上传图片到 MinIO
  - `get_image_url()` — 生成临时访问 URL
  - `fetch_and_archive_external_images()` — 抓取外链图片（可作为参考）
- MinIO bucket: `sisyphus-images`

### Established Patterns
- 前端使用 `whitespace-pre-wrap` 渲染原始文本，无 Markdown 解析
- 后端 UDA 解析器处理需求文档，提取 `content_ast` 结构

### Integration Points
- `RequirementDetailTab.tsx` 需要集成 Markdown 渲染器
- 图片上传需要调用 `/api/files/` 端点获取 MinIO 访问 URL
- Chrome 测试通过 MCP 工具与前端交互

</code_context>

<specifics>
## Specific Ideas

- 测试流程：创建需求 → 上传图片 → 查看需求详情（验证 MD 渲染）→ AI 分析 → 进入工作台 → 确认测试点 → 生成用例 → 查看用例库
- 图片处理流程：手动将本地图片上传到 MinIO → 获取 URL → 替换需求文档中的图片链接
- Story-15602.md 包含 3 张外链图片（蓝湖）和 1 张本地图片

</specifics>

<deferred>
## Deferred Ideas

None — 讨论保持在阶段范围内

</deferred>

---

*Phase: 06-chrome-users-poco-documents-dtstack-xmindcase-dataassets-story-story-15602-md*
*Context gathered: 2026-03-17*
