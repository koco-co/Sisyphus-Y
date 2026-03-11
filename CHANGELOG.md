# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **M06 用例管理中心 — 目录树功能**：左侧 220px 固定目录树，支持层级展开/折叠；从 `module_path` 字段动态构建树；点击目录过滤右侧用例列表；特殊"未分类"节点显示 module_path 为空的用例
- **M06 用例管理中心 — StatCard 全量统计**：从 `/api/testcases/stats` 获取全量数据，修复原先仅统计当前页20条的问题
- **M06 CaseEditForm — 目录路径编辑**：编辑用例时可设置所属目录，支持 `/` 分隔多级路径
- **AI配置 — 通用提供商选择表单**：AI模型配置页面从硬编码3卡片改为动态表单；通过 `GET /api/ai-config/providers` 加载提供商列表（智谱AI/阿里云百炼/OpenAI）；3步式交互：选提供商→选模型版本→输入API Key

### Changed

- `backend/app/modules/testcases/service.py`：`list_cases()` 支持 `module_path` 过滤（精确+前缀匹配）；特殊值 `__uncategorized__` 过滤 NULL/空路径；新增 `get_module_paths()` 构建树形结构
- `backend/app/modules/testcases/router.py`：新增 `GET /api/testcases/module-paths` 端点
- `backend/app/modules/ai_config/router.py`：新增 `GET /api/ai-config/providers` 静态端点
- `frontend/src/app/(main)/testcases/_components/types.ts`：`TestCaseDetail` 新增 `module_path` 字段

### Added (Phase 0–5: Full Platform Implementation)

- **Progress Dashboard**: Visual FAB + Drawer showing real-time M00–M21 module completion status
  - `progress.json` tracking file with phase/module status
  - Next.js API route `/api/progress` serving live status
  - `ProgressDashboard.tsx` component with auto-refresh

- **Backend — All 18 modules now fully implemented** (router + service + models + schemas):
  - M00 `products/`: Full CRUD for products, iterations, requirements with auto-versioning
  - M03 `diagnosis/`: Health diagnosis with SSE streaming chat, report lifecycle, message history
  - M04 `scene_map/`: Test point generation via AI streaming, confirm/delete, grouped scene tree
  - M05 `generation/`: Multi-mode workbench sessions, SSE chat with test point context injection
  - M06 `testcases/`: Paginated CRUD, version snapshots, batch status updates, step management
  - M07 `diff/`: Myers algorithm text diff + impact analysis, affected test points/cases tracking
  - M08 `coverage/`: Requirement↔TestCase coverage matrix, iteration-level and product-level views
  - M09 `test_plan/`: Iteration test plan CRUD with status workflow
  - M10 `templates/`: Test case template library with usage tracking
  - M11 `knowledge/`: Knowledge base document CRUD with type filtering and versioning
  - M12 `export/`: JSON and CSV export of test cases with steps
  - M13 `execution/`: Execution result submission (single + batch), pass rate stats
  - M14 `analytics/`: Quality overview, priority/status/source distribution metrics
  - M16 `notification/`: Notification CRUD with read/unread tracking
  - M19 `dashboard/`: Stats, recent activities, product overview endpoints
  - M20 `audit/`: Audit log recording and paginated query
  - M21 `recycle/`: Soft-deleted item listing, restore, permanent delete
  - `auth/`: JWT authentication + bcrypt password hashing

- **Backend infrastructure**:
  - Dynamic router registration via `importlib` with graceful error handling (88 routes)
  - CORS wildcard origins for development
  - All models extend `BaseModel` with `SoftDeleteMixin` (deleted_at)

- **Frontend — All 12 pages connected to real backend APIs**:
  - Dashboard: Real-time stats, product overview, recent activities via React Query
  - Products: Full CRUD with Ant Design Table, search, modals
  - Iterations: CRUD filtered by product, date pickers, linked navigation
  - Requirements: Requirement cards with upload support
  - Diagnosis: 3-panel layout with requirement tree, SSE streaming chat, health score ring
  - Scene Map: 3-column layout with AI test point generation, confirm/delete, scene tree
  - Workbench: Multi-mode generation sessions, SSE streaming, test case sidebar
  - TestCases: Paginated table with filters, stats cards, search
  - Diff: Version comparison with impact analysis and change history
  - Coverage: Product/iteration coverage matrix with progress bars
  - Analytics: Quality dashboard with distribution charts
  - Knowledge: Document CRUD with type filtering
  - Templates: Template library with usage tracking and category filters

- **Frontend toolchain**: bun, Biome, TypeScript strict mode, next-themes dark/light/system
- **Infrastructure**: Docker Compose with PostgreSQL 16, Redis 7, Qdrant, MinIO
- **CI/CD**: GitHub Actions for backend + frontend + docs
- **Developer experience**: `init.sh`, `CLAUDE.md`, `.editorconfig`, `.env.example`
- **Documentation**: Requirements doc, development guide, implementation plans
