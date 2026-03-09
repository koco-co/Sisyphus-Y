# Sisyphus Case Platform - Complete E2E AI Pipeline Analysis

## Overview
Sisyphus is an **AI-driven enterprise test case generation platform** specialized for complex systems like data platforms, data lakes, and real-time computing. It separates test design into two phases: **"what to test" (test points/scene maps)** and **"how to test" (test case steps)**.

---

# 1. INIT.sh - Setup Flow

The `init.sh` script performs 7 critical setup stages:

### Stage 1: Dependency Installation
- Installs **uv** (Python package manager) if missing
- Installs **bun** (JavaScript runtime) if missing  
- Verifies **docker** and **docker compose** availability
- Auto-restarts Docker Desktop on macOS if needed

### Stage 2: Port Clearing
Kills any processes on these ports:
- 5432 (PostgreSQL)
- 6379 (Redis)
- 6333 (Qdrant)
- 9000-9001 (MinIO)
- 8000 (Backend API)
- 3000 (Frontend)

### Stage 3: Environment Setup
- Copies `.env.example` → `.env` if missing
- Loads configuration from `.env`

### Stage 4: Backend & Frontend Dependencies
- Runs `uv sync --all-extras` in backend/
- Runs `bun install` in frontend/

### Stage 5: Docker Infrastructure Start
- Pulls images: `postgres:16-alpine`, `redis:7-alpine`, `qdrant/qdrant:latest`, `minio/minio:latest`
- Creates unique project name: `sisyphus_<timestamp>_<pid>`
- Waits for PostgreSQL ready (60 retries)
- Waits for Redis ready (30 retries)

### Stage 6: Database Initialization
- Runs Alembic migrations: `alembic upgrade head`
- Auto-generates initial schema if no migrations exist
- Seeds database with `scripts/seed.py`

### Stage 7: Development Servers
- **Backend**: `uvicorn app.main:app --reload --port 8000`
- **Celery worker**: For async tasks
- **Frontend**: `bun dev` (port 3000)
- Waits for backend health check at `/health`

**Result**: Full local dev environment ready at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MinIO UI: http://localhost:9001

---

# 2. Backend AI Configuration

## Location: `/backend/app/core/config.py`

```python
class Settings:
    # LLM Provider Selection (from .env)
    llm_provider: str = "zhipu"  # Options: zhipu, openai, anthropic
    
    # ZhiPu Configuration
    zhipu_api_key: str = ""
    zhipu_model: str = "glm-4-flash"
    
    # OpenAI Configuration
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    
    # Ollama (Local)
    ollama_base_url: str = "http://localhost:11434"
    
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sisyphus"
    database_url_sync: str = "postgresql://postgres:postgres@localhost:5432/sisyphus"
    
    # Redis (for caching/sessions)
    redis_url: str = "redis://localhost:6379/0"
    
    # Qdrant (vector database for RAG)
    qdrant_url: str = "http://localhost:6333"
    
    # MinIO (S3-compatible storage)
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "sisyphus"
    
    # JWT Authentication
    jwt_secret_key: str = "change-me-in-production"
    jwt_access_token_expire_minutes: int = 30
```

## Current .env Configuration
```
LLM_PROVIDER=zhipu
ZHIPU_API_KEY=8a0e9badd00244b39932c49ebc780e48.Ic4UuSFAuEOUEssM
ZHIPU_MODEL=glm-4-flash
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/sisyphus
REDIS_URL=redis://localhost:6379/0
QDRANT_URL=http://localhost:6333
```

**Currently Active**: ZhiPu GLM-4-Flash model

---

# 3. AI Streaming Adapter

## Location: `/backend/app/ai/stream_adapter.py`

Unified streaming adapter supporting 3 providers with SSE (Server-Sent Events) format.

### SSE Format
```
event: thinking\ndata: {"delta": "..."}\n\n
event: content\ndata: {"delta": "..."}\n\n
event: done\ndata: {"usage": {...}}\n\n
```

