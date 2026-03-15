# Testing Patterns

**Analysis Date:** 2026-03-15

## Test Framework

**Backend - Python:**
- **Runner:** pytest 8.3+
- **Async Support:** pytest-asyncio 0.24+ with `asyncio_mode = "auto"`
- **Coverage:** pytest-cov 6.0+
- **Fixtures:** factory-boy 3.3+ for test data factories
- **Config File:** `backend/pyproject.toml`
  - `asyncio_mode = "auto"` enables auto-wrapping of async tests
  - `testpaths = ["tests"]`

**Frontend - TypeScript:**
- **Runner:** Bun test (built-in to Bun runtime)
- **Testing Utilities:** `expect`, `mock`, `test` from `bun:test`
- **SSR Testing:** React's `renderToStaticMarkup` for static HTML validation
- **No external testing library** - uses Bun's native test runner

**Run Commands:**

```bash
# Backend
uv run pytest -v                    # Run all tests
uv run pytest --cov=app             # Coverage report
uv run pytest tests/unit/test_diagnosis/ -v  # Specific module

# Frontend
bun test                            # Run all tests
bun test --watch                    # Watch mode
bun test -- --coverage              # Coverage
```

## Test File Organization

**Backend:**
- **Location:** `backend/tests/unit/test_<module>/`
- **Naming:** `test_<feature>.py`
- **Structure:**
  ```
  backend/tests/
  ├── conftest.py                    # Shared fixtures
  └── unit/
      ├── test_diagnosis/
      │   ├── __init__.py
      │   ├── test_diagnosis_service.py
      │   ├── test_scanner.py
      │   └── test_checklist.py
      ├── test_generation/
      │   ├── __init__.py
      │   ├── test_generation_service.py
      └── ...
  ```

**Frontend:**
- **Location:** Co-located with source (same directory as component/hook)
- **Naming:** `<filename>.test.tsx` or `<filename>.test.ts`
- **Examples:**
  - Component test: `frontend/src/app/(main)/page.test.tsx` alongside `page.tsx`
  - Hook test: `frontend/src/hooks/useRequirement.test.ts` alongside `useRequirement.ts`
  - Route handler test: `frontend/src/app/api/progress/route.test.ts` alongside `route.ts`

## Test Structure

**Backend - Pytest Class-Based Pattern:**

```python
"""DiagnosisService 回归测试。"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.diagnosis.service import DiagnosisService


def _make_report():
    """Factory helper for test data."""
    report = MagicMock()
    report.id = uuid.uuid4()
    report.status = "running"
    report.summary = None
    report.risk_count_high = 1
    report.risk_count_medium = 2
    return report


class TestPersistAiResponse:
    async def test_persist_ai_response_extracts_markdown_risks_and_score(self):
        """Markdown 风险表格应被解析并持久化为 DiagnosisRisk。"""
        report = _make_report()
        session = AsyncMock()
        session.add = MagicMock()
        session.get = AsyncMock(return_value=report)
        session.flush = AsyncMock()
        session.commit = AsyncMock()

        service = DiagnosisService(session)
        ai_content = """## 测试健康诊断报告

### 总体健康评分
- 评分：40/100

### 风险点列表
| ID | Title | Description | Risk Level | Suggestion |
| --- | --- | --- | --- | --- |
| R1 | 权限校验缺失 | 管理员与普通用户权限边界不清 | high | 补充 RBAC 校验 |
"""

        risks = await service.persist_ai_response(report.id, ai_content)

        assert len(risks) == 1
        assert risks[0].title == "权限校验缺失"
        assert risks[0].level == "high"
```

**Frontend - Bun Test Pattern:**

```typescript
import { expect, mock, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

const mockDashboardState = {
  stats: {
    product_count: 6,
    iteration_count: 12,
    testcase_count: 1247,
  },
  refresh: () => {},
};

mock.module('@/hooks/useDashboard', () => ({
  useDashboard: () => mockDashboardState,
}));

test('dashboard page renders iteration selector', async () => {
  const module = await import('./page');
  const DashboardPage = module.default;

  const html = renderToStaticMarkup(<DashboardPage />);

  expect(html).toContain('aria-label="选择迭代"');
  expect(html).toContain('较上一迭代 +8');
});
```

