# Architecture

**Analysis Date:** 2026-03-15

## Pattern Overview

**Overall:** Modular DDD (Domain-Driven Design) with explicit layering and strict separation of concerns.

**Key Characteristics:**
- **23 autonomous business modules** in `backend/app/modules/`, each with its own router/models/schemas/service layer
- **Distinct engine layer** (`backend/app/engine/`) isolated from modules, contains ALL AI/Prompt logic
- **Async-first** with FastAPI + SQLAlchemy 2.0 asyncpg (PostgreSQL + async)
- **Client-driven state management** — Frontend owns state (Zustand stores), backend is stateless
- **Three-column UI architecture** (left nav / center workspace / right panel) with independent scrolling

## Layers

**API Router Layer:**
- Purpose: Parameter validation, HTTP status codes, call service layer
- Location: `backend/app/modules/<name>/router.py`
- Contains: APIRouter with @router.get/post/patch/delete decorators
- Depends on: Service layer (injected), Pydantic schemas for request/response
- Used by: FastAPI app in `backend/app/main.py`
- Constraint: **NO Prompt writing, NO AI logic** — routers are thin HTTP adapters only

**Service Layer:**
- Purpose: Business logic, data access, coordination with engine layer
- Location: `backend/app/modules/<name>/service.py`
- Contains: Classes like `ProductService`, `GenerationService` with async methods
- Depends on: Database (AsyncSession injected), engine modules, shared utilities
- Used by: Routers call services via dependency injection
- Pattern: Services instantiated per-request with `session: AsyncSessionDep` parameter

**Models Layer:**
- Purpose: SQLAlchemy ORM definitions, soft-delete mixin enforcement
- Location: `backend/app/modules/<name>/models.py`
- Contains: SQLAlchemy declarative classes inheriting `BaseModel` (which includes `SoftDeleteMixin`, `TimestampMixin`)
- Key pattern: All queries must filter `Model.deleted_at.is_(None)`
- Example: `backend/app/modules/products/models.py` defines `Product`, `Iteration`, `Requirement`, `RequirementVersion`

**Schemas Layer:**
- Purpose: Pydantic v2 request/response validation, not tied to ORM
- Location: `backend/app/modules/<name>/schemas.py`
- Contains: BaseModel-derived request/response models for each operation
- Benefit: Decouples API contracts from database schema

**Engine Layer (AI/LLM Orchestration):**
- Purpose: ALL Prompt management, LLM calls, complex algorithms (diffing, parsing, RAG)
- Location: `backend/app/engine/<sub-engine>` (case_gen, diagnosis, scene_map, rag, uda, diff, import_clean)
- Contains: Pure functions and classes with no HTTP awareness
- Key files:
  - `backend/app/ai/prompts.py` — 7-layer prompt assembly system (System Prompt, Rules, Team Standards, etc.)
  - `backend/app/ai/llm_client.py` — LLM API client (Zhipu GLM, Dashscope Qwen)
  - `backend/app/ai/parser.py` — JSON extraction and validation from LLM outputs
  - `backend/app/ai/sse_collector.py` — Streaming response aggregation + incremental JSON case extraction
  - `backend/app/ai/stream_adapter.py` — Unified interface for thinking stream (GLM-5) + chunk-based streaming

**Core Infrastructure:**
- Purpose: Database, caching, auth, logging, rate limiting
- Location: `backend/app/core/`
- Key components:
  - `database.py` — `get_engine()`, `get_session_factory()`, `get_async_session()` with `@lru_cache`
  - `dependencies.py` — `AsyncSessionDep = Annotated[AsyncSession, Depends(get_async_session)]`
  - `cache.py`, `redis_client.py` — Cache layer for distributed state
  - `config.py` — Settings management
  - Middleware: `middleware.py`, `audit_middleware.py`, `rate_limiter.py`

## Data Flow

**Requirement Analysis Flow (M03 - Diagnosis):**

