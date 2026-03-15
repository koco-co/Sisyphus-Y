# Coding Conventions

**Analysis Date:** 2026-03-15

## Naming Patterns

**Python Files:**
- `snake_case` for all files and modules
- Examples: `diagnosis_service.py`, `scene_map_generator.py`, `test_cases_parser.py`

**Python Functions/Variables:**
- `snake_case` for functions and local variables
- Example: `async def get_report()`, `list_sessions()`, `_save_and_parse_response()`

**Python Classes:**
- `PascalCase` for all classes
- Suffix `Service` for service layer: `DiagnosisService`, `GenerationService`, `CollaborationService`
- Models inherit from `BaseModel`: `DiagnosisReport`, `TestPoint`, `SceneMap`
- Schemas use Pydantic: `DiagnosisRiskUpdate`, `CommentCreate`, `ReviewCreate`
- Example: `class GenerationService`, `class DiagnosisReport`, `class CommentCreate`

**TypeScript Variables/Functions:**
- `camelCase` for variables, functions, hooks
- Examples: `useAiConfig()`, `fetchRequirements()`, `pickGlobalConfig()`, `getApiErrorMessage()`

**TypeScript Components/Types:**
- `PascalCase` for React components and type names
- Examples: `ConnectionTestButton`, `ConfirmDialog`, `ProgressSteps`, `Pagination`
- Interface names: `ConnectionTestButtonProps`, `ConfirmDialogProps`, `TestStatus`

**API Routes:**
- `kebab-case` for endpoint paths
- Examples: `/api/generation/sessions`, `/api/scene-map/generate`, `/api/knowledge/documents`
- Router prefix: `prefix="/generation"`, `prefix="/diagnosis"`

**Database Tables:**
- `snake_case` plural names
- Examples: `diagnosis_reports`, `test_cases`, `scene_nodes`, `generation_messages`

**Database Fields:**
- `snake_case` for all columns
- Timestamps: `created_at`, `updated_at`, `deleted_at`
- References: `requirement_id`, `session_id`, `report_id` (singular)
- Status fields: `status`, `risk_status`, `decision`

## Code Style

**Formatting:**
- **Python:** Ruff (line length 120, except `app/ai/prompts.py` exempted for long strings)
- **TypeScript/JSX:** Biome
  - Indent: 2 spaces
  - Line width: 100
  - Quotes: single (`'component'`)
  - Semicolons: always required
- **CSS:** Disabled in Biome (Tailwind used exclusively)

**Linting:**
- **Python:** Ruff with enabled rules: E, W, F, I, N, UP, B, SIM, ASYNC
- **TypeScript:** Biome recommended rules

**Type Checking:**
- **Python:** Pyright in `standard` mode
- **TypeScript:** TSC in strict mode (no `any` types unless unavoidable)

## Import Organization

**Python:**
- Standard library imports first
- Third-party imports (`sqlalchemy`, `fastapi`, etc.)
- Local imports from `app` package
- Type hints at top with `from __future__ import annotations`
- Import pattern: `from uuid import UUID`, `from sqlalchemy import select`

Example order:
```python
from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.diagnosis.models import DiagnosisChatMessage
from app.ai.prompts import assemble_prompt
```

**TypeScript:**
- React/Next.js imports first
- Third-party libraries (`zod`, `zustand`)
- Internal imports from `@/` alias
- Type imports use `type` keyword: `import { type AiConfigRecord } from '@/lib/api'`

Example order:
```typescript
import { CircleHelp, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';
import { useDashboard } from '@/hooks/useDashboard';
```

**Path Aliases:**
- TypeScript: `@/` maps to `frontend/src/`
- Python: First-party is `app`, imported as `from app.modules...`

## Error Handling

**Python Patterns:**
- Use `HTTPException` from FastAPI for API errors
  - Pattern: `raise HTTPException(status_code=404, detail="Document not found")`
- Service layer raises exceptions, router layer converts to HTTP responses
- Async exceptions caught in try/except with `logger.warning()` or `logger.error()`
- Pattern: `except Exception as e: logger.warning("Failed to save parsed test case: %s", case_title)`
- All database queries with soft-delete filter: `.where(Model.deleted_at.is_(None))`

**TypeScript Patterns:**
- Custom `ApiError` class in `lib/api.ts` with `status` and `detail` properties
- Hooks use try/catch with `getApiErrorMessage(err, fallback)` helper
- Error state managed in component: `const [error, setError] = useState<string | null>(null)`
- Pattern in hooks:
  ```typescript
  try {
    // operation
  } catch (err) {
    setError(getApiErrorMessage(err, 'Default message'));
  }
  ```

## Logging

**Framework:** Python's standard `logging` module

**Logger Setup:**
- Each module: `logger = logging.getLogger(__name__)`
- Located at top of file after imports: `logger = logging.getLogger(__name__)`

**When to Log:**
- Info level: Completed operations (`"Diff 计算完成: diff_job_id=%s, changes=%d"`)
- Warning level: Recoverable errors, skipped items (`"Failed to save parsed test case: %s"`)
- Error level: Critical failures with `exc_info=True` (`logger.error("Failed", exc_info=True)`)

