# Codebase Structure

**Analysis Date:** 2026-03-15

## Directory Layout

```
Sisyphus-case-platform/
├── backend/                           # FastAPI + Python backend
│   ├── app/
│   │   ├── main.py                    # FastAPI app, dynamic router loading
│   │   ├── core/                      # Infrastructure & middleware
│   │   │   ├── database.py            # Async engine, session factory
│   │   │   ├── dependencies.py        # Dependency injection (AsyncSessionDep)
│   │   │   ├── config.py              # Settings, env vars
│   │   │   ├── exceptions.py          # Custom HTTP exceptions
│   │   │   ├── middleware.py          # Request logging, rate limiting
│   │   │   ├── audit_middleware.py    # Audit trail
│   │   │   ├── cache.py               # Redis/cache utilities
│   │   │   ├── minio_client.py        # Object storage
│   │   │   ├── redis_client.py        # Redis connection
│   │   │   ├── security.py            # Auth utilities
│   │   │   └── query_utils.py         # Query builder helpers
│   │   ├── ai/                        # LLM integration & streaming
│   │   │   ├── prompts.py             # 7-layer prompt assembly (RULE SYSTEM)
│   │   │   ├── llm_client.py          # Zhipu GLM + Qwen API calls
│   │   │   ├── parser.py              # JSON extraction from LLM output
│   │   │   ├── sse_collector.py       # Stream aggregation + incremental parsing
│   │   │   └── stream_adapter.py      # Unified streaming interface
│   │   ├── engine/                    # AI engine (Prompt logic ONLY here)
│   │   │   ├── diagnosis/             # Requirement analysis engine
│   │   │   ├── scene_map/             # Test point generation engine
│   │   │   ├── case_gen/              # Test case generation engine
│   │   │   ├── rag/                   # Vector retrieval + embeddings
│   │   │   ├── uda/                   # Document parsing (docx/pdf/md)
│   │   │   ├── diff/                  # Myers diff + LLM semantic analysis
│   │   │   └── import_clean/          # Historical data import & cleaning
│   │   ├── modules/                   # 23 business modules (DDD)
│   │   │   ├── auth/                  # (M99) Authentication
│   │   │   ├── products/              # (M00) Products / Iterations / Requirements
│   │   │   ├── diagnosis/             # (M03) Requirement health analysis
│   │   │   ├── scene_map/             # (M04) Test point mapping
│   │   │   ├── generation/            # (M05) Test case generation
│   │   │   ├── testcases/             # (M06) Test case management
│   │   │   ├── diff/                  # (M07) Requirement diffing
│   │   │   ├── coverage/              # (M08) Coverage matrix
│   │   │   ├── templates/             # (M10) Case templates
│   │   │   ├── knowledge/             # (M11) RAG knowledge base
│   │   │   ├── export/                # (M12) Case export
│   │   │   ├── execution/             # (M13) Execution results
│   │   │   ├── analytics/             # (M14) Quality analysis (merged to M19)
│   │   │   ├── dashboard/             # (M19) Home dashboard + stats
│   │   │   ├── audit/                 # (M20) Audit logs
│   │   │   ├── recycle/               # (M21) Soft delete recovery
│   │   │   ├── notification/          # (M16) Notifications
│   │   │   ├── search/                # (M17) Global search
│   │   │   ├── ai_config/             # AI model settings
│   │   │   ├── uda/                   # (M01) Document parsing router
│   │   │   ├── import_clean/          # (M02) Data import router
│   │   │   ├── collaboration/         # (M18) Comments (soft-deprecated)
│   │   │   ├── test_plan/             # (M09) Test plan (soft-deprecated)
│   │   │   └── tasks/                 # Background task management
│   │   ├── shared/                    # Cross-module utilities
│   │   │   ├── base_model.py          # BaseModel + Mixins (TimestampMixin, SoftDeleteMixin)
│   │   │   ├── base_schema.py         # Base Pydantic schema
│   │   │   ├── enums.py               # Shared enums
│   │   │   └── pagination.py          # Pagination helpers
│   │   ├── worker/                    # Celery async tasks
│   │   │   └── tasks/                 # Task definitions
│   │   └── tasks/                     # Background job coordination
│   └── tests/unit/                    # Pytest unit tests (mirrors modules/)
│       ├── conftest.py                # Shared fixtures
│       ├── test_ai/
│       ├── test_ai_config/
│       ├── test_dashboard/
│       ├── test_diagnosis/
│       ├── test_generation/
│       ├── test_knowledge/
│       ├── test_products/
│       ├── test_rag/
│       ├── test_scene_map/
│       └── ... (per-module tests)
├── frontend/                          # Next.js + TypeScript frontend
│   ├── src/
│   │   ├── app/                       # Next.js app router structure
│   │   │   ├── layout.tsx             # Root layout (fonts, providers)
│   │   │   ├── globals.css            # Global styles + Tailwind config
│   │   │   ├── (auth)/                # Auth layout (login, register) - no top nav
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (main)/                # Main authenticated layout - with top nav
│   │   │   │   ├── layout.tsx         # Top nav + sidebar
│   │   │   │   ├── page.tsx           # Dashboard (/)
│   │   │   │   ├── analysis/          # /analysis (M03/M04/M08)
│   │   │   │   │   ├── diagnosis/     # /analysis/diagnosis or /diagnosis
│   │   │   │   │   ├── scene-map/     # /analysis/scene-map or /scene-map
│   │   │   │   │   └── coverage/      # /analysis/coverage or /coverage
│   │   │   │   ├── workbench/         # /workbench (M05 - generation workspace)
│   │   │   │   ├── diff/              # /diff (M07)
│   │   │   │   ├── testcases/         # /testcases (M06)
│   │   │   │   ├── templates/         # /templates (M10)
│   │   │   │   ├── knowledge/         # /knowledge (M11)
│   │   │   │   ├── recycle/           # /recycle (M21)
│   │   │   │   ├── settings/          # /settings (AI config, prompts)
│   │   │   │   ├── products/          # /products (M00)
│   │   │   │   ├── iterations/        # /iterations (M00)
│   │   │   │   ├── requirements/      # /requirements (M00)
│   │   │   │   ├── search/            # /search (M17)
│   │   │   │   ├── notifications/     # /notifications (M16)
│   │   │   │   ├── review/            # /review/[token] (review links)
│   │   │   │   ├── _components/       # Shared (main) layout components
│   │   │   │   │   ├── QuickActions.tsx
│   │   │   │   │   └── ...
│   │   │   │   └── analytics/         # Legacy analytics (merged to dashboard)
│   │   │   └── api/                   # Next.js API routes (not in use - backend at /api)
│   │   ├── components/                # Reusable UI components
│   │   │   ├── ui/                    # shadcn/ui + custom components
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   ├── CaseCard.tsx
│   │   │   │   ├── StreamCursor.tsx
│   │   │   │   ├── ThreeColLayout.tsx
│   │   │   │   ├── FormDialog.tsx
│   │   │   │   ├── FormField.tsx
│   │   │   │   ├── TableSkeleton.tsx
│   │   │   │   ├── GlobalSearch.tsx
│   │   │   │   ├── NotificationBell.tsx
│   │   │   │   └── ProgressDashboard.tsx
│   │   │   ├── layout/                # Layout-specific components
│   │   │   ├── workspace/             # Workbench components (M05)
│   │   │   │   ├── CaseCard.tsx
│   │   │   │   ├── StreamCursor.tsx
│   │   │   │   └── RequirementNav.tsx
│   │   │   ├── scene-map/             # Scene map visualization
│   │   │   │   └── (React Flow nodes)
│   │   │   ├── diff-viewer/           # Diff visualization
│   │   │   ├── editor/                # Code/markdown editors
│   │   │   ├── collaboration/         # Comments, annotations
│   │   │   ├── icons/                 # Custom icons
│   │   │   └── providers/             # Context providers
│   │   │       ├── QueryProvider.tsx  # React Query setup
│   │   │       └── ThemeProvider.tsx  # Dark/light theme
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useDashboard.ts        # Dashboard data + loading
│   │   │   ├── useDiagnosis.ts        # Diagnosis stream + results
│   │   │   ├── useSceneMap.ts         # Scene map manipulation
│   │   │   ├── useWorkbench.ts        # Generation workbench state
│   │   │   ├── useRequirement.ts      # Requirement CRUD
│   │   │   ├── useRequirementTree.ts  # Requirement hierarchy
│   │   │   ├── useAiConfig.ts         # AI model config
│   │   │   ├── useDiff.ts             # Diff comparison
│   │   │   ├── useKnowledge.ts        # Knowledge base
│   │   │   ├── useSSE.ts              # Generic SSE subscription
│   │   │   ├── useSSEStream.ts        # Streaming response aggregation
│   │   │   └── useNotifications.ts    # Notifications
│   │   ├── stores/                    # Zustand state stores
│   │   │   ├── auth-store.ts          # Auth state
│   │   │   ├── dashboard-store.ts     # Dashboard stats + filters
│   │   │   ├── diagnosis-store.ts     # Diagnosis results + chat history
│   │   │   ├── scene-map-store.ts     # Test point state
│   │   │   ├── workspace-store.ts     # Generation workbench state
│   │   │   ├── stream-store.ts        # Real-time stream events
│   │   │   ├── diff-store.ts          # Diff results
│   │   │   ├── knowledge-store.ts     # Knowledge base
│   │   │   └── notifications-store.ts # Notification queue
│   │   ├── lib/                       # Utilities & helpers
│   │   │   ├── api.ts                 # Unified API client + request helpers
│   │   │   └── (other utilities)
│   │   ├── types/                     # TypeScript type definitions
│   │   │   └── (shared types)
│   │   └── (css files, assets)
│   ├── public/                        # Static assets
│   ├── next.config.ts                 # Next.js configuration
│   ├── tailwind.config.ts             # Tailwind + sy-* color tokens
│   ├── tsconfig.json                  # TypeScript config
│   └── bun.lock                       # Bun lockfile
├── docker/                            # Docker Compose
│   └── docker-compose.yml             # PostgreSQL, Redis, Qdrant, MinIO
├── docs/                              # Documentation
│   └── PROMPT_RULES.md                # Prompt system specification
├── scripts/                           # Utility scripts
├── init.sh                            # One-command dev environment setup
├── CLAUDE.md                          # Project instructions
├── README.md                          # Public documentation
├── CHANGELOG.md                       # Version history
└── .planning/codebase/                # GSD planner output (THIS DIRECTORY)
    ├── ARCHITECTURE.md                # (you are here)
    ├── STRUCTURE.md                   # (you are here)
    ├── CONVENTIONS.md                 # (generated by quality focus)
    ├── TESTING.md                     # (generated by quality focus)
    ├── STACK.md                       # (generated by tech focus)
    ├── INTEGRATIONS.md                # (generated by tech focus)
    └── CONCERNS.md                    # (generated by concerns focus)
```