### Supported Providers

#### 1. **ZhiPu GLM** (Currently Used)
```python
async def zhipu_thinking_stream(
    messages: list[dict],
    system: str = ""
) -> AsyncIterator[str]:
    # Uses synchronous ZhipuAI SDK wrapped in asyncio.to_thread()
    # Bypasses system SOCKS proxy (domestic service)
    # Returns stream of SSE events
```

#### 2. **OpenAI**
```python
async def openai_thinking_stream(
    messages: list[dict],
    system: str = ""
) -> AsyncIterator[str]:
    # Uses AsyncOpenAI for native async streaming
    # Supports GPT-4o model
```

#### 3. **Claude Anthropic**
```python
async def anthropic_thinking_stream(
    messages: list[dict],
    system: str = ""
) -> AsyncIterator[str]:
    # Extended thinking support with budget_tokens
    # Separates thinking_delta from text_delta
```

### Main Entry Point
```python
async def get_thinking_stream(
    messages: list[dict],
    system: str = ""
) -> AsyncIterator[str]:
    # Routes to appropriate adapter based on settings.llm_provider
```

---

# 4. AI System Prompts

## Location: `/backend/app/ai/prompts.py`

### DIAGNOSIS_SYSTEM
Used for requirement health diagnosis phase. Instructs AI to:
- Identify missing test scenarios
- Find edge cases and boundary conditions
- Analyze concurrency and performance scenarios
- Check permission and security aspects
- Ensure data consistency testing
- Apply industry best practices

### SCENE_MAP_SYSTEM
Used for test point analysis. Instructs AI to:
- Generate comprehensive test point list
- Include: group, title, description, priority, estimated case count
- Organize by: normal flow, exception scenarios, boundary values, concurrent scenarios, security

### GENERATION_SYSTEM
Used for test case generation. Instructs AI to:
- Generate detailed test cases from test points
- Include: title, priority (P0/P1/P2), preconditions, steps with expected results
- Support multiple case types: normal/exception/boundary/concurrent

---

# 5. Diagnosis Flow (SSE Streaming)

## Endpoints

### GET `/api/diagnosis/{requirement_id}`
Returns diagnosis report with associated risks.

```python
@router.get("/{requirement_id}", response_model=DiagnosisReportResponse)
async def get_diagnosis(requirement_id: UUID, session: AsyncSessionDep)
```

**Response**:
```json
{
  "id": "uuid",
  "requirement_id": "uuid",
  "status": "running|completed",
  "overall_score": 0-100,
  "summary": "string",
  "risk_count_high": 0,
  "risk_count_medium": 0,
  "risks": [
    {
      "id": "uuid",
      "level": "high|medium|industry",
      "title": "Risk title",
      "description": "Details",
      "risk_status": "pending|acknowledged|resolved"
    }
  ]
}
```

### POST `/api/diagnosis/{requirement_id}/run` (SSE Stream)
Initiates AI diagnosis of requirement.

**Flow**:
1. Fetches Requirement by ID
2. Extracts title and content_ast (JSON)
3. Creates system prompt + user message
4. Calls `get_thinking_stream()` → returns AsyncIterator[str]
5. Streams SSE events to client

### POST `/api/diagnosis/{requirement_id}/chat` (SSE Stream)
Interactive chat during diagnosis.

**Request**:
```json
{"message": "Follow-up question or comment"}
```

**Flow**:
1. Retrieves existing DiagnosisChatMessage history
2. Builds message context with full chat history
3. Streams response via `get_thinking_stream()`
4. **NOTE**: Response is streamed but NOT automatically persisted to DB

### GET `/api/diagnosis/{requirement_id}/messages`
Retrieves all chat messages for a diagnosis report.

### PATCH `/api/diagnosis/{requirement_id}/risks/{risk_id}`
Updates risk status (for tracking acknowledged/resolved risks).

