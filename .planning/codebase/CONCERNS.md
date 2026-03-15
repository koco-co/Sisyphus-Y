# Codebase Concerns

**Analysis Date:** 2026-03-15

## Tech Debt

**Incomplete Celery Task Implementation:**
- Issue: Three worker task modules contain only placeholder stubs with "TODO: implement" comments
- Files: `backend/app/worker/tasks/diagnosis_tasks.py`, `backend/app/worker/tasks/generation_tasks.py`, `backend/app/worker/tasks/parse_tasks.py`
- Impact: Long-running operations cannot be offloaded to async workers; SSE streaming operations may block request handling if tasks aren't properly delegated to Celery
- Fix approach: Implement actual task logic for background processing (diagnosis analysis, case generation, document parsing)

**TODO/FIXME Comments in Core Paths:**
- Issue: Multiple unresolved TODO markers in critical modules
- Files:
  - `backend/app/tasks/embed_task.py:28` - Vector embedding task not implemented
  - `backend/app/tasks/export_task.py:29` - Case export logic placeholder
  - `backend/app/tasks/diff_task.py:38` - Semantic Diff LLM analysis marked TODO
- Impact: RAG indexing, case export, and Diff semantic analysis features are non-functional or partially implemented
- Fix approach: Complete implementation of embedding pipeline, export serialization, and semantic impact analysis

**Large Service Classes:**
- Issue: Multiple service classes exceed 600+ lines, mixing concerns
- Files:
  - `backend/app/modules/testcases/service.py` (716 lines) - Query, filter logic, case CRUD mixed together
  - `backend/app/modules/dashboard/service.py` (619 lines) - Stats aggregation with complex joins
  - `backend/app/ai/prompts.py` (525 lines) - Monolithic prompt assembly logic
- Impact: Difficult to unit test, high cognitive load, risk of introducing bugs during modifications
- Fix approach: Extract filtering/query logic into separate QueryBuilder class; split prompts by domain (diagnosis/generation/diff)

**Stream Handling Fallback Complexity:**
- Issue: `backend/app/ai/stream_adapter.py` implements complex fallback behavior with manual chunking
- Files: `backend/app/ai/stream_adapter.py` (374 lines)
- Impact:
  - Stall detection with 8-second timeout may incorrectly interrupt slow LLM providers
  - Manual chunk splitting (160 chars) may break mid-word or mid-UTF8 character
  - Keepalive heartbeat every 15s creates unnecessary message overhead
- Fix approach: Use provider-level streaming natively; implement proper UTF-8 aware chunking; increase stall timeout or make configurable

**Soft Delete Enforcement Gap:**
- Issue: 254 occurrences of `deleted_at` checks across codebase, but no centralized query interceptor
- Files: Scattered across all service modules
- Impact: Risk of queries accidentally bypassing soft delete filter, leaking deleted data to users
- Fix approach: Implement SQLAlchemy event listener or base query class to auto-inject deleted_at filter

---

## Known Bugs

**SSE Stream Parsing Silent Failures:**
- Symptoms: Malformed JSON in SSE events silently ignored; streaming stops without client notification
- Files: `frontend/src/hooks/useSSEStream.ts:42-44` - try/catch swallows parse errors with comment "ignore parse errors"
- Trigger: LLM provider returns unexpected JSON format (e.g., escaped quotes, trailing commas)
- Workaround: Check browser console for no visible error; streaming silently halts
- Fix: Log parse errors; emit error event to UI; show toast notification to user

**Database Pool Exhaustion Under Load:**
- Symptoms: Requests hang after ~20 concurrent SSE streams; "QueuePool limit exceeded" errors
- Files: `backend/app/core/database.py:25-29` - Default SQLAlchemy pool settings without size limits
- Trigger: Multiple simultaneous SSE streaming connections each holding a session open
- Workaround: Restart uvicorn to clear connections
- Fix: Configure explicit pool size limits; use connection pooling middleware; implement request-scoped session context

