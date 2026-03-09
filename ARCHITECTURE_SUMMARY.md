# Sisyphus Case Platform - Architecture Summary

## Executive Summary

**Sisyphus** is a comprehensive AI-driven test case generation platform that separates test design into two distinct phases:

1. **"What to Test?"** → Diagnosis → Scene Map (Test Points)
2. **"How to Test?"** → Generation (Test Case Steps)

The platform streams AI responses in real-time via SSE (Server-Sent Events), provides interactive chat refinement, and maintains complete audit trails with soft deletes.

---

## Technology Stack

### Backend
- **Framework**: FastAPI (async/await)
- **Python Version**: 3.12+
- **Package Manager**: uv
- **Database**: PostgreSQL 16 (async via asyncpg)
- **Cache**: Redis 7
- **Vector DB**: Qdrant (for RAG)
- **Object Storage**: MinIO (S3-compatible)
- **ORM**: SQLAlchemy 2.0 (async)
- **Migration**: Alembic
- **Async Task Queue**: Celery

### Frontend
- **Framework**: Next.js 14
- **Runtime**: Bun (package manager + runner)
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **HTTP Client**: fetch (with custom SSE parser)
- **Language**: TypeScript

### AI/LLM
- **Primary Provider**: ZhiPu GLM-4-Flash
- **Alternative Providers**: OpenAI GPT-4o, Anthropic Claude
- **Streaming Format**: SSE (Server-Sent Events)
- **Integration**: Direct API calls (no LangChain dependency)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Development Server**: Uvicorn (backend), Bun dev (frontend)
- **API Documentation**: FastAPI auto-generated at `/docs`

---

## Core Three-Phase AI Pipeline

### Phase 1: Diagnosis (Health Check)
```
Requirement
    ↓ (DIAGNOSIS_SYSTEM prompt)
AI Analysis (Thinking + Content streams)
    ↓
DiagnosisReport + DiagnosisRisks (persisted)
    ↓
Risk categories: high, medium, industry
```

**Key Endpoint**: `POST /api/diagnosis/{requirement_id}/run` (SSE)

**Output**: Identifies missing test scenarios, edge cases, security gaps, performance considerations

### Phase 2: Scene Map (Test Point Definition)
```
Requirement + Diagnosis insights
    ↓ (SCENE_MAP_SYSTEM prompt)
AI Test Point Extraction (streams suggestions)
    ↓
User confirms/edits/adds test points manually
    ↓
SceneMap (with status: draft → confirmed)
    ↓
Organized by: normal flow, exceptions, boundaries, concurrency, security
```

**Key Endpoint**: `POST /api/scene-map/{requirement_id}/generate` (SSE)

**Output**: Explicit test coverage plan approved by user before writing cases

### Phase 3: Generation (Test Case Steps)
```
Requirement + Confirmed Test Points
    ↓ (GENERATION_SYSTEM prompt)
AI Test Case Generation (interactive chat, streams content)
    ↓
User refines, adds, removes test cases
    ↓
TestCase + TestCaseSteps (persisted)
    ↓
Steps: action + expected_result pairs
```

**Key Endpoint**: `POST /api/generation/sessions/{session_id}/chat` (SSE)

**Output**: Detailed executable test cases (steps, preconditions, priorities)

---

## Data Flow Architecture

### Request → Response Cycle

```
Frontend (Next.js)
    ↓
HTTP POST to /api/[endpoint]
    ↓
FastAPI Router
    ↓
Service Layer (business logic)
    ↓
Streaming Generator (AsyncIterator)
    ↓
SSE Stream Response
    │
    ├→ event: thinking
    ├→ event: content
    ├→ event: done
    ↓
Frontend SSE Parser (useSSEStream hook)
    ↓
Zustand Store (thinkingText, contentText, isStreaming)
    ↓
React Component (re-renders on state change)
```

### Message Persistence

