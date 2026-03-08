# Project Scaffold Design

Date: 2026-03-08

## Overview

Sisyphus-case-platform full project scaffolding: backend (FastAPI + DDD modules), frontend (Next.js 14 App Router), toolchain, CI/CD, and development environment setup.

## Key Decisions

| Dimension | Decision |
|---|---|
| Backend architecture | FastAPI + DDD modular, 21 business modules (M00-M21) |
| Frontend architecture | Next.js 14 App Router, pages aligned with backend modules |
| Python environment | uv, Python 3.12 |
| Code quality | ruff (lint/format) + pyright (type check) + Biome (frontend) |
| Package management | backend: uv, frontend: bun |
| Database migration | Alembic |
| Testing | pytest + pytest-asyncio |
| CI | 3 workflows: backend, frontend, docs |
| init.sh | One-click: check deps -> install -> Docker -> migrate -> seed -> start dev servers |

## Root Structure

```
Sisyphus-case-platform/
├── backend/                    # Python backend (FastAPI + uv)
├── frontend/                   # Next.js 14 frontend (bun)
├── docs/                       # Project documentation
│   ├── plans/                  # Design docs & implementation plans
│   ├── api/                    # API documentation
│   └── architecture/           # Architecture Decision Records (ADR)
├── tests/                      # E2E / cross-service integration tests
├── .github/
│   └── workflows/
│       ├── ci-backend.yml      # ruff + pyright + pytest
│       ├── ci-frontend.yml     # biome check + tsc + build
│       └── ci-docs.yml         # MD file change detection + lint
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── Dockerfile.backend
├── CLAUDE.md
├── CHANGELOG.md
├── README.md
├── init.sh
├── .gitignore
└── .editorconfig
```

## Backend Structure (DDD Modular)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── core/                       # Global infrastructure
│   │   ├── config.py               # pydantic-settings
│   │   ├── database.py             # SQLAlchemy async engine & session
│   │   ├── security.py             # JWT + RBAC
│   │   ├── dependencies.py         # Common DI (get_db, get_current_user)
│   │   ├── exceptions.py           # Global exception handlers
│   │   └── middleware.py           # Request logging, CORS
│   │
│   ├── shared/                     # Cross-module shared
│   │   ├── base_model.py           # SQLAlchemy Base + common fields
│   │   ├── base_schema.py          # Pydantic common schemas
│   │   ├── pagination.py           # Pagination utilities
│   │   └── enums.py                # Global enums
│   │
│   ├── modules/                    # Business modules (DDD)
│   │   ├── auth/                   # Authentication & permissions
│   │   ├── products/               # M00: Product/Iteration/Requirement
│   │   ├── uda/                    # M01: Universal Document Abstraction
│   │   ├── import_clean/           # M02: Historical data import & cleanup
│   │   ├── diagnosis/              # M03: Requirement health diagnosis
│   │   ├── scene_map/              # M04: Test point & scene map
│   │   ├── generation/             # M05: Test case generation
│   │   ├── testcases/              # M06: Test case management
│   │   ├── diff/                   # M07: Requirement Diff & impact
│   │   ├── coverage/               # M08: Coverage matrix
│   │   ├── test_plan/              # M09: Iteration test plan
│   │   ├── templates/              # M10: Test case templates
│   │   ├── knowledge/              # M11: Knowledge base
│   │   ├── export/                 # M12: Export & integration
│   │   ├── execution/              # M13: Execution result feedback
│   │   ├── analytics/              # M14: Quality analytics
│   │   ├── notification/           # M16: Notification system
│   │   ├── search/                 # M17: Global search
│   │   ├── collaboration/          # M18: Collaboration (comments, mentions)
│   │   ├── dashboard/              # M19: Dashboard
│   │   ├── audit/                  # M20: Audit log
│   │   └── recycle/                # M21: Recycle bin (soft delete)
│   │
│   └── worker/                     # Celery async tasks
│       ├── celery_app.py
│       └── tasks/
│
├── alembic/
├── tests/
│   ├── conftest.py
│   ├── unit/
│   └── integration/
├── scripts/seed.py
├── pyproject.toml
└── uv.lock
```

Each business module contains: `router.py`, `models.py`, `schemas.py`, `service.py`, optionally `dependencies.py`.

## Frontend Structure

```
frontend/src/
├── app/                        # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                # Dashboard
│   ├── (auth)/                 # Auth pages (route group)
│   ├── (main)/                 # Main layout (sidebar + header)
│   │   ├── products/
│   │   ├── iterations/
│   │   ├── requirements/
│   │   ├── diagnosis/
│   │   ├── scene-map/
│   │   ├── workbench/
│   │   ├── testcases/
│   │   ├── diff/
│   │   ├── coverage/
│   │   ├── knowledge/
│   │   ├── analytics/
│   │   └── settings/
│   └── api/                    # BFF proxy
├── components/
│   ├── ui/
│   ├── layout/
│   ├── editor/
│   ├── scene-map/
│   └── diff-viewer/
├── hooks/
├── lib/
├── stores/
└── types/
```

## Configuration Files

- `backend/pyproject.toml`: uv project config + ruff + pyright + pytest
- `frontend/biome.json`: Biome lint + format config
- `.editorconfig`: Cross-editor formatting (py=4 spaces, ts/json/md=2 spaces)

## README Updates

New modules to add: M16 (Notification), M17 (Search), M18 (Collaboration), M19 (Dashboard), M20 (Audit), M21 (Recycle Bin).

Tech stack updates: uv, ruff, pyright, Biome, bun. Python version unified to 3.12+.

New data models: `audit_logs`, `notifications` tables. All tables add `deleted_at` for soft delete.

## init.sh Flow

1. Check dependencies (uv, bun, docker, docker compose)
2. Install: `uv sync` + `bun install`
3. Copy `.env.example` to `.env` if missing
4. Start Docker infrastructure (postgres, redis, qdrant, minio)
5. Wait for health checks
6. Run Alembic migrations + seed data
7. Start backend (uvicorn + celery) in background
8. Start frontend (bun dev) in foreground