## Database Models

### DiagnosisReport
```python
requirement_id: UUID (FK→requirements.id)
status: str ("running", "completed")
overall_score: float | None
summary: str | None
risk_count_high: int
risk_count_medium: int
risk_count_industry: int
created_at: datetime
updated_at: datetime
deleted_at: datetime | None
```

### DiagnosisRisk
```python
report_id: UUID (FK→diagnosis_reports.id)
level: str ("high", "medium", "industry")
title: str
description: str | None
risk_status: str ("pending", "acknowledged", "resolved")
```

### DiagnosisChatMessage
```python
report_id: UUID (FK→diagnosis_reports.id)
role: str ("user", "assistant")
content: str
round_num: int (default 1)
```

---

# 6. Scene Map Flow (Test Point Generation)

## Endpoints

### GET `/api/scene-map/{requirement_id}`
Retrieves scene map with all test points.

**Response**:
```json
{
  "id": "uuid",
  "requirement_id": "uuid",
  "status": "draft|confirmed",
  "confirmed_at": "2024-03-09T10:00:00Z",
  "test_points": [
    {
      "id": "uuid",
      "group_name": "Normal Flow",
      "title": "Test point title",
      "description": "Details",
      "priority": "P0|P1|P2",
      "status": "ai_generated|confirmed",
      "estimated_cases": 3,
      "source": "ai|user_added"
    }
  ]
}
```

### POST `/api/scene-map/{requirement_id}/generate` (SSE Stream)
AI generates test points from requirement.

**Flow**:
1. Creates/retrieves SceneMap
2. Fetches Requirement content
3. Prompts with SCENE_MAP_SYSTEM
4. Streams AI response via SSE
5. **NOTE**: Test points not auto-created from stream; caller must parse and POST individually

**Example Stream Output**:
```
【正常流程】
- 用户成功上传CSV文件，系统正确解析...
- 用户可查看上传进度和历史记录...

【异常场景】
- 上传文件格式错误时返回友好提示...
```

### POST `/api/scene-map/{requirement_id}/test-points`
Manually create a test point.

**Request**:
```json
{
  "group_name": "string",
  "title": "string",
  "description": "string | null",
  "priority": "P0|P1|P2",
  "estimated_cases": int,
  "source": "ai|user_added"
}
```

### PATCH `/api/scene-map/test-points/{test_point_id}`
Update test point details.

### POST `/api/scene-map/test-points/{test_point_id}/confirm`
Confirms a test point (changes status from `ai_generated` → `confirmed`).

### DELETE `/api/scene-map/test-points/{test_point_id}`
Soft-deletes test point.

### POST `/api/scene-map/{requirement_id}/confirm`
Confirms all test points in a scene map at once.

## Database Models

### SceneMap
```python
requirement_id: UUID (FK→requirements.id, unique)
status: str ("draft", "confirmed")
confirmed_at: datetime | None
```

### TestPoint
```python
scene_map_id: UUID (FK→scene_maps.id)
group_name: str (50 char max)
title: str (full text)
description: str | None
priority: str ("P0", "P1", "P2")
status: str ("ai_generated", "confirmed")
estimated_cases: int
source: str ("ai", "user_added")
```

---

# 7. Generation Flow (Test Case Creation)

## Endpoints

### POST `/api/generation/sessions`
Create a new generation session.

**Request**:
```json
{
  "requirement_id": "uuid",
  "mode": "test_point_driven|exploratory|template_based|batch"
}
```

**Response**:
```json
{
  "id": "uuid",
  "requirement_id": "uuid",
  "mode": "test_point_driven",
  "status": "active"
}
```

### GET `/api/generation/sessions/by-requirement/{requirement_id}`
List all generation sessions for a requirement.

### GET `/api/generation/sessions/{session_id}/messages`
Retrieve chat history for a session.