## Directory Purposes

**`backend/app/main.py`:**
- Purpose: FastAPI app initialization, middleware setup, dynamic router collection
- Loads all 23 modules via `_collect_routers()`
- Registers routers under `/api` prefix

**`backend/app/core/`:**
- Purpose: Infrastructure, middleware, configuration, dependency injection
- Key: `database.py` uses `@lru_cache` for lazy connection init
- All database + cache connections happen here, not in module services

**`backend/app/ai/`:**
- Purpose: LLM client integration, prompt assembly, streaming, parsing
- Constraint: **NO module imports** — pure AI orchestration
- Called by: Engine modules (diagnosis, scene_map, case_gen) which act as routers to AI logic

**`backend/app/engine/`:**
- Purpose: Domain algorithms (Prompt management, diffing, parsing, RAG)
- Pattern: Each engine (diagnosis, scene_map, case_gen) imports `ai/` layer
- Isolation: Engine modules never import from `modules/` — only from `ai/`, `core/`, `shared/`

**`backend/app/modules/<name>/`:**
- Purpose: Business domain (e.g., products, diagnosis, generation)
- Structure per-module:
  - `router.py` — HTTP entry points (parameter validation only)
  - `service.py` — Business logic (calls engine + data access)
  - `models.py` — SQLAlchemy ORM classes
  - `schemas.py` — Pydantic request/response types
  - `__init__.py` — Module exports