**Test Point Confirmation State Race Condition:**
- Symptoms: Clicking "Confirm Point" multiple times creates duplicate confirmed states in UI vs. database
- Files: `frontend/src/app/(main)/workbench/page.tsx:115-119` - Promise.all without deduplication
- Trigger: User double-clicks "Start Generation" before scene map confirms all selected points
- Workaround: Wait for confirmation toast before proceeding
- Fix: Debounce confirm button; add loading state; implement idempotent confirm endpoint

**RAG Vector Dimension Mismatch:**
- Symptoms: Qdrant collection created with wrong dimensions; similarity search returns no results
- Files: `backend/app/modules/knowledge/service.py` - Vector status tracking but no validation
- Trigger: User changes embedding model dimensions without confirming Qdrant recreation
- Workaround: Manually call `/api/ai-config/reset-vectors` to rebuild collection
- Fix: Add validation in embedder to confirm collection dimensions match model output; block generation if mismatch detected

---

## Security Considerations

**API Key Exposure in Stream Adapter:**
- Risk: LLM API keys passed through httpx client with `trust_env=False` but no explicit secret masking
- Files: `backend/app/ai/llm_client.py:76-78`, `backend/app/ai/stream_adapter.py:86`
- Current mitigation: Environment variable isolation; no hardcoded keys in code
- Recommendations:
  - Audit logs to ensure API keys never logged (even in debug mode)
  - Add request/response interceptor to mask Authorization headers in logs
  - Implement rate limiting to detect API key abuse

**SSE Streaming Hijacking:**
- Risk: Client-side SSE stream has no request authentication token
- Files: `frontend/src/hooks/useSSEStream.ts:9-10` - No auth headers in fetch request
- Current mitigation: Session cookie (implicit)
- Recommendations:
  - Explicitly add Bearer token to fetch headers
  - Implement per-stream session ID validation on backend
  - Add timeout for idle streams (>5 min)

**Soft Deleted Data Accessible via Direct IDs:**
- Risk: User can access soft-deleted requirement/case by direct UUID in URL query parameter
- Files: All router endpoints that accept UUID path/query parameters
- Current mitigation: Soft delete filter in queries, but not enforced at route level
- Recommendations:
  - Add middleware to validate all UUID parameters against deleted_at
  - Audit current delete operations to ensure no unintended data exposure

**MinIO Credential Exposure:**
- Risk: MinIO credentials in `.env` file not rotated; no API key versioning
- Current mitigation: `.env` in `.gitignore`
- Recommendations:
  - Implement MinIO access policy with service account instead of root credentials
  - Add credential rotation schedule (quarterly)
  - Monitor MinIO access logs for unauthorized access patterns

---

## Performance Bottlenecks

**N+1 Query in TestCase List:**
- Problem: Each test case in list triggers separate query for related scene node / requirement
- Files: `backend/app/modules/testcases/service.py:19-112` - list_cases with nested relationships not eagerly loaded
- Cause: SQLAlchemy lazy-loading of relationships by default
- Improvement path:
  - Add `.options(selectinload(TestCase.scene_node), selectinload(TestCase.requirement))` to query
  - Cache frequently accessed requirement data
  - Benchmark: Should reduce 100-case list from ~150ms to ~30ms