**Response**:
```json
[
  {
    "id": "uuid",
    "role": "user|assistant",
    "content": "string",
    "thinking_content": "string | null",
    "created_at": "2024-03-09T10:00:00Z"
  }
]
```

### POST `/api/generation/sessions/{session_id}/chat` (SSE Stream)
Send message to generation session.

**Request**:
```json
{"message": "Generate test cases for the login function"}
```

**Flow**:
1. Retrieves GenerationSession
2. Builds context:
   - Requirement title + content_ast
   - Associated test points (if from scene_map)
3. Loads full chat history
4. Sends user message with context
5. Streams AI response via SSE
6. **Persists user message to DB before streaming**

## Database Models

### GenerationSession
```python
requirement_id: UUID (FK→requirements.id)
mode: str ("test_point_driven", "exploratory", "template_based", "batch")
status: str ("active", "completed", "archived")
model_used: str ("glm-4-flash", "gpt-4o", etc.)
```

### GenerationMessage
```python
session_id: UUID (FK→generation_sessions.id)
role: str ("user", "assistant")
content: str (full message)
thinking_content: str | None (AI thinking process)
token_count: int
```

---

# 8. Products & Requirements Management

## Endpoints

### Products
- `POST /api/products/` - Create product
- `GET /api/products/` - List products
- `GET /api/products/{id}` - Get product details
- `PATCH /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Soft delete

### Iterations
- `POST /api/products/{id}/iterations` - Create iteration
- `GET /api/products/{id}/iterations` - List iterations
- `PATCH /api/iterations/{id}` - Update
- `DELETE /api/iterations/{id}` - Soft delete

### Requirements
- `POST /api/products/iterations/{iteration_id}/requirements` - Create requirement
- `GET /api/products/iterations/{iteration_id}/requirements` - List by iteration
- `GET /api/products/{product_id}/requirements` - List by product
- `PATCH /api/requirements/{id}` - Update requirement
- `DELETE /api/requirements/{id}` - Soft delete

## Database Models

### Product
```python
name: str (100 char)
slug: str (50 char, unique)
description: str | None
```

### Iteration
```python
product_id: UUID (FK)
name: str (100 char)
start_date: date | None
end_date: date | None
status: str ("active", "completed", "archived")
```

### Requirement
```python
iteration_id: UUID (FK)
req_id: str (50 char, unique) # e.g., "REQ-001"
title: str
content_ast: dict (JSONB) # Parsed requirement document
frontmatter: dict | None (JSONB) # Metadata
status: str ("draft", "published", "archived")
version: int (auto-incremented on updates)
```

### RequirementVersion
Automatic snapshots created before updates.
```python
requirement_id: UUID (FK)
version: int
content_ast: dict (JSONB)
change_summary: str | None
```

---

# 9. Frontend API Integration

## Architecture

### Locations
- **Hooks**: `/frontend/src/hooks/useSSEStream.ts`
- **Store**: `/frontend/src/stores/stream-store.ts`
- **Pages**: 
  - `/frontend/src/app/(main)/diagnosis/page.tsx` - Diagnosis list
  - `/frontend/src/app/(main)/diagnosis/[id]/page.tsx` - Diagnosis detail with chat
  - `/frontend/src/app/(main)/scene-map/page.tsx` - Scene map builder
  - `/frontend/src/app/(main)/workbench/page.tsx` - Test case generation
  - `/frontend/src/app/(main)/workbench/[id]/page.tsx` - Generation detail with chat

### SSE Stream Hook

**File**: `/frontend/src/hooks/useSSEStream.ts`

```typescript
export function useSSEStream() {
  const { reset, appendThinking, appendContent, setDone } = useStreamStore();

  async function streamSSE(path: string, body: object) {
    reset(); // Clear previous stream state
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        setDone();
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      // Parse SSE messages (format: "event: type\ndata: {...}\n\n")
      const messages = buffer.split('\n\n');
      buffer = messages.pop() ?? '';

      for (const msg of messages) {
        const eventMatch = msg.match(/^event: (\w+)/m);
        const dataMatch = msg.match(/^data: (.+)/m);
        if (!eventMatch || !dataMatch) continue;

        const eventType = eventMatch[1];
        try {
          const payload = JSON.parse(dataMatch[1]);
          if (eventType === 'thinking') appendThinking(payload.delta ?? '');
          else if (eventType === 'content') appendContent(payload.delta ?? '');
          else if (eventType === 'done') setDone();
        } catch {
          /* ignore parse errors */
        }
      }
    }
  }

  return { streamSSE };
}
```

### Stream State Store

**File**: `/frontend/src/stores/stream-store.ts`

```typescript
interface StreamState {
  thinkingText: string;       // AI thinking process
  contentText: string;        // AI response content
  isStreaming: boolean;       // Currently receiving stream
  isThinkingDone: boolean;    // Thinking phase complete
  reset: () => void;
  appendThinking: (delta: string) => void;
  appendContent: (delta: string) => void;
  setDone: () => void;
}
```

**State Transitions**:
1. `reset()` - Clear all text, set isStreaming=false
2. Receive "thinking" events - Append to thinkingText, set isStreaming=true
3. Receive "content" events - Append to contentText, set isThinkingDone=true
4. Receive "done" event - Set isStreaming=false

## Page: Diagnosis Detail (`diagnosis/[id]/page.tsx`)

**Features**:
- Left panel: Risk list by severity (high/medium/industry)
- Center: Chat interface with streaming content
- Right: Scene map preview

**API Calls**:
```typescript
GET /api/diagnosis/{id}                 // Get report with risks
POST /api/diagnosis/{id}/run            // Start SSE diagnosis stream
POST /api/diagnosis/{id}/chat           // Send chat message + SSE
GET /api/diagnosis/{id}/messages        // Retrieve chat history
PATCH /api/diagnosis/{id}/risks/{riskId} // Update risk status
GET /api/scene-map/{id}                 // Get associated scene map
```

**SSE Usage**:
```typescript
async function runDiagnosis() {
  await streamSSE(`/diagnosis/${id}/run`, {});
  // contentText now contains AI diagnosis
}