1. User uploads/selects requirement → Frontend calls `POST /api/diagnosis/{requirement_id}/run`
2. Router calls `DiagnosisService.run_and_persist_stream()`
3. Service fetches `Requirement` from DB → calls `engine/diagnosis/` module
4. Engine assembles Prompt (7 layers) → streams to Zhipu GLM-4-Flash
5. `SSECollector` buffers response → yields SSE events to frontend
6. Service auto-parses JSON → saves `DiagnosisReport` + `DiagnosisRisk` records
7. Frontend receives stream events in real-time, updates UI state with `diagnosis-store`

**Test Point Generation Flow (M04 - Scene Map):**

1. User starts analysis → `POST /api/scene-map/generate/{requirement_id}`
2. `SceneMapService.generate_scene_map_stream()` fetches requirement + diagnosis report
3. Calls `engine/scene_map/` → assembles prompt with diagnosis context
4. Streams to Zhipu GLM-4-Flash
5. `SSECollector` + `_IncrementalCaseExtractor` incrementally parses test points
6. Per-completed point: emit `case` SSE event (front-end renders immediately)
7. On stream complete: service persists all `TestPoint` records to `scene_nodes` table
8. Frontend optionally allows user to confirm/edit points before generation step

**Test Case Generation Flow (M05 - Generation Workbench):**

1. User enters workbench with requirement + confirmed test points
2. User starts chat: `POST /api/generation/{session_id}/chat`
3. `GenerationService.chat_and_persist_stream()` retrieves confirmed test points from DB
4. Assembles prompt with: requirement + diagnosis report + confirmed test points (NOT drafts)
5. Streams to Alidashscope Qwen-Max (higher CoT reasoning)
6. `SSECollector` buffers + emits thought events to frontend
7. On completion: `_save_and_parse_response()` auto-parses test cases
8. Persists `TestCase` + steps to `test_cases` table → linked to `GenerationSession`
9. Frontend displays cases in real-time card layout (never use `JSON.stringify`)

**State Management:**

- **Backend:** Stateless per-request. Session/context lives in DB only.
- **Frontend:** 9 Zustand stores (auth-store, dashboard-store, diagnosis-store, scene-map-store, stream-store, workspace-store, etc.)
- **Persistence:** All AI outputs → DB immediately (SSE stream completion triggers auto-persist)
- **Frontend refresh:** Can reload page → hydrate from DB via API calls

## Key Abstractions

**SoftDeleteMixin:**
- Purpose: Logical deletion without purging data
- Examples: All models inherit `BaseModel` which includes `SoftDeleteMixin`
- Pattern: Queries always filter `Model.deleted_at.is_(None)`
- Benefits: Audit trail, recovery, cascading deletes prevented

**Requirement as Document Graph:**
- Purpose: Flexible requirement representation with versioning
- Files: `backend/app/modules/products/models.py`
- Fields:
  - `content_ast: dict` — Abstract Syntax Tree (Markdown AST or JSON structure)
  - `frontmatter: dict | None` — Metadata (tags, custom fields)
  - `version: int` — Auto-increment, supports diffs
  - `RequirementVersion` — Historical snapshots for audit
- Used by: Diagnosis → Scene Map → Generation (each consumes requirement + prior analysis)

**GenerationSession:**
- Purpose: Conversation state for workbench (pairs user messages with AI responses)
- Files: `backend/app/modules/generation/models.py`
- Related: `GenerationMessage` (role: user/assistant, content, auto-parsed test cases)
- Pattern: Service maintains session → appends messages → returns stream iterator
- Frontend: Displays message history + live stream (no scroll jump)

**SceneMap + TestPoint:**
- Purpose: "What to test" layer — separates test points from test cases
- Files: `backend/app/modules/scene_map/models.py`
- Fields:
  - TestPoint: `group_name`, `title`, `description`, `status` (pending/ai_generated/confirmed), `source` (ai/user_added)
  - Supports: Reordering, inline editing, bulk confirm/reject
- Constraint: Generation step must receive ONLY confirmed points (not drafts)