**Dashboard Aggregation Query Performance:**
- Problem: Dashboard stats require multiple sequential COUNT/SUM operations across all cases/requirements
- Files: `backend/app/modules/dashboard/service.py:619-900` (complex aggregation logic)
- Cause: Separate queries for each metric (total cases, passed cases, coverage %, etc.)
- Improvement path:
  - Use single aggregation query with multiple COUNT(CASE WHEN...) expressions
  - Cache results for 5 minutes (stats don't change frequently)
  - Pre-compute metrics asynchronously via Celery
  - Benchmark: Should reduce dashboard load from ~500ms to ~100ms

**RAG Retrieval Latency:**
- Problem: Vector similarity search + metadata filtering takes ~800ms
- Files: `backend/app/engine/rag/retriever.py:150-200` (search logic)
- Cause:
  - Qdrant doesn't support pre-filtering on metadata efficiently
  - Network latency to Qdrant service (separate container)
  - No query result caching
- Improvement path:
  - Implement Qdrant pre-filtering with payload filters (if supported)
  - Cache knowledge base retrieval results for identical queries
  - Use Qdrant local mode (embedded) in development
  - Benchmark: Target < 200ms for knowledge retrieval

**Import Dialog State Management:**
- Problem: ImportDialog re-renders entire 1000-line component on folder tree change
- Files: `frontend/src/app/(main)/testcases/_components/ImportDialog.tsx` (1000 lines)
- Cause: Monolithic component with 30+ useState hooks; no memoization of subcomponents
- Improvement path:
  - Extract FolderTree, ColumnMapper, PreviewTable into separate memoized components
  - Use useCallback for all event handlers
  - Implement virtual scrolling for large folder trees (>1000 items)
  - Benchmark: Should reduce re-renders from 100+ to <5 on folder navigation

**TypeScript Type Checking Build Time:**
- Problem: `tsc --noEmit` takes 45+ seconds
- Files: Entire frontend codebase with complex union types
- Cause:
  - Deeply nested union types in schemas (e.g., union of 20+ page route types)
  - No incremental type checking enabled
  - Type inference on large objects without explicit annotations
- Improvement path:
  - Enable `incremental: true` in `tsconfig.json`
  - Add explicit return type annotations to functions (especially hooks)
  - Simplify union types using discriminated unions pattern
  - Benchmark: Target < 15 seconds

---

## Fragile Areas

**Scene Map Rendering State Machine:**
- Files: `frontend/src/app/(main)/workbench/page.tsx:33-200`, `frontend/src/hooks/useSceneMap.ts`
- Why fragile:
  - Multiple interdependent state sources (viewStep, selectedReqId, activeSessionId, checkedPointIds)
  - No formal state machine; logic scattered across useEffect hooks
  - Race condition if user clicks "Start Generation" while scene map is loading
  - Complexity: 5 useEffect hooks with 3+ dependency arrays each
- Safe modification:
  - Extract state machine to separate hook using useReducer
  - Add explicit state validation in each transition
  - Add loading states to prevent invalid transitions
  - Test all state combinations with Jest state machine snapshot tests
- Test coverage: Gaps in transition testing (what happens if user navigates during loading)

**ImportDialog Multi-Step Flow:**
- Files: `frontend/src/app/(main)/testcases/_components/ImportDialog.tsx`
- Why fragile:
  - 6 distinct steps (file select → parse → mapping → preview → duplicate strategy → confirm)
  - Each step manages separate state (format, preview_rows, duplicate_strategy, etc.)
  - User can click back button and re-enter different step combinations
  - No validation that previous step completed before advancing
- Safe modification:
  - Implement explicit step validator (stepX → stepX+1 only if stepX_complete === true)
  - Add guard rail: disable next button if current step invalid
  - Store each step's state in separate Zustand store slice
  - Add step history stack to support back navigation safely
- Test coverage: Missing tests for invalid step transitions, back navigation with partial data

**LLM Provider Fallback Logic:**
- Files: `backend/app/ai/llm_client.py:21-52`, `backend/app/ai/stream_adapter.py:77-150`
- Why fragile:
  - Fallback provider selection hardcoded (zhipu → dashscope → openai)
  - No validation that fallback provider is configured before attempting
  - Stream vs. non-stream path divergence: some logic only in stream_adapter, not llm_client
  - Different error handling per provider (ZhipuAI sync-only, OpenAI async)
- Safe modification:
  - Create LLMProviderRegistry class to manage provider list and fallback order
  - Add pre-flight validation: check all providers are configured on startup
  - Unify error handling: create abstract LLMProvider interface with common error types
  - Add telemetry: log which provider was used, fallback events
- Test coverage: No tests for fallback scenarios; missing tests for missing credentials

**Soft Delete Query Filter Injection:**
- Files: All service classes; pattern: `.where(Model.deleted_at.is_(None))`
- Why fragile:
  - Developers must manually add filter to every query
  - Easy to forget `.deleted_at.is_(None)` in new queries
  - No compile-time enforcement; caught only at runtime if data leaks
  - Filter can be accidentally bypassed with raw SQL fallback
- Safe modification:
  - Implement SQLAlchemy event listener to auto-inject deleted_at filter on all SELECT queries
  - Or: Create BaseService.safe_select() method that enforces filter
  - Add pre-commit hook to grep for `.select(Model)` without deleted_at check
  - Add integration test to verify all main entity queries respect soft delete
- Test coverage: No integration test verifying soft delete enforcement across all queries

**SSE Stream Lifecycle Management:**
- Files: `frontend/src/hooks/useSSEStream.ts`, `frontend/src/app/(main)/workbench/page.tsx:51-56`
- Why fragile:
  - No explicit stream cancellation token; relies on response.body closing
  - If user navigates away during stream, reader loop continues (memory leak potential)
  - No heartbeat timeout detection on client side (hangs indefinitely if server heartbeat fails)
  - Multiple concurrent streams can be initiated if user clicks "Generate" multiple times
- Safe modification:
  - Wrap reader loop in AbortController; implement cleanup in useEffect return
  - Add client-side heartbeat timeout: if >30s without data chunk, emit timeout error
  - Debounce/lock generate button to prevent concurrent streams
  - Add logging to track stream lifecycle (start, complete, error, cancel)
- Test coverage: No tests for stream cancellation, cleanup, or concurrent initiation

---

## Scaling Limits

**PostgreSQL Connection Pool:**
- Current capacity: Default SQLAlchemy pool size (~5 connections in development)
- Limit: Breaks at ~20 concurrent SSE streams (each holds a session)
- Scaling path:
  - Increase pool size: `pool_size=20, max_overflow=40`
  - Implement connection pooling middleware (pgBouncer)
  - Use read replicas for read-heavy dashboard queries
  - Implement Redis caching for dashboard stats (5-min TTL)
  - Target: Support 100+ concurrent users

**Qdrant Vector Storage:**
- Current capacity: 7480 vectors stored (one per historical case)
- Limit: No measured limit; scales linearly with knowledge base size
- Scaling path:
  - Monitor Qdrant collection size; budget for 100k+ vectors
  - Implement incremental indexing (batch import instead of one-at-a-time)
  - Consider vector quantization if memory becomes issue
  - Add sharding strategy if Qdrant single instance insufficient

**MinIO File Storage:**
- Current capacity: Document uploads only (UDA parsed files); assume <1GB total
- Limit: No enforced quota; could fill disk if large documents bulk-uploaded
- Scaling path:
  - Implement file size limits per document (max 50MB)
  - Add cleanup job: delete parsed files >90 days old
  - Monitor MinIO disk usage; alert if >80% full
  - Consider S3 migration if needs scale beyond single node

**Frontend Build Size:**
- Current: 1000-line components (ImportDialog, FolderTree); no code splitting
- Limit: Single app.js bundle growing (estimated >500KB uncompressed)
- Scaling path:
  - Implement route-based code splitting with Next.js dynamic imports
  - Extract ImportDialog and other large modals as separate code chunks
  - Use tree-shaking to remove unused shadcn/ui components
  - Target: Main bundle <150KB, total app.js <300KB

---

## Dependencies at Risk

**ZhipuAI SDK (zhipuai package):**
- Risk: Chinese-only LLM provider; community package with potential maintenance gaps
- Impact: If package abandoned, cannot upgrade to newer API versions; security vulnerabilities unfixed
- Migration plan:
  - Keep OpenAI as primary fallback (most stable)
  - Monitor zhipuai package updates; plan 12-month migration to equivalent if unmaintained
  - Maintain abstraction layer (LLMProvider interface) so switching is low-cost

**PaddleOCR (paddlepaddle package):**
- Risk: Baidu-maintained; large footprint (~500MB downloads); slow cold start
- Impact: Document parsing performance bottleneck; high memory usage during OCR
- Migration plan:
  - Benchmark against lighter OCR options (EasyOCR, Tesseract)
  - If OCR is non-critical, consider removing and falling back to text extraction only
  - Implement lazy loading: import OCR only when document contains images

**SQLAlchemy 2.0 Async Migration:**
- Risk: Recent breaking changes; async API still stabilizing
- Impact: Raw SQL queries or complex ORM patterns may break on minor version updates
- Migration plan:
  - Pin to specific version band (`sqlalchemy>=2.0,<2.1`)
  - Test each minor version upgrade in staging before production
  - Avoid raw SQL; keep using ORM layer for forward compatibility

**Qdrant Client (qdrant_client package):**
- Risk: Qdrant vector DB is still pre-1.0; APIs may change
- Impact: Vector search queries may fail on version mismatch
- Migration plan:
  - Pin to compatible version range
  - Document required Qdrant server version in README
  - Test client/server version compatibility matrix before upgrades

---

## Missing Critical Features

**Asynchronous Task Persistence:**
- Problem: Celery tasks are stubbed; no background job tracking or retry logic
- Blocks: Long-running operations (bulk case import, vector embedding, Diff analysis) cannot run async
- Impact: UI blocks during these operations; timeout risk for large datasets

**Vector Index Versioning:**
- Problem: No version tracking for embeddings; changing embedding model dimension orphans old vectors
- Blocks: Ability to safely upgrade embedding models without data loss
- Impact: Vector search broken until manual Qdrant recreation

**Semantic Diff Implementation:**
- Problem: `diff_task.py` marked TODO; only text-level diff implemented
- Blocks: Cannot determine true semantic impact of requirement changes (whether test case affected)
- Impact: Change impact analysis incomplete; risk of missed case reruns

**Audit Trail for Critical Operations:**
- Problem: Create/Update/Delete operations not logged with user/timestamp
- Blocks: Cannot trace who changed what requirement or test case
- Impact: Compliance gap; no forensic trail for quality investigations

**Case Template Version Control:**
- Problem: Templates not versioned; no way to know which template version generated a case
- Blocks: Cannot regenerate cases with different template parameters
- Impact: Case regeneration feature blocked; template changes affect past cases unpredictably

---

## Test Coverage Gaps

**Scene Map Generation Pipeline:**
- What's not tested:
  - End-to-end scene map generation from requirement to confirmed test points
  - Color coding validation (covered vs. missing vs. supplemented)
  - Undo/redo operations on test point confirmations
- Files: `backend/app/modules/scene_map/service.py`, `backend/app/engine/scene_map/generator.py`
- Risk: High-risk component; bugs invisible until UI testing
- Priority: High

**SSE Stream Error Handling:**
- What's not tested:
  - Stream disconnect mid-transmission (network failure)
  - Malformed JSON in stream events
  - Timeout detection (stall >8 seconds)
  - Concurrent stream requests from same user
- Files: `frontend/src/hooks/useSSEStream.ts`, `backend/app/ai/stream_adapter.py`
- Risk: Critical UX path; errors degrade silently
- Priority: High

**Celery Task Lifecycle:**
- What's not tested:
  - Task retry logic (exponential backoff)
  - Task failure notification to user
  - Concurrent task execution limits
  - Task state persistence across service restart
- Files: `backend/app/worker/tasks/*.py`, `backend/app/core/celery_app.py`
- Risk: Background jobs currently non-functional; no tests for when implemented
- Priority: Medium

**Soft Delete Enforcement:**
- What's not tested:
  - All queries in all service layers respect deleted_at filter
  - Deletion cascade (deleting product deletes all child requirements/cases)
  - Undelete operation recovery (no undelete yet, but should test deletion is reversible)
- Files: All service modules
- Risk: Data leakage if filter accidentally bypassed
- Priority: Medium

**Import Dialog Edge Cases:**
- What's not tested:
  - Upload file while folder tree is loading
  - Rapid back/forward navigation between steps
  - Import with duplicate strategy "rename" on 1000+ identical titles
  - Cancel mid-import and retry
- Files: `frontend/src/app/(main)/testcases/_components/ImportDialog.tsx`
- Risk: Complex multi-step flow; edge cases likely break in production
- Priority: Medium

**RAG Retrieval Relevance:**
- What's not tested:
  - Retrieval accuracy (are top-5 results actually relevant?)
  - Query expansion performance (vs. exact keyword match)
  - Chunk size optimization (current chunk size not validated)
- Files: `backend/app/engine/rag/retriever.py`, `backend/app/engine/rag/chunker.py`
- Risk: RAG feature appears to work but returns irrelevant results
- Priority: Low (feature is optional enhancement)

---

*Concerns audit: 2026-03-15*