**`backend/tests/unit/test_<module>/`:**
- Purpose: Unit tests for each module
- Shared fixtures in `backend/tests/conftest.py`
- Pytest + pytest-asyncio with `asyncio_mode = "auto"`

**`frontend/src/app/`:**
- Purpose: Next.js App Router pages
- Structure:
  - `(auth)` — No top nav (login, register)
  - `(main)` — With top nav (all business pages)
  - `api/` — Next.js API routes (not actively used; backend is at `/api`)

**`frontend/src/components/`:**
- Purpose: Reusable React components
- Organization:
  - `ui/` — shadcn/ui + custom UI components (buttons, dialogs, etc.)
  - `workspace/` — Workbench-specific components
  - `scene-map/` — Scene map visualization (React Flow)
  - `layout/` — Layout wrappers
  - `providers/` — Context/Query providers

**`frontend/src/hooks/`:**
- Purpose: Custom React hooks for data fetching, state management
- Pattern: Each hook maps to a backend module (useDiagnosis, useSceneMap, etc.)
- Uses: React Query + Zustand stores for client-side state

**`frontend/src/stores/`:**
- Purpose: Zustand state stores (global state not tied to queries)
- Pattern: Per-feature store (auth-store, dashboard-store, workspace-store)
- Avoid: Redux/Context — Zustand is simpler and matches team preference