## Mocking

**Framework:** Python's `unittest.mock` (AsyncMock, MagicMock, patch)

**Backend Patterns:**

```python
# AsyncMock for async functions
session = AsyncMock()
session.get = AsyncMock(return_value=report)
session.commit = AsyncMock()

# patch for module-level imports
with patch(
    "app.modules.diagnosis.service.get_thinking_stream_with_fallback",
    new=AsyncMock(return_value=iter(())),
) as guarded_stream:
    await service.run_stream(uuid.uuid4())
    guarded_stream.assert_awaited_once()

# MagicMock for ORM objects
report = MagicMock()
report.id = uuid.uuid4()
report.status = "running"
report.risk_count_high = 1
```

**Frontend Patterns (Bun):**

```typescript
mock.module('@/hooks/useDashboard', () => ({
  useDashboard: () => mockDashboardState,
}));

mock.module('@/lib/api', () => ({
  api: {
    get: async () => ({ total_cases: 0 }),
    post: async () => ({ id: 'new-id' }),
  },
}));

// Hook mocks for rendering
const { useDashboard } = await import('@/hooks/useDashboard');
```

**What to Mock:**
- External API calls (all `api.get()`, `api.post()` calls)
- Database dependencies (AsyncSession, queries)
- LLM/AI service calls
- Time-dependent operations

**What NOT to Mock:**
- Business logic functions being tested
- Data transformation utilities
- String parsing/validation helpers
- Pure utility functions

## Fixtures and Factories

**Backend - Conftest Fixtures (Global):**

Located in `backend/tests/conftest.py`:

```python
"""公共 Fixture — 异步测试基础设施"""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_async_session
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

engine_test = create_async_engine(TEST_DATABASE_URL, echo=False)
async_session_test = async_sessionmaker(engine_test, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """提供独立的异步数据库会话（每次测试自动回滚）。"""
    async with async_session_test() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """提供异步 HTTP 测试客户端。"""

    async def _override_session() -> AsyncGenerator[AsyncSession, None]:
        async with async_session_test() as session:
            yield session

    app.dependency_overrides[get_async_session] = _override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def mock_llm() -> AsyncMock:
    """Mock LLM 客户端，用于单元测试 AI 引擎。"""
    mock = AsyncMock()
    mock.ainvoke.return_value.content = '{"result": "mocked"}'
    return mock
```

**Backend - Local Test Factories:**

```python
def _make_report():
    """Factory for DiagnosisReport mock."""
    report = MagicMock()
    report.id = uuid.uuid4()
    report.status = "running"
    report.summary = None
    report.risk_count_high = 1
    report.risk_count_medium = 2
    report.risk_count_industry = 3
    report.overall_score = None
    return report
```

**Frontend - Mock Module Setup:**

Test data is defined at top of each test file as mock state objects:

```typescript
const mockDashboardState = {
  stats: { product_count: 6, iteration_count: 12 },
  pendingItems: [],
  activities: [],
  loading: false,
  selectedIterationId: 'iter-003',
  setIterationId: () => {},
  refresh: () => {},
};
```

## Coverage

**Requirements:** No explicit enforcement, but aim for >80% on critical paths

**View Coverage:**

```bash
# Backend
uv run pytest --cov=app --cov-report=html
# Open htmlcov/index.html

# Frontend
bun test -- --coverage
```

**Coverage Gaps:**
- Complex AI prompt generation (engine layer) - tested via integration tests
- Error fallback paths - covered by service tests
- UI interactions - limited by Bun's SSR testing approach

## Test Types

**Unit Tests:**
- **Scope:** Single service method or utility function in isolation
- **Approach:** Mock all dependencies (database, LLM, external APIs)
- **Location:** `tests/unit/test_<module>/test_<feature>.py`
- **Example:** Test that `persist_ai_response()` correctly parses markdown risk tables

**Service Tests:**
- Focus on business logic of service classes
- Mock AsyncSession with controlled return values
- Verify state changes and side effects
- Example: `test_persist_ai_response_extracts_markdown_risks_and_score`