async function sendMessage() {
  const msg = input.trim();
  setInput('');
  setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: msg }]);
  await streamSSE(`/diagnosis/${id}/chat`, { message: msg });
  // AI response in contentText
  if (contentText) {
    setMessages((prev) => [...prev, { role: 'ai', content: contentText }]);
  }
}
```

## Page: Scene Map (`scene-map/page.tsx`)

**Features**:
- Left: Product → Iteration → Requirement tree
- Center: Test point generation with progress steps
- Right: Scene tree preview

**Progress Steps**:
1. Requirement parsing
2. Test point extraction
3. Scene grouping
4. Confirmation complete

**API Calls**:
```typescript
GET /api/products/                              // List products
GET /api/products/{productId}/iterations        // List iterations
GET /api/products/iterations/{iterationId}/requirements // List requirements
POST /api/scene-map/{requirementId}/generate    // SSE stream generation
GET /api/scene-map/{requirementId}/test-points  // Get test points list
POST /api/scene-map/test-points/{pointId}/confirm // Confirm point
DELETE /api/scene-map/test-points/{pointId}    // Delete point
POST /api/scene-map/{requirementId}/confirm     // Confirm all
```

**SSE Usage**:
```typescript
const generateTestPoints = async () => {
  const res = await fetch(`${API}/scene-map/${selectedReqId}/generate`, { method: "POST" });
  const reader = res.body?.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");
    
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        if (data.delta) {
          fullOutput += data.delta;
          setStreamOutput(fullOutput);
        }
      }
    }
  }
  
  // After generation complete, fetch test points
  const tpRes = await fetch(`${API}/scene-map/${selectedReqId}/test-points`);
  const tpData = await tpRes.json();
  setTestPoints(Array.isArray(tpData) ? tpData : []);
};
```

## Page: Workbench (Test Case Generation)

**Features**:
- Left: Product → Iteration → Requirement tree
- Center: Generation chat interface with modes
- Right: Test cases list

**Generation Modes**:
- `test_point_driven` - Use confirmed test points
- `exploratory` - Free-form exploration
- `template_based` - Based on templates
- `batch` - Batch generate multiple cases

**API Calls**:
```typescript
POST /api/generation/sessions                    // Create session
GET /api/generation/sessions/by-requirement/{id} // List sessions
POST /api/generation/sessions/{sessionId}/chat   // Send message + SSE
GET /api/generation/sessions/{sessionId}/messages // Chat history
GET /api/testcases/?requirement_id={id}          // List test cases
```

---

# 10. Docker Compose Infrastructure

## Location: `/docker/docker-compose.yml`

### Services

#### 1. PostgreSQL 16
```yaml
image: postgres:16-alpine
port: 5432
database: sisyphus
user: postgres
password: postgres
volume: sisyphus_postgres_data (persistent)
healthcheck: pg_isready
```

#### 2. Redis 7
```yaml
image: redis:7-alpine
port: 6379
volume: sisyphus_redis_data (persistent)
healthcheck: redis-cli ping
```

#### 3. Qdrant (Vector Database)
```yaml
image: qdrant/qdrant:latest
ports: 6333 (API), 6334 (gRPC)
volume: sisyphus_qdrant_data (persistent)
healthcheck: curl http://localhost:6333/readyz
```

#### 4. MinIO (S3-Compatible Storage)
```yaml
image: minio/minio:latest
command: server /data --console-address ":9001"
ports: 9000 (API), 9001 (console)
credentials: minioadmin / minioadmin
volume: sisyphus_minio_data (persistent)
healthcheck: curl http://localhost:9000/minio/health/live
```

### Volume Strategy
- Fixed volume names ensure data persists across runs
- Names: `sisyphus_postgres_data`, `sisyphus_redis_data`, `sisyphus_qdrant_data`, `sisyphus_minio_data`
- Not tied to compose project name (unique per run)

---

# 11. Core Database Models Summary

## Entity Relationship Diagram

```
products (1)
    ↓ (has many)
