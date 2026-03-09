# E2E AI Pipeline Testing - Quick Reference

## Key Files & Locations

| Component | Path | Key Files |
|-----------|------|-----------|
| **Initialization** | / | `init.sh` (7-stage setup) |
| **Config** | `backend/app/core/` | `config.py` (Settings class) |
| **AI Streaming** | `backend/app/ai/` | `stream_adapter.py`, `prompts.py` |
| **Diagnosis** | `backend/app/modules/diagnosis/` | `service.py`, `router.py`, `models.py` |
| **Scene Map** | `backend/app/modules/scene_map/` | `service.py`, `router.py`, `models.py` |
| **Generation** | `backend/app/modules/generation/` | `service.py`, `router.py`, `models.py` |
| **Products** | `backend/app/modules/products/` | `service.py`, `models.py` |
| **Frontend Hooks** | `frontend/src/hooks/` | `useSSEStream.ts` |
| **Frontend Store** | `frontend/src/stores/` | `stream-store.ts` (Zustand) |
| **Frontend Pages** | `frontend/src/app/(main)/` | `diagnosis/[id]/page.tsx`, `scene-map/page.tsx`, `workbench/[id]/page.tsx` |
| **Docker** | `docker/` | `docker-compose.yml` |
| **Database** | `backend/app/shared/` | `base_model.py` (BaseModel with timestamps + soft delete) |

## Current AI Configuration

**Active Provider**: ZhiPu GLM-4-Flash
```
LLM_PROVIDER=zhipu
ZHIPU_API_KEY=8a0e9badd00244b39932c49ebc780e48.Ic4UuSFAuEOUEssM
ZHIPU_MODEL=glm-4-flash
```

**Alternative Providers**:
- OpenAI GPT-4o (requires API key)
- Anthropic Claude (with extended thinking)
- Ollama (local, requires setup)

## SSE Event Format

All streaming endpoints return events:
```
event: thinking
data: {"delta": "正在分析需求..."}

event: thinking
data: {"delta": "梳理测试场景..."}

event: content
data: {"delta": "【正常流程】\n"}

event: content
data: {"delta": "- 用户上传文件...\n"}

event: done
data: {"usage": {}}
```

**Frontend Parsing** (`useSSEStream.ts`):
- Split by `\n\n` (message boundaries)
- Extract `event:` and `data:` via regex
- Accumulate thinking events → contentText via Zustand store
- Event types: `thinking`, `content`, `done`

## Core API Endpoints

### Diagnosis Pipeline
```
POST   /api/diagnosis/{requirement_id}/create     # Create report
POST   /api/diagnosis/{requirement_id}/run        # SSE streaming diagnosis
POST   /api/diagnosis/{requirement_id}/chat       # SSE interactive chat
GET    /api/diagnosis/{requirement_id}            # Get report with risks
GET    /api/diagnosis/{requirement_id}/messages   # Chat history
PATCH  /api/diagnosis/{requirement_id}/risks/{risk_id}  # Update risk status
```

### Scene Map Pipeline
```
POST   /api/scene-map/{requirement_id}/generate   # SSE generate test points
GET    /api/scene-map/{requirement_id}            # Get scene map with points
POST   /api/scene-map/{requirement_id}/test-points       # Create test point
PATCH  /api/scene-map/test-points/{test_point_id}      # Update test point
POST   /api/scene-map/test-points/{test_point_id}/confirm # Confirm point
DELETE /api/scene-map/test-points/{test_point_id}      # Delete point
POST   /api/scene-map/{requirement_id}/confirm   # Confirm all points
```

### Generation Pipeline
```
POST   /api/generation/sessions                   # Create gen session
GET    /api/generation/sessions/by-requirement/{id} # List sessions
GET    /api/generation/sessions/{session_id}/messages # Chat history
POST   /api/generation/sessions/{session_id}/chat    # SSE chat in session
```

### Supporting Endpoints
```
GET    /api/products/                             # List products
GET    /api/products/{id}/iterations              # List iterations
GET    /api/products/iterations/{id}/requirements # List requirements
POST   /api/testcases/                            # Create test case
GET    /api/testcases/?requirement_id={id}        # List test cases
```

## Data Model Hierarchy

```
Product (name, slug, description)
  └─ Iteration (name, start_date, end_date, status)
      └─ Requirement (req_id, title, content_ast, version)
          ├─ DiagnosisReport (status, overall_score, summary)
          │  ├─ DiagnosisRisk (level, title, description, risk_status)
          │  └─ DiagnosisChatMessage (role, content, round_num)
          │
          ├─ SceneMap (status, confirmed_at)
          │  └─ TestPoint (group_name, title, priority, status, source)
          │
          ├─ GenerationSession (mode, status, model_used)
          │  └─ GenerationMessage (role, content, thinking_content, token_count)
          │
          ├─ TestCase (title, priority, case_type, status, source)
          │  ├─ TestCaseStep (step_num, action, expected_result)
          │  └─ TestCaseVersion (version, snapshot, change_reason)
          │
          └─ RequirementVersion (version, content_ast, change_summary)
```

