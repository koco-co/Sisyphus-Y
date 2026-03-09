# Sisyphus Case Platform - Complete Investigation Report

**Date**: March 2024  
**Scope**: Full E2E AI pipeline analysis for test planning  
**Status**: ✅ Complete

---

## Generated Documentation

This investigation has produced **3 comprehensive documents** saved to the project root:

### 1. **ARCHITECTURE_SUMMARY.md** (22 KB) - START HERE
**Best For**: Quick understanding of overall system design

Contains:
- Executive summary
- Technology stack overview
- Three-phase AI pipeline explanation
- Data flow architecture
- Critical files & responsibilities
- Common testing patterns
- Performance baseline
- Known limitations

### 2. **E2E_TESTING_QUICK_REFERENCE.md** (15 KB) - FOR TESTING
**Best For**: Hands-on testing and debugging

Contains:
- Key files & locations table
- Current AI configuration
- SSE event format specification
- Complete API endpoint reference (21 endpoints)
- Data model hierarchy diagram
- Infrastructure stack details
- 3 concrete testing scenarios
- 5 known issues & gotchas
- Debug commands
- Performance characteristics
- Testing priority checklist

### 3. **E2E_AI_PIPELINE_ANALYSIS.md** (968 KB) - DETAILED REFERENCE
**Best For**: Deep dive into specific components

Contains:
- 13 major sections with full implementation details
- `init.sh` stage-by-stage breakdown
- Backend AI configuration specs
- ZhiPu/OpenAI/Anthropic adapter details
- Diagnosis flow (6 endpoints, 3 models)
- Scene map flow (7 endpoints, 2 models)
- Generation flow (4 endpoints, 2 models)
- Products/requirements management
- Frontend SSE integration
- Docker compose service details
- Complete database models
- E2E workflow with 5-step pipeline
- Testing recommendations
- Implementation status checklist

---

## Key Findings Summary

### Architecture Overview

```
THREE-PHASE PIPELINE:
┌─────────────────┬──────────────────┬────────────────────┐
│   DIAGNOSIS     │   SCENE MAP      │   GENERATION       │
│  (Health Check) │  (Test Points)   │  (Test Cases)      │
└─────────────────┴──────────────────┴────────────────────┘

REQUIREMENT INPUT
    ↓
[Phase 1] AI identifies risks + missing scenarios
    ↓ (DiagnosisReport + DiagnosisRisks)
[Phase 2] User confirms test point groups
    ↓ (SceneMap with TestPoints)
[Phase 3] AI generates detailed test cases
    ↓ (GenerationSession with chat history)
EXECUTABLE TEST CASES OUTPUT
```

### Current AI Configuration

- **Active Provider**: ZhiPu GLM-4-Flash (国内服务)
- **API Key**: Configured in `.env`
- **Fallback Options**: OpenAI GPT-4o, Anthropic Claude
- **Streaming Format**: Server-Sent Events (SSE)
- **Integration**: Direct API calls (no LangChain)

### Data Model

- **Hierarchy**: Product → Iteration → Requirement → (Diagnosis, SceneMap, Generation, TestCases)
- **Relationships**: 10+ entities with FK relationships
- **Persistence**: Soft deletes (deleted_at timestamp)
- **Versioning**: Auto-snapshot on requirement updates

### Streaming Architecture

- **Frontend Hook**: `useSSEStream.ts` - parses SSE, accumulates events
- **State Management**: Zustand store - tracks thinking/content/streaming
- **Event Types**: `thinking` (AI thought process), `content` (response), `done` (completion)
- **Persistence**: User messages auto-saved, AI responses require manual save

### Infrastructure

- **Backend**: FastAPI (Python 3.12) + Uvicorn
- **Frontend**: Next.js 14 + Bun
- **Database**: PostgreSQL 16 (async via asyncpg)
- **Cache**: Redis 7
- **Vector DB**: Qdrant (configured but not actively used)
- **Storage**: MinIO (S3-compatible)
- **Containerization**: Docker Compose with 4 services

---

## Critical API Endpoints (21 Total)

### Diagnosis Pipeline (6)
```
POST   /api/diagnosis/{requirement_id}/create
POST   /api/diagnosis/{requirement_id}/run          [SSE Stream]
POST   /api/diagnosis/{requirement_id}/chat         [SSE Stream]
GET    /api/diagnosis/{requirement_id}
GET    /api/diagnosis/{requirement_id}/messages
PATCH  /api/diagnosis/{requirement_id}/risks/{risk_id}
```