iterations (1)
    ↓ (has many)
requirements (1)
    ├→ diagnosis_reports (1) [requirement_id]
    │  ├→ diagnosis_risks (many)
    │  └→ diagnosis_chat_messages (many)
    │
    ├→ scene_maps (1) [requirement_id, unique]
    │  └→ test_points (many) [scene_map_id]
    │
    ├→ generation_sessions (many) [requirement_id]
    │  └→ generation_messages (many) [session_id]
    │
    ├→ test_cases (many) [requirement_id]
    │  ├→ test_case_steps (many)
    │  └→ test_case_versions (many)
    │
    └→ requirement_versions (many) [requirement_id]
```

## Key Timestamps & Soft Delete
All models inherit from `BaseModel`:
```python
class BaseModel:
    id: UUID (primary key)
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None (soft delete)
```

---

# 12. E2E AI Pipeline - Complete Flow

## Happy Path Workflow

```
1. REQUIREMENT CREATION
   POST /api/products/iterations/{iterationId}/requirements
   → Creates Requirement with content_ast (JSON)

2. DIAGNOSIS (Health Check)
   POST /api/diagnosis/{requirementId}/run [SSE]
   ↓
   Backend: requirement → DIAGNOSIS_SYSTEM prompt → ZhiPu GLM-4-Flash
   ↓
   Frontend: Streams thinking → content via useSSEStream hook
   ↓
   DiagnosisReport created, risks identified (high/medium/industry)