**SSECollector + _IncrementalCaseExtractor:**
- Purpose: Stream aggregation + incremental JSON parsing
- Files: `backend/app/ai/sse_collector.py`
- Algorithm: Character-level state machine tracking JSON bracket depth + string boundaries
- Benefit: Frontend can render cases in real-time (no wait for full response)
- Emits events: `delta` (raw chunk), `case` (parsed object), `complete` (stream done)

## Entry Points

**Backend API:**
- Location: `backend/app/main.py`
- Triggers: FastAPI app initialization, all HTTP requests
- Responsibilities:
  - Collect routers from all 23 modules dynamically
  - Add middleware (CORS, logging, rate limiting, audit)
  - Health check endpoint at `/health`

**Frontend Root Layout:**
- Location: `frontend/src/app/layout.tsx`
- Triggers: Initial page load
- Responsibilities:
  - Wrap with ThemeProvider + QueryProvider
  - Load fonts (DM Sans, JetBrains Mono, Syne)
  - Integrate Sonner toast system

**Frontend Main Layout:**
- Location: `frontend/src/app/(main)/layout.tsx`
- Triggers: All authenticated pages
- Responsibilities:
  - Render top navigation bar (9 menu items)
  - Theme toggle, user menu, notifications, global search
  - Progress dashboard for long-running tasks

**Workbench (Generation Workspace):**
- Location: `frontend/src/app/(main)/workbench/page.tsx`
- Triggers: User navigates to `/workbench`
- Responsibilities:
  - Step 1: List confirmed test points from scene map
  - Step 2: Launch chat interface for case generation
  - SSE subscription for streaming responses

## Error Handling

**Strategy:** Explicit exception hierarchy + HTTP status codes

**Patterns:**

1. **Custom Exceptions** (`backend/app/core/exceptions.py`):
   - `NotFoundError` (404)
   - `ForbiddenError` (403)
   - `ConflictError` (409)

2. **Service Layer** raises exceptions → Router catches + translates to HTTP status

3. **Validation Layer** (Pydantic):
   - Invalid request → FastAPI auto-returns 422 with validation details
   - Example: `backend/app/modules/generation/router.py` uses `ChatRequest` schema

4. **LLM Failures**:
   - Retry logic: 2 retries with exponential backoff (1s, 2s) in `stream_adapter.py`
   - Fallback: If primary model fails → auto-degrade to backup model
   - Persist failure to `GenerationMessage` → frontend shows "Generation failed"

5. **Frontend Error Handling** (`frontend/src/lib/api.ts`):
   - `ApiError` class wraps status + detail
   - Hooks extract error message via `getApiErrorMessage()`
   - Toast notifications for user feedback

## Cross-Cutting Concerns

**Logging:**
- Approach: Python `logging` module + FastAPI middleware
- Location: `backend/app/core/middleware.py`, `backend/app/core/logging.py`
- Pattern: Each module imports `logger = logging.getLogger(__name__)`

**Validation:**
- Approach: Pydantic v2 schemas + SQLAlchemy constraints
- Backend: Request validation in router via schema, DB constraints via SQLAlchemy
- Frontend: React form validation (e.g., required fields, email format)

**Authentication:**
- Approach: Not fully implemented in current codebase (stub in `auth` module)
- Placeholder: `backend/app/modules/auth/`
- Future: JWT or session-based auth

**Rate Limiting:**
- Approach: Middleware-based with Redis backend
- Location: `backend/app/core/rate_limiter.py`
- Prevents: Brute force, API abuse

**Audit Logging:**
- Approach: Middleware captures all write operations
- Location: `backend/app/core/audit_middleware.py`
- Stores: User, resource, action, timestamp to `audit_logs` table

**Soft Deletion:**
- Approach: `SoftDeleteMixin` on `BaseModel`
- Enforcement: Every query must explicitly filter `deleted_at.is_(None)`
- Tools: `backend/app/core/query_utils.py` provides query builder helpers

---

*Architecture analysis: 2026-03-15*