**Patterns:**
- Use `%s` placeholders with arguments: `logger.warning("Request failed: %s", error_msg)`
- Include context IDs: `logger.info("Task complete: task_id=%s", task_id)`
- Include exception info on errors: `except Exception as e: logger.error("...", exc_info=True)`

**Frontend:** No explicit logging framework; use `console.log()` sparingly for debugging only

## Comments

**When to Comment:**
- Complex business logic that's not obvious from code alone
- Non-obvious algorithm choices (e.g., "Myers Diff used for text-level changes")
- Explain the "why" not the "what"

**JSDoc/TSDoc:**
- Used minimally; prefer self-documenting code
- File-level documentation for modules: `/** Module purpose and usage notes */`
- Function documentation for public APIs only
- Example from `lib/api.ts`:
  ```typescript
  /**
   * Unified API client and module-specific API wrappers.
   *
   * Every hook / page should import from '@/lib/api' for consistency.
   */
  ```

**Python Docstrings:**
- Function docstrings for service methods:
  ```python
  async def persist_ai_response(self, report_id: UUID, ai_content: str) -> list[DiagnosisRisk]:
      """Persist assistant message and auto-parse test cases from AI output."""
  ```
- Brief one-liner, optionally with Args/Returns sections for complex signatures

## Function Design

**Size:** Keep functions focused; if >50 lines (Python) or >40 lines (TypeScript), consider refactoring

**Parameters:**
- Python: Prefer explicit named parameters over **kwargs
- Use type hints: `async def get_report(self, requirement_id: UUID) -> DiagnosisReport | None:`
- Dependency injection for database sessions: `session: AsyncSession` as parameter

**Return Values:**
- Python: Use union types: `DiagnosisReport | None`, `list[DiagnosisRisk]`
- Async generators yield with type hint: `async def run_stream(...) -> AsyncIterator[str]:`
- React hooks return objects with all state and callbacks together

**Async/Await:**
- All database operations are `async`: `async with get_async_session_context()`
- Router endpoints are `async def`: `async def create_session(...) -> dict:`
- Services take `AsyncSession` dependency: `class GenerationService: def __init__(self, session: AsyncSession)`

## Module Design

**Python Exports:**
- Modules use public class/function definitions; no explicit `__all__` needed
- Service classes are main exports: `from app.modules.diagnosis.service import DiagnosisService`
- Schemas are imported when needed: `from app.modules.diagnosis.schemas import DiagnosisRiskUpdate`

**Barrel Files:**
- Not used in Python (imports from specific modules)
- TypeScript uses barrel exports in `lib/api.ts` for public API types
- Example: `export { ApiError, api, getApiErrorMessage }`

**Module Structure (all modules follow):**
```
app/modules/<module_name>/
├── __init__.py
├── router.py        # FastAPI routes (no Prompt writing)
├── service.py       # Business logic (takes AsyncSession)
├── models.py        # SQLAlchemy ORM models
├── schemas.py       # Pydantic request/response schemas
```

## Service Layer Patterns

**Initialization:**
- Services accept single `session: AsyncSession` parameter
- Pattern: `class DiagnosisService: def __init__(self, session: AsyncSession) -> None: self.session = session`

**Query Pattern:**
- All queries construct SQLAlchemy select statements
- Always filter soft-deleted: `DiagnosisReport.deleted_at.is_(None)`
- Pattern:
  ```python
  q = select(DiagnosisReport).where(
      DiagnosisReport.requirement_id == requirement_id,
      DiagnosisReport.deleted_at.is_(None),
  )
  result = await self.session.execute(q)
  return result.scalar_one_or_none()
  ```

**Persistence:**
- Create: `self.session.add(obj)`, `await self.session.commit()`, `await self.session.refresh(obj)`
- Update: Modify object attributes, `await self.session.commit()`, `await self.session.refresh(obj)`
- Delete: Set `deleted_at`, commit (soft-delete only)

**Async Streams:**
- Streaming operations return `AsyncIterator[str]`
- Pattern: `return await get_thinking_stream_with_fallback(messages, system=..., provider=..., model=...)`

## React Hook Patterns

**State Management:**
- Use `useState` for local component state
- Use Zustand stores for global state: `const store = create<StateType>((set) => ({...}))`
- Hooks provide data fetching with loading/error states

**Hook Structure:**
```typescript
export function useFeature() {
  const [data, setData] = useState<Type | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get('/path');
      setData(result);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Default message'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
```

**Dependencies:**
- Use `useCallback` with dependency arrays
- Use `useEffect` only with empty `[]` for init or explicit `[dep]` for side effects

## Type Definitions

**Python:**
- Use `UUID` from `uuid` module for IDs
- Use `datetime` from Python stdlib for timestamps
- Pydantic models for validation: all request/response schemas inherit from `BaseSchema` or `BaseResponse`
- ORM models inherit from `BaseModel` (SQLAlchemy)

**TypeScript:**
- Define interfaces/types at top of file
- Component props interface: `ComponentNameProps`
- Use discriminated unions for state variants: `type Status = 'idle' | 'loading' | 'ok' | 'error'`

---

*Convention analysis: 2026-03-15*