**`frontend/src/lib/api.ts`:**
- Purpose: Centralized API client
- Exports: `api` object with `.get()`, `.post()`, `.put()`, `.patch()`, `.delete()`
- All hooks/pages use this for HTTP calls
- Benefits: Consistent error handling, base URL resolution

## Key File Locations

**Entry Points:**
- Backend: `backend/app/main.py` (FastAPI app)
- Frontend: `frontend/src/app/layout.tsx` (Root layout)
- Frontend (main): `frontend/src/app/(main)/layout.tsx` (Top nav, sidebar)

**Configuration:**
- Backend: `backend/app/core/config.py` (Settings from .env)
- Frontend: `frontend/tailwind.config.ts` (Tailwind + sy-* colors)
- Frontend: `frontend/tsconfig.json` (Path aliases: `@/`)
- Build: `frontend/next.config.ts`

**Core Logic:**
- Diagnosis: `backend/app/modules/diagnosis/service.py`, `backend/app/engine/diagnosis/`
- Scene Map: `backend/app/modules/scene_map/service.py`, `backend/app/engine/scene_map/`
- Generation: `backend/app/modules/generation/service.py`, `backend/app/engine/case_gen/`
- Products: `backend/app/modules/products/service.py`, `backend/app/modules/products/models.py`

**Testing:**
- Backend: `backend/tests/unit/test_<module>/test_*.py`
- Frontend: `frontend/src/**/*.test.tsx` (co-located with components)
- Shared fixtures: `backend/tests/conftest.py`

**Database & ORM:**
- Migrations: `backend/alembic/versions/` (SQLAlchemy alembic)
- Base model: `backend/app/shared/base_model.py` (TimestampMixin, SoftDeleteMixin)
- Soft delete enforcement: Query filter in each service method

**Prompts & AI:**
- Prompt system: `backend/app/ai/prompts.py` (7-layer assembly)
- LLM client: `backend/app/ai/llm_client.py`
- Streaming: `backend/app/ai/sse_collector.py`, `stream_adapter.py`
- Parsing: `backend/app/ai/parser.py` (JSON extraction + validation)

## Naming Conventions

**Files:**

- **Python modules**: `snake_case` — `scene_map_service.py`, `test_diagnosis_service.py`
- **Python classes**: `PascalCase` — `SceneMapService`, `DiagnosisReport`
- **TypeScript files**: `camelCase` or `PascalCase` for components — `useSceneMap.ts`, `CaseCard.tsx`
- **Test files**: `test_<feature>.py` (Python), `<feature>.test.tsx` (TypeScript)

**Directories:**

- **Backend modules**: `snake_case` plural or singular — `products/`, `diagnosis/`, `scene_map/`
- **Frontend routes**: `kebab-case` — `/analysis`, `/workbench`, `/scene-map`
- **Components**: `PascalCase` — `CaseCard.tsx`, `ThreeColLayout.tsx`

