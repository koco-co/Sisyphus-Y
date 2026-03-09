# CLAUDE.md

## 项目概述

Sisyphus-case-platform 是 AI 驱动的企业级功能测试用例自动生成平台，面向数据中台场景，覆盖需求录入 → 健康诊断 → 测试点分析 → 用例生成 → 执行回流的完整测试生命周期。

核心理念：显式拆分「测什么」（测试点/场景地图）和「怎么测」（用例步骤），通过评审节点前置拦截方向错误。

## 架构

- **后端**: FastAPI (Python 3.12) — DDD 模块化架构，21 个业务模块在 `backend/app/modules/`
- **前端**: Next.js 16 App Router (TypeScript) — 页面与后端模块对应，在 `frontend/src/app/(main)/`
- **AI 引擎**: LangChain + LangGraph，支持 GPT-4o / Claude / Ollama 多模型切换
- **存储**: PostgreSQL (业务) + Redis (缓存/队列) + Qdrant (向量) + MinIO (文件)
- **异步任务**: Celery + Redis

## 模块对照表

| 后端模块 | 前端页面 | 职责 |
|---|---|---|
| `modules/auth/` | `(auth)/login/` | 认证与权限 |
| `modules/products/` | `(main)/products/`, `iterations/`, `requirements/` | 子产品/迭代/需求三级管理 (M00) |
| `modules/uda/` | — | 文档解析引擎，UDA 层 (M01) |
| `modules/import_clean/` | — | 历史数据导入清洗 (M02) |
| `modules/diagnosis/` | `(main)/diagnosis/` | 需求健康诊断 (M03) |
| `modules/scene_map/` | `(main)/scene-map/` | 测试点分析 & 场景地图 (M04) |
| `modules/generation/` | `(main)/workbench/` | 对话式用例生成工作台 (M05) |
| `modules/testcases/` | `(main)/testcases/` | 用例管理中心 (M06) |
| `modules/diff/` | `(main)/diff/` | 需求 Diff & 变更影响 (M07) |
| `modules/coverage/` | `(main)/coverage/` | 需求覆盖度矩阵 (M08) |
| `modules/test_plan/` | — | 迭代测试计划 (M09) |
| `modules/templates/` | — | 用例模板库 (M10) |
| `modules/knowledge/` | `(main)/knowledge/` | 知识库管理 (M11) |
| `modules/export/` | — | 用例导出与集成 (M12) |
| `modules/execution/` | — | 执行结果回流 (M13) |
| `modules/analytics/` | `(main)/analytics/` | 质量分析看板 (M14) |
| `modules/notification/` | — | 通知系统 (M16) |
| `modules/search/` | — | 全局搜索 (M17) |
| `modules/collaboration/` | — | 协作功能 (M18) |
| `modules/dashboard/` | `(main)/` | 首页仪表盘 (M19) |
| `modules/audit/` | — | 操作审计日志 (M20) |
| `modules/recycle/` | — | 回收站 (M21) |

## 开发规范

### 环境管理

- Python 环境: **uv**（不使用 pip/conda/poetry）
- 前端包管理: **bun**（不使用 npm/yarn/pnpm）

### 代码质量

- Python lint/format: **ruff** (`uv run ruff check .` + `uv run ruff format .`)
- Python 类型检查: **pyright** (`uv run pyright app/`，standard 模式)
- 前端 lint/format: **Biome** (`bunx biome check .`)
- 前端类型检查: **tsc** (`bunx tsc --noEmit`)

### 命名约定

- Python: `snake_case`（文件、变量、函数），`PascalCase`（类）
- TypeScript: `camelCase`（变量、函数），`PascalCase`（组件、类型）
- API 路由: `kebab-case`（`/api/scene-map/generate`）
- 数据库表名: `snake_case` 复数（`test_cases`，`scene_nodes`）

### 后端模块结构

每个业务模块必须包含：

```
modules/<name>/
├── __init__.py
├── router.py    # API 路由，只做参数校验和调用 service
├── models.py    # SQLAlchemy ORM 模型
├── schemas.py   # Pydantic 请求/响应模型
└── service.py   # 业务逻辑，接收 AsyncSession 作为参数
```

### Git 规范

- 分支: `feat/<module>-<desc>`, `fix/<desc>`, `docs/<desc>`
- Commit: Conventional Commits（`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`）
- PR 到 main 必须更新 `CHANGELOG.md`

### 测试

- 后端: pytest + pytest-asyncio，`asyncio_mode = "auto"`
- 命名: `tests/unit/test_<module>/test_<feature>.py`
- Fixture: 公共放 `tests/conftest.py`，模块级放模块测试目录内

### 软删除

所有核心业务表均通过 `SoftDeleteMixin` 支持软删除（`deleted_at` 字段）。查询时必须过滤 `WHERE deleted_at IS NULL`。

## 常用命令