3. SCENE MAP (Test Points)
   POST /api/scene-map/{requirementId}/generate [SSE]
   ↓
   Backend: requirement → SCENE_MAP_SYSTEM prompt → ZhiPu
   ↓
   Frontend: Streams test point suggestions
   ↓
   User manually creates TestPoints via POST /api/scene-map/{id}/test-points
   User confirms via POST /api/scene-map/{id}/confirm

4. GENERATION (Test Cases)
   POST /api/generation/sessions [Create session]
   ↓
   POST /api/generation/sessions/{sessionId}/chat [SSE]
   ↓
   Backend: requirement + test_points → GENERATION_SYSTEM → ZhiPu
   ↓
   Frontend: Streams test case suggestions
   ↓
   (Optional) User creates TestCase via POST /api/testcases
   (Optional) User refines via continued chat

5. REVIEW & CONFIRMATION
   GET /api/diagnosis/{id}
   GET /api/scene-map/{id}
   GET /api/generation/sessions/{id}/messages
   ↓
   Risks marked as resolved
   Test points confirmed
   Test cases reviewed
```

## Current Implementation Status

### ✅ Implemented
- **Core SSE streaming** from backend to frontend
- **ZhiPu AI integration** with system prompts
- **Three AI pipelines**: Diagnosis, Scene Map, Generation
- **Database models** for all entities
- **RESTful API endpoints** for CRUD operations
- **Frontend state management** with Zustand
- **Chat history persistence** in DB
- **Soft delete** across all entities
- **Docker infrastructure** (Postgres, Redis, Qdrant, MinIO)

### ⚠️ Partially Implemented / To Verify
- **Auto-parsing AI outputs** - Generation stream currently not auto-creating TestPoints
- **Error handling** in SSE streaming - Limited error recovery
- **Message persistence** - Chat responses from streaming not auto-saved
- **RAG integration** - Qdrant configured but usage not visible
- **Test execution feedback** - Execution module exists but integration unclear

### ❓ Not Yet Implemented
- **Import/clean module** - Data import from legacy systems
- **Coverage matrix** - Requirement coverage visualization
- **Diff & impact analysis** - Change impact tracking
- **Execution module** - Running test cases
- **Analytics dashboard** - Result aggregation
- **Celery async tasks** - Background processing

---

# 13. Testing Recommendations for E2E AI Pipeline

## Phase 1: SSE Streaming Verification
```bash
# Test diagnosis streaming
curl -N -H "Accept: text/event-stream" \
  -X POST http://localhost:8000/api/diagnosis/{requirement_id}/run
# Verify: events arrive as "event: thinking\ndata: {...}\n\n"

# Test scene map streaming
curl -N -X POST http://localhost:8000/api/scene-map/{requirement_id}/generate

# Test generation streaming
curl -N -X POST http://localhost:8000/api/generation/sessions/{session_id}/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate test cases"}'
```

## Phase 2: Frontend SSE Handling
- Verify stream events parse correctly in useSSEStream hook
- Check Zustand store updates (thinkingText → contentText transition)
- Verify chat bubbles render streaming content
- Test UI responsiveness during streaming

## Phase 3: Database Persistence
- Verify DiagnosisReport creates successfully
- Check DiagnosisChatMessage saves (user input)
- Verify GenerationMessage saves with role+content
- Check TestPoint creation from manual POST
- Verify soft deletes (deleted_at set, not removed)

## Phase 4: AI Quality
- Test DIAGNOSIS_SYSTEM prompt → verify risks identified
- Test SCENE_MAP_SYSTEM → verify test point structure
- Test GENERATION_SYSTEM → verify case format (steps + expected results)
- Compare results with manual baseline

## Phase 5: End-to-End Integration
1. Create requirement → Verify in DB
2. Run diagnosis → Check report + risks
3. Generate scene map → Confirm test points
4. Create generation session → Chat with AI
5. Verify all records linked correctly

---

