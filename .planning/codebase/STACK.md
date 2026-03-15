# Technology Stack

**Analysis Date:** 2026-03-15

## Languages

**Primary:**
- Python 3.12+ - Backend API, AI engines, data processing
- TypeScript 5.x - Frontend React application
- SQL - PostgreSQL database queries

**Secondary:**
- JavaScript - Build scripts, dev dependencies
- YAML - Configuration (docker-compose, alembic)
- Markdown - Documentation

## Runtime

**Environment:**
- Python 3.12 (backend, enforced in `pyproject.toml`)
- Node.js with Bun 1.x (frontend package manager)
- PostgreSQL 16-alpine (Docker)
- Redis 7-alpine (Docker)

**Package Manager:**

**Backend:**
- `uv` (Python package manager, replaces pip/poetry)
- Lockfile: `backend/uv.lock` (committed to version control)

**Frontend:**
- `bun` (JavaScript/TypeScript package manager, replaces npm/yarn)
- Lockfile: `frontend/bun.lock` (committed to version control)

## Frameworks

**Core:**
- FastAPI 0.115+ - RESTful API framework (Python async)
- Next.js 16.1.6 - React App Router framework (TypeScript)
- React 19.2.3 - UI component library
- SQLAlchemy 2.0+ - ORM with async support (asyncpg driver)

**Testing:**
- pytest 8.3+ - Python unit test runner
- pytest-asyncio 0.24+ - Async test support (mode: `auto`)
- pytest-cov 6.0+ - Coverage reporting

**Build/Dev:**
- Uvicorn 0.34+ - ASGI server with `--reload` hot reload
- Alembic 1.14+ - Database schema migrations
- Ruff 0.8+ - Python linter/formatter
- Biome 2.4.6+ - JavaScript/TypeScript linter/formatter
- Pyright 1.1+ - Python static type checker (mode: `standard`)
- TailwindCSS 4.x - Utility CSS framework
- PostCSS 4.x - CSS processing pipeline

## Key Dependencies

**Critical (Backend):**
- `asyncpg>=0.30` - PostgreSQL async driver
- `pydantic-settings>=2.7` - Environment config management
- `python-jose[cryptography]>=3.3` - JWT token handling
- `passlib[bcrypt]>=1.7` - Password hashing (bcrypt)
- `celery[redis]>=5.4` - Async task queue with Redis broker
- `redis>=5.2` - Redis client
- `httpx>=0.28` - Async HTTP client
- `minio>=7.2` - MinIO S3-compatible object storage client
- `qdrant-client>=1.12` - Vector database client (semantic search)

**AI/LLM (Backend):**
- `zhipuai>=2.1.5.20250825` - Zhipu GLM API client (primary: diagnosis/QA)
- `openai>=2.26.0` - OpenAI API client (compatible with multiple providers)
- `python-docx>=1.1` - DOCX document parsing
- `pypdf>=5.0` - PDF text extraction
- `markdown>=3.5` - Markdown processing
- `openpyxl>=3.1` - Excel file parsing
- `xmindparser>=1.2.2` - XMind file parsing
- **LangChain/LangGraph** - Noted in CLAUDE.md but not directly listed in pyproject.toml (may be implemented via custom abstractions)

**Frontend:**
- `@dnd-kit/core^6.3.1` - Drag-and-drop library (core)
- `@dnd-kit/sortable^8.0.0` - Drag-and-drop sortable lists
- `@hookform/resolvers^5.0.1` - Form validation resolvers (Zod integration)
- `@tanstack/react-query^5.90.21` - Server state management (HTTP caching)
- `react-hook-form^7.56.4` - Form state management
- `react-markdown^10.1.0` - Markdown rendering in UI
- `recharts^3.8.0` - Charting library (dashboard analytics)
- `zod^3.25.67` - Runtime schema validation (TypeScript)
- `zustand^5.0.11` - Lightweight state management
- `sonner^2.0.3` - Toast notifications
- `lucide-react^0.577.0` - Icon library (replaces emoji)
- `nprogress^0.2.0` - Progress bar
- `next-themes^0.4.6` - Theme/dark mode support
- `html2canvas^1.4.1` - HTML to canvas/image conversion (export)

## Configuration

**Environment:**
- `.env` file at project root (loads via Pydantic `BaseSettings`)
- `.env.example` - Template with required variables
- Configuration class: `backend/app/core/config.py` (Settings)
- Path aliases for TypeScript: `@/*` → `frontend/src/*`

**Build:**
- `frontend/next.config.ts` - Next.js config with API rewrites to backend
- `frontend/tsconfig.json` - TypeScript compiler options (strict mode)
- `backend/pyproject.toml` - Project metadata and dependencies (PEP 621)
  - Line length: 120 (ruff)
  - Lint rules: E, W, F, I, N, UP, B, SIM, ASYNC
  - Ignore: Long prompt strings in `app/ai/prompts.py`
- `backend/app/core/logging.py` - Centralized logging configuration

**Database:**
- Alembic migrations: `backend/alembic/versions/`
- Migration command: `uv run alembic upgrade head`
- Async session management: `async_sessionmaker` with lazy initialization (`lru_cache`)

## Platform Requirements

**Development:**
- Python 3.12+ (exact version enforcement)
- Node.js 18+ (for Bun compatibility)
- Docker (for local PostgreSQL, Redis, Qdrant, MinIO)
- Docker Compose 1.29+

**Production:**
- Docker container deployment
- Python 3.12+ runtime
- Reverse proxy (nginx/Caddy recommended for Next.js)
- Environment variables: LLM credentials, DB URL, MinIO creds, Qdrant URL, Redis URL, JWT secret

**Infrastructure Dependencies:**
- PostgreSQL 15+ (async with asyncpg)
- Redis 7+ (caching, task queue broker)
- Qdrant 1.12+ (vector database for RAG)
- MinIO (S3-compatible object storage)

---

*Stack analysis: 2026-03-15*