```
User sends message (POST /api/.../chat)
    ↓
Service saves user message immediately
    ↓
Service streams AI response (AsyncIterator)
    ↓
Frontend receives + displays content
    ↓
⚠️ AI response NOT auto-persisted (caller responsibility)
```

### Database Transaction

```
POST /api/diagnosis/{id}/run
    ↓
Check for existing DiagnosisReport (create if needed)
    ↓
Stream thinking + content from AI
    ↓
⚠️ Report NOT updated until completion (no auto-completion)
```

---

## Key Architectural Decisions

### 1. Explicit Phase Separation
- Users must explicitly confirm test points before generating cases
- Prevents waste of AI tokens on wrong direction
- Enables manual expert review and adjustment

### 2. Streaming Over Bulk
- SSE streams AI thinking + content separately
- Frontend displays real-time progress (thinking phase visible)
- Better UX for long-running operations (5-30s typical)

### 3. Synchronous Prompting Flow
- No message queue complexity initially
- Direct request → response with FastAPI
- Can add async Celery tasks later if needed

### 4. ZhiPu as Primary Provider
- Chinese LLM optimized for domestic services
- Better cost/performance for data platform scenarios
- OpenAI fallback available

### 5. Zustand for Frontend State
- Lightweight, no boilerplate
- Perfect for streaming state accumulation
- Clear separation: streaming state vs. app state

### 6. PostgreSQL + Soft Deletes
- All entities inherit BaseModel with deleted_at
- No hard deletes = audit trail preserved
- Query filters: `.where(Model.deleted_at.is_(None))`

---

## Critical Files & Responsibilities

### Configuration & Setup
| File | Responsibility |
|------|-----------------|
| `init.sh` | 7-stage environment setup (deps, ports, Docker, migrations) |
| `.env` | LLM provider keys, database URLs, storage credentials |
| `backend/app/core/config.py` | Settings class loading from .env |

### AI Core
| File | Responsibility |
|------|-----------------|
| `backend/app/ai/stream_adapter.py` | Unified streaming for 3 LLM providers + SSE formatting |
| `backend/app/ai/prompts.py` | System prompts for diagnosis/scene-map/generation |

### API Endpoints
| Module | Responsibility |
|--------|-----------------|
| `diagnosis/router.py` | 6 endpoints for diagnosis CRUD + streaming |
| `scene_map/router.py` | 7 endpoints for scene map + test point management |
| `generation/router.py` | 4 endpoints for session + chat streaming |
| `products/router.py` | CRUD for products, iterations, requirements |

### Business Logic
| Module | Responsibility |
|--------|-----------------|
| `diagnosis/service.py` | Report creation, risk queries, streaming logic |
| `scene_map/service.py` | Scene map CRUD, test point operations |
| `generation/service.py` | Session management, context building, streaming |
| `products/service.py` | Product/iteration/requirement CRUD with versioning |

### Frontend Integration
| File | Responsibility |
|------|-----------------|
| `useSSEStream.ts` | SSE parsing, event extraction, content accumulation |
| `stream-store.ts` | Zustand state for thinking/content/streaming |
| `diagnosis/[id]/page.tsx` | Diagnosis UI + risk display + chat |
| `scene-map/page.tsx` | Test point generation UI + confirmation workflow |
| `workbench/[id]/page.tsx` | Test case generation chat + case listing |

### Database
| File | Responsibility |
|------|-----------------|
| `shared/base_model.py` | BaseModel with id, created_at, updated_at, deleted_at |
| `diagnosis/models.py` | DiagnosisReport, DiagnosisRisk, DiagnosisChatMessage |
| `scene_map/models.py` | SceneMap, TestPoint |
| `generation/models.py` | GenerationSession, GenerationMessage |
| `products/models.py` | Product, Iteration, Requirement, RequirementVersion |
| `testcases/models.py` | TestCase, TestCaseStep, TestCaseVersion |

---

## Common Testing Patterns