### Scene Map Pipeline (7)
```
POST   /api/scene-map/{requirement_id}/generate     [SSE Stream]
GET    /api/scene-map/{requirement_id}
POST   /api/scene-map/{requirement_id}/test-points
PATCH  /api/scene-map/test-points/{test_point_id}
POST   /api/scene-map/test-points/{test_point_id}/confirm
DELETE /api/scene-map/test-points/{test_point_id}
POST   /api/scene-map/{requirement_id}/confirm
```

### Generation Pipeline (4)
```
POST   /api/generation/sessions
GET    /api/generation/sessions/by-requirement/{id}
GET    /api/generation/sessions/{session_id}/messages
POST   /api/generation/sessions/{session_id}/chat   [SSE Stream]
```

### Supporting (4)
```
GET    /api/products/
GET    /api/products/{id}/iterations
GET    /api/products/iterations/{id}/requirements
GET    /api/testcases/?requirement_id={id}
```

---

## Key Database Models (10 Primary)

1. **Product** - name, slug, description
2. **Iteration** - product_id, name, dates, status
3. **Requirement** - iteration_id, req_id, title, content_ast, version
4. **DiagnosisReport** - requirement_id, status, score, summary, risk counts
5. **DiagnosisRisk** - report_id, level, title, risk_status
6. **DiagnosisChatMessage** - report_id, role, content, round_num
7. **SceneMap** - requirement_id, status, confirmed_at
8. **TestPoint** - scene_map_id, group_name, title, priority, status, source
9. **GenerationSession** - requirement_id, mode, status, model_used
10. **GenerationMessage** - session_id, role, content, thinking_content, token_count

---

## Current Implementation Status

### ✅ Implemented & Working
- SSE streaming from backend to frontend
- Three AI system prompts (Diagnosis, SceneMap, Generation)
- AsyncIterator-based streaming without blocking
- ZhiPu integration with thread pooling
- Zustand state management on frontend
- SSE event parsing (thinking/content/done)
- RESTful CRUD for all entities
- Soft delete audit trail
- Async database (PostgreSQL + asyncpg)
- Docker infrastructure (Postgres, Redis, Qdrant, MinIO)
- Alembic migrations
- FastAPI auto-generated docs
- Requirement versioning with snapshots

### ⚠️ Partially Implemented
- AI output parsing (streams sent but not auto-persisted to DB)
- Error handling in SSE (limited recovery)
- Chat message persistence (user msg saved, AI response not auto-saved)
- RAG setup (Qdrant installed but integration code not visible)

### ❌ Not Yet Visible in Core Pipeline
- Batch generation
- Change diff engine
- Test execution integration
- Analytics dashboard
- Knowledge base integration
- Import/clean legacy data module

---

## File Organization

```
/Users/poco/Projects/Sisyphus-case-platform/

├── init.sh                           [7-stage setup script]
├── docker/docker-compose.yml         [4 services: PG, Redis, Qdrant, MinIO]
├── backend/
│   ├── app/
│   │   ├── main.py                   [37 routers loaded dynamically]
│   │   ├── core/
│   │   │   ├── config.py             [Settings from .env]
│   │   │   └── dependencies.py
│   │   ├── ai/
│   │   │   ├── stream_adapter.py     [3 LLM providers, SSE format]
│   │   │   └── prompts.py            [3 system prompts]
│   │   ├── shared/
│   │   │   └── base_model.py         [BaseModel: id, timestamps, soft delete]
│   │   └── modules/
│   │       ├── products/             [Product, Iteration, Requirement]
│   │       ├── diagnosis/            [Report, Risk, ChatMessage]
│   │       ├── scene_map/            [SceneMap, TestPoint]
│   │       ├── generation/           [Session, Message]
│   │       └── testcases/            [TestCase, Step, Version]
│   │           (each with: router.py, service.py, models.py, schemas.py)
│   └── alembic/                      [Database migrations]
│
├── frontend/
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useSSEStream.ts       [SSE parser + event handler]
│   │   ├── stores/
│   │   │   └── stream-store.ts       [Zustand state: thinking/content]
│   │   └── app/(main)/
│   │       ├── diagnosis/[id]/page.tsx
│   │       ├── scene-map/page.tsx
│   │       └── workbench/[id]/page.tsx
│   └── package.json                  [Bun package manager]
│
├── .env                              [LLM keys, DB URLs, storage creds]
├── .env.example                      [Template]
└── [New] INVESTIGATION DOCUMENTS:
    ├── ARCHITECTURE_SUMMARY.md       [← START HERE]
    ├── E2E_TESTING_QUICK_REFERENCE.md
    └── E2E_AI_PIPELINE_ANALYSIS.md
```

---

## Setup & Verification Steps

### 1. Initial Setup (Automated)
```bash
bash init.sh
# Installs: uv, bun, docker
# Sets up: database, migrations, seed data
# Starts: backend (8000), frontend (3000), celery
# Takes: ~3-5 minutes on first run
```