## Infrastructure Stack

### Docker Services (via docker-compose.yml)
| Service | Port | Purpose | Volume |
|---------|------|---------|--------|
| PostgreSQL 16 | 5432 | Primary data store | sisyphus_postgres_data |
| Redis 7 | 6379 | Caching/sessions | sisyphus_redis_data |
| Qdrant | 6333 | Vector DB for RAG | sisyphus_qdrant_data |
| MinIO | 9000/9001 | S3-compatible storage | sisyphus_minio_data |

### Development Servers
| Server | Port | Command |
|--------|------|---------|
| Backend API | 8000 | `uvicorn app.main:app --reload` |
| Frontend | 3000 | `bun dev` |
| Celery Worker | async | `celery -A app.worker.celery_app worker` |

## Testing Scenarios

### 1. Basic Streaming Test
```bash
# Create a requirement first, then:
curl -N -X POST http://localhost:8000/api/diagnosis/{req_id}/run \
  -H "Accept: text/event-stream"

# Expect SSE events:
# event: thinking
# data: {"delta": "正在分析..."}
```

### 2. End-to-End Test
```
1. Create Product
2. Create Iteration
3. Create Requirement with content_ast
4. POST /api/diagnosis/{req_id}/run → verify events arrive
5. POST /api/scene-map/{req_id}/generate → verify test points stream
6. POST /api/scene-map/{req_id}/test-points → create test point manually
7. POST /api/generation/sessions → create session
8. POST /api/generation/sessions/{session_id}/chat → verify generation
```

### 3. Frontend Integration Test
```javascript
// In browser console on http://localhost:3000/diagnosis/[id]:
const streamStore = useStreamStore.getState();
console.log(streamStore.thinkingText);  // Should have thinking content
console.log(streamStore.contentText);   // Should have AI response
console.log(streamStore.isStreaming);   // Should be false when done
```

## Known Issues & Gotchas

1. **Chat Response Not Auto-Persisted**: When AI streams response in `/diagnosis/{id}/chat`, the AI message is NOT automatically saved to DB. Only user message is persisted.

2. **Test Points Not Auto-Created**: Scene map generation streams suggestions but doesn't create TestPoint records. User must manually create via POST.

3. **Thinking Phase Timing**: Frontend tracks `isThinkingDone` but doesn't distinctly display it. Both thinking + content display consecutively.

4. **Error Recovery**: If stream aborts, no automatic retry. Frontend should implement reconnection logic.

5. **ZhiPu Sync SDK**: Wrapped in `asyncio.to_thread()` to avoid blocking event loop. OpenAI uses native async, causing different performance profiles.

## Performance Characteristics

| Operation | Expected Duration | Limiting Factor |
|-----------|-------------------|-----------------|
| Diagnosis stream | 5-15s | AI response time |
| Scene map generation | 10-20s | Test point extraction complexity |
| Test case generation | 15-30s | Number of test points × complexity |
| First stream event | 2-3s | LLM API latency + network |
| Subsequent events | ~100ms | Token rate × network |

## Debug Commands

```bash
# Check backend health
curl http://localhost:8000/health

# View API docs
open http://localhost:8000/docs

# Check all modules loaded
curl http://localhost:8000/docs | grep -o '"paths":.*"}'

# Stream events (raw)
curl -N -X POST http://localhost:8000/api/diagnosis/{id}/run

# Check database
docker exec sisyphus_<project>_postgres_1 psql -U postgres -d sisyphus -c "SELECT * FROM requirements LIMIT 1;"

# View container logs
docker logs sisyphus_<project>_backend_1
```

## Next Steps for E2E Testing

### Priority 1: Verify Core Pipeline
- [ ] Confirm SSE events format matches frontend expectations
- [ ] Test all three streaming endpoints (diagnosis, scene-map, generation)
- [ ] Verify database records created after each phase
- [ ] Check frontend state management during streaming

### Priority 2: Integration Testing
- [ ] Full workflow: requirement → diagnosis → scene-map → generation
- [ ] Risk identification accuracy
- [ ] Test point coverage analysis
- [ ] Chat history persistence

### Priority 3: Error Handling
- [ ] Network interruption recovery
- [ ] Invalid AI responses handling
- [ ] Database constraint violations
- [ ] Concurrent requests behavior

### Priority 4: Performance Testing
- [ ] Stream latency measurement
- [ ] Memory usage during large generations
- [ ] Database query optimization
- [ ] Frontend rendering performance with large datasets