### Create Full Workflow
```bash
# 1. Create product
POST /api/products
{"name": "Data Platform", "slug": "data-platform"}

# 2. Create iteration
POST /api/products/{product_id}/iterations
{"name": "Sprint 1", "start_date": "2024-03-01", "end_date": "2024-03-15"}

# 3. Create requirement
POST /api/products/iterations/{iteration_id}/requirements
{
  "req_id": "REQ-001",
  "title": "CSV Upload Feature",
  "content_ast": {"type": "doc", "content": [...]}
}

# 4. Run diagnosis (SSE)
POST /api/diagnosis/{requirement_id}/run

# 5. Generate scene map (SSE)
POST /api/scene-map/{requirement_id}/generate

# 6. Confirm test points
POST /api/scene-map/{requirement_id}/confirm

# 7. Create generation session
POST /api/generation/sessions
{"requirement_id": "...", "mode": "test_point_driven"}

# 8. Chat in generation (SSE)
POST /api/generation/sessions/{session_id}/chat
{"message": "Generate test cases for normal upload flow"}
```

### Inspect SSE Stream
```bash
# Use curl -N (--no-buffer) to see real-time events
curl -N -X POST http://localhost:8000/api/diagnosis/{id}/run

# Expected output (on separate lines):
# event: thinking
# data: {"delta": "正在分析需求..."}
# 
# event: thinking
# data: {"delta": "梳理测试场景..."}
# 
# event: content
# data: {"delta": "【正常流程】\n"}
```

### Debug Frontend State
```javascript
// In browser console after triggering stream:
import { useStreamStore } from '@/stores/stream-store';
const store = useStreamStore.getState();
console.log(store.thinkingText);    // AI thinking process
console.log(store.contentText);     // AI response
console.log(store.isStreaming);     // true during stream, false after
```

---

## Known Limitations & Future Work

### Current Limitations
1. **No auto-parsing**: AI outputs not automatically converted to DB records
2. **No error recovery**: Stream interruption not auto-retried
3. **No concurrent streams**: Single stream per user (Zustand store limitation)
4. **No RAG implementation**: Qdrant integrated but not actively used
5. **Limited history**: No long-context memory across sessions

### Planned Enhancements
1. **Auto-parsing pipeline**: Parse AI JSON outputs → create DB records
2. **Batch operations**: Generate multiple requirements simultaneously
3. **Diff engine**: Track requirement changes, update impact analysis
4. **Execution results**: Integrate test execution results → improve AI training
5. **Knowledge base**: Store historical test cases → RAG-enhanced generation
6. **Concurrency support**: Multi-stream UI, request queuing

---

## Performance Baseline

| Operation | Typical Duration | Note |
|-----------|------------------|------|
| Diagnosis stream | 5-15 seconds | Includes AI thinking |
| Scene map generation | 10-20 seconds | Test point extraction |
| Test case generation | 15-30 seconds | Per test point |
| First token latency | 2-3 seconds | ZhiPu API latency |
| Token streaming rate | ~50-100 tokens/second | Depends on network |

---

## Getting Started for E2E Testing

### 1. Run Setup
```bash
cd /Users/poco/Projects/Sisyphus-case-platform
bash init.sh
```

### 2. Access Services
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MinIO: http://localhost:9001 (minioadmin/minioadmin)

### 3. Create Test Data
```bash
# Quickest path: use /docs UI to:
# 1. POST /products
# 2. POST /products/{id}/iterations
# 3. POST /products/iterations/{id}/requirements
```

### 4. Test Streaming
```bash
# After creating requirement with ID {req_id}:
curl -N -X POST http://localhost:8000/api/diagnosis/{req_id}/run
```

### 5. Monitor Logs
```bash
docker logs -f sisyphus_*_backend_1
```

---

## Reference Documents

- **Full Analysis**: `E2E_AI_PIPELINE_ANALYSIS.md` (968 lines)
- **Quick Reference**: `E2E_TESTING_QUICK_REFERENCE.md` (endpoints, data model, debug commands)
- **API Documentation**: http://localhost:8000/docs (auto-generated from code)

---

Generated: March 2024
Platform Version: v1.3.0