**API/Router Tests:**
- Use `client` fixture (in-process ASGI test client)
- Override database session dependency
- Verify HTTP status codes and response structure
- Example: `test_knowledge_api.py` tests GET/POST/DELETE endpoints

**Integration Tests:**
- Currently not present in codebase
- Would test multiple services working together with real database
- Future work: Add integration tests for LLM pipelines

**Frontend Component Tests:**
- Use `renderToStaticMarkup()` to validate HTML output
- Mock all hooks and API calls
- Focus on content/structure, not interactivity
- Example: `page.test.tsx` verifies dashboard renders iteration selector

**Frontend Hook Tests:**
- Mock API responses
- Verify hook state changes
- Test error handling paths
- Example: Would test `useAiConfig` hook loading/error states

**E2E Tests:**
- Not currently implemented
- Future approach: Playwright or Cypress for full user workflows

## Common Patterns

**Async Testing:**

```python
# pytest-asyncio handles async test functions automatically
async def test_get_report_returns_matching_requirement():
    """Async test with database mock."""
    session = AsyncMock()
    session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=lambda: report))

    service = DiagnosisService(session)
    result = await service.get_report(uuid.uuid4())

    assert result.id == report.id
```

**Error Testing:**

```python
async def test_persist_ai_response_handles_missing_report():
    """Handle non-existent report gracefully."""
    session = AsyncMock()
    session.get = AsyncMock(return_value=None)

    service = DiagnosisService(session)

    with pytest.raises(ValueError):
        await service.persist_ai_response(uuid.uuid4(), "content")
```

**Mocking LLM Calls:**

```python
async def test_run_stream_calls_guarded_fallback():
    """Verify streaming uses fallback adapter."""
    service = DiagnosisService(session)
    guarded_stream = AsyncMock(return_value=iter(()))

    with patch(
        "app.modules.diagnosis.service.get_thinking_stream_with_fallback",
        new=guarded_stream,
    ):
        await service.run_stream(req_id)

        guarded_stream.assert_awaited_once()
        call = guarded_stream.await_args
        assert call.kwargs["provider"] == "zhipu"
```

**Verifying Database State:**

```python
async def test_create_session_persists_and_returns():
    """Test full create + refresh cycle."""
    session = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()

    service = GenerationService(session)
    gen_session = await service.create_session(req_id, mode="test_point_driven")

    session.add.assert_called_once()
    session.commit.assert_called_once()
    session.refresh.assert_called_once()
    assert gen_session.mode == "test_point_driven"
```

**Frontend Mock Module Pattern:**

```typescript
// Mock hook before importing component
mock.module('@/hooks/useDashboard', () => ({
  useDashboard: () => mockDashboardState,
}));

// Mock API before importing page
mock.module('@/lib/api', () => ({
  api: {
    get: async () => ({ total_cases: 0 }),
  },
}));

// Import and test
const module = await import('./page');
const Page = module.default;
const html = renderToStaticMarkup(<Page />);
```

## Test Organization by Module

**diagnosis module tests** (`backend/tests/unit/test_diagnosis/`):
- `test_diagnosis_service.py` - Main service methods (persist, complete, streaming)
- `test_scanner.py` - Risk scanning logic
- `test_checklist.py` - Industry checklist matching
- `test_quality_evaluator.py` - Health score calculation

**generation module tests** (`backend/tests/unit/test_generation/`):
- `test_generation_service.py` - Session/message management
- Expected future: `test_generation_router.py` for API validation

**scene_map module tests** (`backend/tests/unit/test_scene_map/`):
- `test_scene_map_service.py` - Test point CRUD
- `test_generator.py` - Test point generation from requirements
- `test_validator.py` - Test point validation rules
- `test_scene_map_api.py` - HTTP endpoint validation

**rag module tests** (`backend/tests/unit/test_rag/`):
- `test_retriever.py` - Document retrieval logic
- `test_embedder.py` - Vector embedding
- `test_chunker.py` - Document chunking

---

*Testing analysis: 2026-03-15*