### 2. Verify Services
```bash
# All should return success:
curl http://localhost:8000/health              # {status: ok}
curl http://localhost:3000/                    # Frontend loads
curl http://localhost:8000/docs                # API docs
curl http://localhost:9001                     # MinIO (login as minioadmin/minioadmin)
```

### 3. Test Basic Workflow
```bash
# Via Swagger UI at http://localhost:8000/docs:
1. POST /products → create product
2. POST /products/{id}/iterations → create iteration
3. POST /products/iterations/{id}/requirements → create requirement
4. POST /diagnosis/{req_id}/run → observe SSE stream
5. POST /scene-map/{req_id}/generate → observe test point generation
```

### 4. Monitor Logs
```bash
# Backend
docker logs -f sisyphus_*_backend_1

# Frontend
cd frontend && tail -f ~/.bun/install/bun.log
```

---

## Testing Recommendations

### Priority 1: SSE Stream Integrity
- Verify all 3 endpoints (diagnosis/run, scene-map/generate, generation/chat) send proper SSE
- Confirm event order: thinking → content → done
- Check payload format: `event: TYPE\ndata: JSON\n\n`

### Priority 2: Frontend State Management
- Verify Zustand store transitions during stream
- Check chat UI renders thinking + content correctly
- Verify isStreaming flag behaves correctly

### Priority 3: Database Persistence
- Verify DiagnosisReport creates + updates
- Check TestPoint records can be created/confirmed
- Verify soft deletes work (deleted_at set)
- Check RequirementVersion snapshots on update

### Priority 4: End-to-End Workflow
- Full path: Product → Iteration → Requirement → Diagnosis → SceneMap → Generation
- Verify all DB records linked correctly
- Check frontend pages show correct data
- Validate that confirmed test points used in generation

### Priority 5: Error Scenarios
- Network interruption during stream
- Invalid requirement content
- Concurrent requests to same requirement
- Database constraint violations

---

## Known Gotchas

1. **ZhiPu Sync SDK in Async Context**: Wrapped with `asyncio.to_thread()` to avoid blocking. Different performance than OpenAI (native async).

2. **Chat Response Not Auto-Persisted**: When streaming `/diagnosis/{id}/chat`, user message saved but AI response must be manually saved by caller.

3. **Test Points Not Auto-Created**: Scene map generation streams suggestions but doesn't create TestPoint DB records.

4. **Thinking Phase Timing**: Frontend tracks `isThinkingDone` but doesn't visually distinguish thinking from content in UI.

5. **Single Concurrent Stream**: Zustand store assumes one stream at a time per user.

---

## Quick Reference: Most Important Files

| What | Where | Lines |
|------|-------|-------|
| Setup | `/init.sh` | 367 |
| Config | `backend/app/core/config.py` | 52 |
| Streaming | `backend/app/ai/stream_adapter.py` | 132 |
| Diagnosis | `backend/app/modules/diagnosis/service.py` | 128 |
| SceneMap | `backend/app/modules/scene_map/service.py` | 165 |
| Generation | `backend/app/modules/generation/service.py` | 123 |
| Frontend SSE | `frontend/src/hooks/useSSEStream.ts` | 53 |
| Frontend Store | `frontend/src/stores/stream-store.ts` | 38 |

---

## Next Actions for E2E Testing

### Immediate (Today)
- [ ] Read ARCHITECTURE_SUMMARY.md
- [ ] Run `bash init.sh` 
- [ ] Test basic endpoints via Swagger
- [ ] Observe SSE stream with curl

### Short Term (This Week)
- [ ] Write E2E test suite for 3 pipelines
- [ ] Test frontend integration (useSSEStream)
- [ ] Verify database persistence
- [ ] Document any deviations

### Medium Term (Next Sprint)
- [ ] Load test streaming performance
- [ ] Test error recovery scenarios
- [ ] Optimize token streaming rate
- [ ] Add missing message persistence

### Long Term (Roadmap)
- [ ] Implement auto-parsing of AI outputs
- [ ] Add batch generation
- [ ] Integrate execution feedback loop
- [ ] Build analytics dashboard

---

## Support & Resources

- **Full Technical Details**: See `E2E_AI_PIPELINE_ANALYSIS.md`
- **Testing Checklist**: See `E2E_TESTING_QUICK_REFERENCE.md`
- **API Documentation**: http://localhost:8000/docs (live Swagger UI)
- **GitHub Repository**: (link needed)
- **Architecture Diagrams**: Available in this project's `/docs` folder

---

**Report Generated**: March 2024  
**Investigation Scope**: Complete  
**Documentation Status**: ✅ Comprehensive

