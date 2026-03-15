# External Integrations

**Analysis Date:** 2026-03-15

## APIs & External Services

**LLM Providers:**

- **Aliyun Dashscope (Default)** - Main LLM provider for test case generation
  - Model: `qwen-max` (configurable, default for complex reasoning)
  - SDK: `openai` (OpenAI-compatible protocol)
  - Auth: `DASHSCOPE_API_KEY`
  - Endpoint: `https://dashscope.aliyuncs.com/compatible-mode/v1`
  - Implementation: `backend/app/ai/llm_client.py::_invoke_dashscope()`
  - Use case: High-quality test case CoT generation

- **Zhipu GLM (Primary/Fallback)** - Diagnostic engine and Socratic questioning
  - Model: `glm-5` (configurable, default for diagnostic)
  - SDK: `zhipuai` (native API)
  - Auth: `ZHIPU_API_KEY`
  - Implementation: `backend/app/ai/llm_client.py::_invoke_zhipu()`
  - Use case: Requirement analysis, diagnostic chatbot, follow-up questions
  - Fallback chain: If Dashscope fails, automatically retries with Zhipu

- **OpenAI (Optional)** - Compatible with gpt-4o and gpt-4-turbo
  - Model: `gpt-4o` (configurable)
  - SDK: `openai` (AsyncOpenAI)
  - Auth: `OPENAI_API_KEY`
  - Implementation: `backend/app/ai/llm_client.py::_invoke_openai()`
  - Use case: Development/testing alternative, advanced reasoning if configured
  - Note: Proxy disabled (`trust_env=False`) for reliable operation

- **Ollama (Optional Local)** - Local model server (not yet integrated)
  - Base URL: `http://localhost:11434` (configurable)
  - Auth: None required

**Stream Adapter:**
- File: `backend/app/ai/stream_adapter.py`
- Supports SSE (Server-Sent Events) for real-time streaming
- Fallback: Non-streaming providers chunked and emitted as SSE
- Heartbeat: Every 15s keepalive message to prevent timeouts
- Stall timeout: 8s without content triggers fallback
- Stream timeout: 5 minutes max per request

**LLM Call Pattern:**
- Retry logic: Up to 2 retries per provider with exponential backoff (1s, 2s)
- Fallback: Primary → Fallback provider chain
- Error handling: `invoke_llm()` in `backend/app/ai/llm_client.py`

## Data Storage

**Databases:**

- **PostgreSQL 15+** (Primary)
  - Connection: `DATABASE_URL` (async via asyncpg)
  - Sync connection: `DATABASE_URL_SYNC` (for Alembic migrations)
  - ORM: SQLAlchemy 2.0+ with async/await
  - Pool: NullPool in tests, connection pooling in production
  - Persistence: All AI-generated results (chat, test points, test cases)
  - Tables: Models defined in `backend/app/modules/*/models.py`

**Vector Database:**