```bash
# 一键启动开发环境$$
./init.sh

# 后端
cd backend
uv sync --all-extras           # 安装依赖
uv run ruff check .            # lint 检查
uv run ruff format .           # 格式化
uv run pyright app/            # 类型检查
uv run pytest -v               # 运行测试
uv run pytest --cov=app        # 测试 + 覆盖率
uv run alembic upgrade head    # 数据库迁移
uv run alembic revision --autogenerate -m "描述"  # 生成迁移文件
uv run uvicorn app.main:app --reload --port 8000  # 启动开发服务器

# 前端
cd frontend
bun install                    # 安装依赖
bunx biome check .             # lint + format 检查
bunx biome check --write .     # 自动修复
bunx tsc --noEmit              # 类型检查
bun run build                  # 生产构建
bun dev                        # 启动开发服务器

# Docker
docker compose -f docker/docker-compose.yml up -d    # 启动基础设施
docker compose -f docker/docker-compose.yml down     # 停止
docker compose -f docker/docker-compose.yml logs -f  # 查看日志
```

## 关键设计决策

1. **DDD 模块化**：21 个业务模块各自包含 router/models/schemas/service，后端边界清晰
2. **懒加载 DB 引擎**：`database.py` 使用 `@lru_cache` 延迟创建引擎，避免导入时连接
3. **软删除统一**：所有业务表通过 `SoftDeleteMixin` 支持 `deleted_at`，不硬删除数据
4. **测试点先于用例**：核心流程先确认「测什么」（M04），再生成「怎么测」（M05）
5. **两阶段 Diff**：文本级（Myers）+ 语义级（LLM），防止业务影响被误判

## UI 设计规范（来自原型图）

### 设计令牌 (CSS Variables)

```css
/* 深色主题（默认） */
--bg: #0d0f12;        --bg1: #131619;     --bg2: #1a1e24;     --bg3: #212730;
--accent: #00d9a3;    --accent2: #00b386; --accent-d: rgba(0, 217, 163, .1);
--text: #e2e8f0;      --text2: #94a3b8;   --text3: #566577;
--border: #2a313d;    --border2: #353d4a;
--red: #f43f5e;       --amber: #f59e0b;   --yellow: #eab308;
--blue: #3b82f6;      --purple: #a855f7;
--sans: 'DM Sans';    --display: 'Syne';  --mono: 'JetBrains Mono';
```

### 布局架构

- **三栏布局**: `col-left`（需求导航树） + `col-mid`（AI 工作台） + `col-right`（辅助信息栏）
- **全局侧边栏**: `sidebar` 导航 + `topbar` 顶栏
- **组件类**: `.card` / `.card-hover` / `.btn` / `.btn-primary` / `.btn-ghost` / `.pill` / `.tag`
- **场景点颜色编码**: `.dot-green`(已覆盖) / `.dot-yellow`(AI补充) / `.dot-red`(待处理) / `.dot-gray`(待确认)
- **进度步骤**: `.prog-steps` > `.prog-step.done` / `.prog-step.active`
- **对话气泡**: `.chat-bubble` / `.chat-bubble.ai-bubble` + `.chat-avatar`

### 微交互要求

- SSE 流式输出动画（打字机效果 + 思考过程折叠）
- 按钮 Loading 状态（Spinner + 文字变化）
- 暗黑模式下毛玻璃效果 (`backdrop-filter: blur`)
- 卡片 hover 效果 (`.card-hover` 微上浮 + 阴影)

## 数据持久化要求（关键）

### 核心原则：所有 AI 生成结果必须持久化到 PostgreSQL

1. **诊断结果持久化**: AI 诊断响应 → `DiagnosisChatMessage` 表（role=assistant）+ 自动解析风险 → `DiagnosisRisk` 表
2. **测试点持久化**: AI 生成的测试点 → 自动解析 → `TestPoint` 表（关联 SceneMap）
3. **用例生成持久化**: AI 生成的用例 → `GenerationMessage` 表 + 自动解析 → `TestCase` 表
4. **Session 管理**: 每次 AI 交互必须关联 `session_id`，支持历史回溯（最近 100 条）

### 禁止"刷新即消失"

- 前端页面刷新后，必须能从 API 重新加载完整的历史对话和生成结果
- 所有 SSE 流式输出完成后，后端必须自动保存完整响应到数据库

## AI 多模型策略

### 模型分工

| 模型 | 用途 | 特点 |
|---|---|---|
| **智谱 GLM-4-Flash** | 需求诊断 + 苏格拉底追问 | 中文理解强，速度快 |
| **阿里百炼 Qwen-Max** | 复杂测试用例 CoT 生成 | 推理能力强，适合结构化输出 |

### 容错降级

- 主模型调用失败 → 自动重试 2 次（指数退避）
- 重试失败 → 降级到备用模型（如 Qwen 失败降级 GLM）
- 所有 LLM 调用使用 `trust_env=False` 绕过系统代理

### API 密钥配置

```env
LLM_PROVIDER=zhipu                    # 默认提供商
ZHIPU_API_KEY=<zhipu-key>             # 智谱 API Key
DASHSCOPE_API_KEY=<dashscope-key>     # 阿里百炼 API Key
DASHSCOPE_MODEL=qwen-max              # 阿里百炼模型
```
