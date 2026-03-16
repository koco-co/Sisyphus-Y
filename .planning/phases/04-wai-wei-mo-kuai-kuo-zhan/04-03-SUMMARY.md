---
phase: 04-wai-wei-mo-kuai-kuo-zhan
plan: "03"
subsystem: api
tags: [qdrant, fastapi, pydantic, knowledge-base, rag, vector-search]

# Dependency graph
requires:
  - phase: 04-wai-wei-mo-kuai-kuo-zhan
    plan: "01"
    provides: "RAG 基础设施 + KnowledgeDocument 模型 + 向量化 pipeline"
provides:
  - "scroll_by_doc_id: Qdrant scroll 分页检索（按 doc_id 过滤）"
  - "GET /knowledge/{id}/chunks: 分块预览端点（limit=50, token_count, 500字符截断）"
  - "POST /knowledge/manual: 手动条目创建（entry_type=manual, 立即向量化）"
  - "POST /knowledge/{id}/new-version: 版本管理（MAX_VERSIONS=3, soft-delete 最旧）"
  - "ManualEntryCreate schema + KNOWLEDGE_CATEGORIES Literal（4固定分类）"
affects:
  - "04-wai-wei-mo-kuai-kuo-zhan Wave 2 前端知识库页面（KB-01~04）"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Qdrant scroll API 用于分页检索，bypass 语义搜索直接按 payload 字段过滤"
    - "Pydantic Literal 类型约束 category 枚举（非 Python Enum，更轻量）"
    - "版本管理 MAX_VERSIONS 类常量，upload_new_version 原子管理活跃标记+软删除"

key-files:
  created: []
  modified:
    - "backend/app/engine/rag/retriever.py - 新增 scroll_by_doc_id 异步函数"
    - "backend/app/modules/knowledge/schemas.py - 新增 ManualEntryCreate, ChunkItem, ChunksResponse, KNOWLEDGE_CATEGORIES"
    - "backend/app/modules/knowledge/service.py - 新增 create_manual_entry, upload_new_version, MAX_VERSIONS"
    - "backend/app/modules/knowledge/router.py - 新增 /chunks, /manual, /{id}/new-version 端点"
    - "backend/tests/unit/test_knowledge/test_chunks.py - 分块预览测试（已有，无改动）"
    - "backend/tests/unit/test_knowledge/test_manual_entry.py - 修复 category 默认值为有效值"
    - "backend/tests/unit/test_knowledge/test_version_limit.py - 修复 mock 策略避免 SQLAlchemy 冲突"

key-decisions:
  - "scroll_by_doc_id 在 retriever 层返回完整 content，500字符截断在 router 层处理（关注点分离）"
  - "KNOWLEDGE_CATEGORIES 使用 Literal 而非 Python Enum，Pydantic v2 验证错误信息更清晰"
  - "upload_new_version 版本查询按 version 升序，index[0] 即最旧版本，逻辑简洁"
  - "测试中 patch.object(svc, 'get_document') 而非 patch KnowledgeDocument 类，避免 SQLAlchemy select() 接收 MagicMock 的 ArgumentError"

patterns-established:
  - "分块预览模式：Qdrant scroll -> retriever 层返回完整数据 -> router 层截断/格式化 -> 返回 {items, total}"
  - "版本管理模式：查所有同 title 版本 -> 全设 is_active=False -> 超限则 soft-delete oldest + delete_by_doc_id -> 创建新版本 is_active=True"

requirements-completed: [KB-01, KB-02, KB-03, KB-04]

# Metrics
duration: 7min
completed: 2026-03-16
---

# Phase 4 Plan 03: 知识库后端补全 Summary

**Qdrant scroll_by_doc_id + 分块预览 API + 手动条目创建 + 三版本限额管理，四固定分类 enum 标准化**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-16T05:49:52Z
- **Completed:** 2026-03-16T05:57:41Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- 新增 `scroll_by_doc_id` 函数，使用 Qdrant scroll API 按 doc_id payload 过滤，支持 limit/offset 分页
- 新增 GET `/knowledge/{id}/chunks` 端点，返回分块列表（含 index、500字符截断 content、token_count 粗估）
- 新增 POST `/knowledge/manual` 端点，创建 `entry_type=manual` 手动条目并立即向量化（chunk_count=1）
- 新增 POST `/knowledge/{id}/new-version` 端点，实现版本限额（MAX_VERSIONS=3）：超限时软删除最旧版本并清除 Qdrant 向量
- 标准化 `ManualEntryCreate.category` 为 Pydantic Literal 四固定分类，非法值在 schema 层即拦截

## Task Commits

每个任务独立提交：