- **Qdrant 1.12+** - Semantic search for RAG
  - Connection: `QDRANT_URL` (http://localhost:6333)
  - Collections:
    - `knowledge_chunks` - Knowledge base document embeddings
    - `historical_testcases` - Historical test case similarity index
  - Embedding dimension: 1024 (via custom embedder)
  - Distance metric: Cosine similarity
  - Client: `qdrant-client` (lazy initialized)
  - Implementation: `backend/app/engine/rag/retriever.py`
  - Features:
    - Automatic collection creation on first use
    - Metadata filtering by doc_id, product
    - Score threshold: 0.72 minimum similarity (configurable)

**Cache:**

- **Redis 7+**
  - Cache connection: `REDIS_URL` (redis://localhost:6379/0)
  - Task broker: `CELERY_BROKER_URL` (redis://localhost:6379/1)
  - Client: `redis.asyncio.Redis`
  - Max connections: 20
  - Response decode: UTF-8
  - Implementation: `backend/app/core/redis_client.py` (lazy singleton)
  - Used for: Session caching, rate limiting, task queue

**File Storage:**

- **MinIO (S3-compatible)**
  - Endpoint: `MINIO_ENDPOINT` (localhost:9000 in dev)
  - Access key: `MINIO_ACCESS_KEY`
  - Secret key: `MINIO_SECRET_KEY`
  - Default bucket: `MINIO_BUCKET` (sisyphus)
  - Client: `minio.Minio`
  - Implementation: `backend/app/core/minio_client.py`
  - Secure: `False` in dev (enable in production)
  - Use case: Document uploads, parsed file storage, test case exports

## Authentication & Identity

**Auth Provider:**

- **Custom JWT** (stateless)
  - Secret: `JWT_SECRET_KEY`
  - Algorithm: `HS256`
  - Token expiry: `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (30 min default)
  - Password hashing: bcrypt (via `passlib`)
  - Implementation: `backend/app/core/security.py`
  - Methods:
    - `create_access_token()` - Generate JWT
    - `verify_password()` - Check plain password against bcrypt hash
    - `get_password_hash()` - Hash password on signup
  - Bearer token header: `Authorization: Bearer <token>`
  - No OAuth/OIDC integration currently

## Monitoring & Observability

**Error Tracking:**
- Not integrated (no Sentry/Datadog configured)
- Local logging via Python `logging` module

**Logs:**
- Framework: Python standard `logging` module
- Configuration: `backend/app/core/logging.py`
- Format: Structured (dependent on handler config)
- Levels: DEBUG (when `APP_DEBUG=true`), INFO, WARNING, ERROR
- File rotation: Not configured in provided code

## CI/CD & Deployment

**Hosting:**
- Docker containerization via `docker/Dockerfile.backend`
- Docker Compose orchestration for local development
- Production compose: `docker/docker-compose.prod.yml`

**CI Pipeline:**
- Not configured (no GitHub Actions / GitLab CI visible)
- Pre-commit: Tools available (ruff, biome, pyright)

**Local Development:**
- Script: `./init.sh` (one-command startup)
- Services: PostgreSQL, Redis, Qdrant, MinIO (docker-compose up)

## Environment Configuration

**Required env vars (Backend):**
- `LLM_PROVIDER` - Primary provider (dashscope | zhipu | openai)
- `DASHSCOPE_API_KEY` - Aliyun Dashscope API key
- `DASHSCOPE_MODEL` - Model name (qwen-plus, qwen-max)
- `DASHSCOPE_BASE_URL` - API endpoint URL
- `ZHIPU_API_KEY` - Zhipu GLM API key
- `ZHIPU_MODEL` - Model name (glm-4-flash, glm-5)
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `OPENAI_MODEL` - Model name (gpt-4o, etc.)
- `DATABASE_URL` - Async PostgreSQL connection string (asyncpg driver)
- `DATABASE_URL_SYNC` - Sync PostgreSQL connection string (for Alembic)
- `REDIS_URL` - Redis connection (cache)
- `CELERY_BROKER_URL` - Redis connection (task queue)
- `QDRANT_URL` - Vector database endpoint
- `MINIO_ENDPOINT` - Object storage endpoint
- `MINIO_ACCESS_KEY` - MinIO credentials
- `MINIO_SECRET_KEY` - MinIO credentials
- `MINIO_BUCKET` - Default bucket name
- `JWT_SECRET_KEY` - Secret for JWT signing
- `JWT_ALGORITHM` - JWT algorithm (HS256)
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` - Token lifetime
- `APP_ENV` - Environment (development | production | test)
- `APP_DEBUG` - Debug mode (true | false)

**Secrets location:**
- Environment variables via `.env` file (development)
- In production: Docker secrets or external secret manager (recommended)
- `.env` is gitignored, never committed

**Optional env vars:**
- `OLLAMA_BASE_URL` - Local model server (not yet wired)

## Webhooks & Callbacks

**Incoming:**
- Not detected in current implementation

**Outgoing:**
- Not detected in current implementation

**Async Tasks (Celery):**
- Framework: Celery 5.4+
- Broker: Redis (CELERY_BROKER_URL)
- Implementation: `backend/app/core/celery_app.py`
- Queue-based for long-running operations (e.g., document processing, test case batch generation)

## Document Parsing

**File Format Support:**
- DOCX (python-docx)
- PDF (pypdf + optional PaddleOCR for images)
- Markdown (markdown)
- Excel (openpyxl)
- XMind (xmindparser)
- Image OCR: PaddleOCR (optional, lazy-loaded)
- Implementation: `backend/app/engine/uda/` (Universal Document Adapter)

## Vector Embeddings

**Embedder:**
- File: `backend/app/engine/rag/embedder.py`
- Dimension: 1024 vectors
- Model: Determined by provider (likely included in Dashscope/ZhiPu APIs or external service)
- Implementation: Async via `embed_texts()`, `embed_query()`
- Used by: RAG retriever for knowledge base and historical test case similarity

---

*Integration audit: 2026-03-15*