**Variables & Functions:**

- **Python**: `snake_case` — `get_diagnosis()`, `scene_map_id`
- **TypeScript**: `camelCase` — `fetchTestCases()`, `setDiagnosis()`
- **React components**: `PascalCase` — `<CaseCard />`, `<StatusBadge />`
- **React hooks**: `camelCase` starting with `use` — `useRequirement()`, `useDiagnosis()`

**API Routes:**

- **Paths**: `kebab-case` — `/api/scene-map/generate`, `/api/test-cases`
- **Query params**: `snake_case` — `?requirement_id=...`, `?status=draft`

**Database:**

- **Tables**: `snake_case` plural — `products`, `test_cases`, `scene_nodes`, `diagnostic_reports`
- **Columns**: `snake_case` — `created_at`, `requirement_id`, `scene_map_id`
- **Foreign keys**: `<table_singular>_id` — `product_id`, `requirement_id`

## Where to Add New Code

**New Feature (Full Stack):**
1. Backend service: `backend/app/modules/<feature>/service.py` (call engine if AI-related)
2. Backend model: `backend/app/modules/<feature>/models.py`
3. Backend schema: `backend/app/modules/<feature>/schemas.py`
4. Backend router: `backend/app/modules/<feature>/router.py`
5. Backend tests: `backend/tests/unit/test_<feature>/test_*.py`
6. Frontend hook: `frontend/src/hooks/use<Feature>.ts`
7. Frontend store: `frontend/src/stores/<feature>-store.ts` (if global state needed)
8. Frontend page: `frontend/src/app/(main)/<route>/page.tsx`
9. Frontend components: `frontend/src/components/<feature>/`
10. Frontend tests: `frontend/src/app/(main)/<route>/*.test.tsx`

**New Component/Module:**
- Implementation: `frontend/src/components/<domain>/<ComponentName>.tsx`
- Tests: `frontend/src/components/<domain>/<ComponentName>.test.tsx` (co-located)
- Export from: `frontend/src/components/index.ts` (optional barrel file)

**New AI Engine Feature:**
- Prompt + logic: `backend/app/engine/<engine_name>/*.py`
- LLM call: `backend/app/ai/llm_client.py` + `stream_adapter.py`
- Import in service: Service calls engine → engine calls `backend/app/ai/`
- Do NOT import engine in router directly

**Utilities:**
- Shared helpers: `backend/app/shared/` (cross-module Python)
- Shared hooks: `frontend/src/hooks/` (reusable React hooks)
- API client: `frontend/src/lib/api.ts` (centralized API wrapper)
- Type definitions: `frontend/src/types/` (shared TS types)

**Tests (Backend):**
- Unit tests: `backend/tests/unit/test_<module>/test_<feature>.py`
- Fixtures: `backend/tests/conftest.py` (shared) or module-specific `conftest.py`
- Database: Use test DB via `@pytest.fixture(scope="function")` with cleanup

**Tests (Frontend):**
- Co-locate: `frontend/src/**/*.test.tsx` next to component
- Framework: Bun test + React Testing Library
- Store tests: `frontend/src/stores/__tests__/<store>.test.ts`

## Special Directories

**`backend/app/shared/`:**
- Purpose: Cross-module utilities
- Generated: No (hand-written)
- Committed: Yes
- Contents: `BaseModel`, `BaseSchema`, enums, pagination helpers

**`backend/alembic/`:**
- Purpose: Database migrations (auto-generated from models)
- Generated: Yes (via `alembic revision --autogenerate`)
- Committed: Yes (must be versioned)
- Usage: `uv run alembic upgrade head`

**`frontend/.next/`:**
- Purpose: Next.js build output
- Generated: Yes (via `bun run build`)
- Committed: No (in `.gitignore`)

**`frontend/node_modules/` (or `.bun/install/cache/`)**
- Purpose: Package dependencies
- Generated: Yes (via `bun install`)
- Committed: No

**`backend/venv/` or similar**
- Purpose: Python virtual environment
- Generated: Yes (via `uv sync`)
- Committed: No

---

*Structure analysis: 2026-03-15*