1. **Task 1: scroll_by_doc_id + 分块预览端点** - `173bfdd` (feat)
2. **Task 2: 手动条目创建 + 版本管理限额 + 分类 enum** - `3523000` (feat)

## Files Created/Modified
- `backend/app/engine/rag/retriever.py` - 新增 `scroll_by_doc_id` 异步函数（Qdrant scroll API，异常安全降级返回 []）
- `backend/app/modules/knowledge/schemas.py` - 新增 `ManualEntryCreate`, `ChunkItem`, `ChunksResponse`, `KNOWLEDGE_CATEGORIES` Literal
- `backend/app/modules/knowledge/service.py` - 新增 `MAX_VERSIONS=3`, `create_manual_entry()`, `upload_new_version()`
- `backend/app/modules/knowledge/router.py` - 新增三个端点：`GET /{id}/chunks`, `POST /manual`, `POST /{id}/new-version`（路由注册顺序正确）
- `backend/tests/unit/test_knowledge/test_manual_entry.py` - 修复 category 默认值 `standard` -> `enterprise_standard`
- `backend/tests/unit/test_knowledge/test_version_limit.py` - 重写 mock 策略，使用 `patch.object(svc, 'get_document')` 规避 SQLAlchemy 冲突

## Decisions Made
- `scroll_by_doc_id` 在 retriever 层返回完整 content，500字符截断在 router 层处理，关注点分离
- 使用 Pydantic `Literal` 约束 category 枚举（而非 Python `Enum`），验证错误信息更精确
- `upload_new_version` 版本查询按 version ASC，`index[0]` 即最旧版本，无需额外排序逻辑
- 测试策略：`patch.object(svc, 'get_document')` 而非 patch `KnowledgeDocument` 类，避免 SQLAlchemy 的 `select(MockClass)` ArgumentError

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 修复测试辅助函数使用无效 category 值**
- **Found during:** Task 2（运行 RED 测试时）
- **Issue:** `test_manual_entry.py` 的 `_make_manual_entry_create()` 默认 `category="standard"`，但 `ManualEntryCreate` schema 已定义 4 个固定值 Literal，`"standard"` 不在其中
- **Fix:** 将默认值改为 `"enterprise_standard"`（有效分类值）
- **Files modified:** `tests/unit/test_knowledge/test_manual_entry.py`
- **Verification:** 3 个手动条目测试全部 PASS
- **Committed in:** 3523000（Task 2 commit）

**2. [Rule 1 - Bug] 修复版本限额测试 mock 策略**
- **Found during:** Task 2（GREEN 阶段测试失败）
- **Issue:** `test_version_limit.py` patch 了 `KnowledgeDocument` 类，但 `upload_new_version` 内部有 `select(KnowledgeDocument)` 调用，SQLAlchemy 无法处理 MagicMock 作为 select 参数，抛出 `ArgumentError`
- **Fix:** 将 `patch("...KnowledgeDocument")` 替换为 `patch.object(svc, "get_document", new=AsyncMock(return_value=base_doc))`，绕过 SQLAlchemy ORM 调用
- **Files modified:** `tests/unit/test_knowledge/test_version_limit.py`
- **Verification:** 版本限额 3 个测试全部 PASS
- **Committed in:** 3523000（Task 2 commit）

---

**Total deviations:** 2 auto-fixed（2x Rule 1 - Bug fix）
**Impact on plan:** 两处修复均为测试设计缺陷，与实现逻辑无关。实现完全按计划执行。

## Issues Encountered
- Qdrant `scroll()` 接口签名使用关键字参数（`limit=`, `offset=`），与计划文档中的示例一致，无需调整
- 测试中 mock `KnowledgeDocument` 类会破坏同一方法内的 SQLAlchemy select，这是 Python 测试隔离的已知限制

## Next Phase Readiness
- KB-01~04 后端 API 全部就绪，Wave 2 前端知识库页面可依赖这些端点实现
- `ManualEntryCreate` schema 的 Literal 分类约束已对齐前端四分类 Tab 设计
- `scroll_by_doc_id` 函数可供未来分块编辑/调试功能复用

## Self-Check: PASSED

All verified:
- retriever.py: FOUND + scroll_by_doc_id: FOUND
- schemas.py: FOUND + ManualEntryCreate: FOUND
- service.py: FOUND + create_manual_entry: FOUND
- router.py: FOUND + /chunks: FOUND
- SUMMARY.md: FOUND
- Commit 173bfdd: FOUND
- Commit 3523000: FOUND

---
*Phase: 04-wai-wei-mo-kuai-kuo-zhan*
*Completed: 2026-03-16*
