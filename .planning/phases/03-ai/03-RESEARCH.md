# Phase 3: AI 质量提升 - Research

**Researched:** 2026-03-15
**Domain:** RAG 向量库构建 / Prompt 工程 / LLM 配置 / SSE 渲染
**Confidence:** HIGH（所有结论均基于项目现有代码直接核查）

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 审查脚本：`scripts/review_testcases.py`，独立脚本，`uv run` 直接执行，不依赖 Celery
- 采样策略：`--sample N` 参数，默认先每个 CSV 取前 N 条验证效果，确认后全量
- 全量运行自动跳过已入库的用例（幂等，用 testcase_id 去重）
- 审查报告：终端打印汇总表格 + 持久化到 `scripts/review_report.json`
- 向量库清空范围：`historical_testcases` 和 `knowledge_chunks` 两个 collection 全部清空后重建
- 清空时机：脚本执行开始时清空，再重建
- knowledge_chunks 重建：脚本从 knowledge 模块 DB 表读取已上传文档记录，自动重新向量化
- 嵌入模型：保持 zhipu embedding-3（2048 维）不变
- GLM-5：只替换对话/分析场景，不影响嵌入流程
- Prompt 重写：6 个模块全部重写，保持四段式结构，各身份声明差异化
- Few-shot：每模块 2~3 条正例（正常/异常/边界）+ 1 条负例，从历史用例精选
- SSE 换行渲染：修复前端 `\n` 字符不转换为换行的 bug，属于前端渲染层

### Claude's Discretion
- 审查脚本并行度的具体数值（用户后续根据 API 限流决定）
- Few-shot 示例的具体文字内容（从历史数据精选时由 Claude 判断）
- 重试/降级逻辑的指数退避参数
- `\n` 渲染 bug 的具体修复位置（需看代码确认）

### Deferred Ideas (OUT OF SCOPE)
- 审查 UI 触发（设置页「开始审查」按钮 + 进度展示）—— Celery 补齐后
- 审查脚本并行度配置化（`--concurrency N`）
- 历史用例审查报告设置页展示 —— Phase 4 补充
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RAG-01 | 调用 LLM 审查「清洗后数据」目录下所有用例 | 脚本架构参考 vectorize_testcases.py；CSV 字段已确认为中文；审查通过 invoke_llm |
| RAG-02 | 审查规则：第一步进入完整路径、每步有预期、前置条件含 SQL、步骤独立、预期可验证 | LLM 审查 Prompt 设计；规则映射到 JSON 输出字段 |
| RAG-03 | 通过→入库；可修复→润色入库；无法修复→丢弃记录原因 | 三分支决策输出，入库复用 embed_texts + Qdrant upsert |
| RAG-04 | 审查完成输出报告（总数/通过/润色/丢弃/丢弃原因汇总） | 终端 tabulate 表格 + review_report.json |
| RAG-05 | RAG 检索 top-5，阈值 0.72，检索结果注入 Prompt 时带相似度分数 | retrieve_similar_cases() 已有此参数，retrieve_cases_as_context() 已格式化分数 |
| RAG-06 | 修复前端 SSE 内容中 `\n` 不转换为换行的渲染 bug | 定位在 ChatArea/ThinkingStream 中 content 渲染，需替换 `\n` 为 `<br>` 或用 whitespace-pre-wrap |
| RAG-07 | 统一历史数据中英文字段名（全部改为中文） | CSV 已全是中文字段，嵌入文本模板已用中文 label |
| RAG-08 | 重新入向量库前先清空旧向量记录 | recreate_collection() 已在 retriever.py 封装，直接调用 |
| PRM-01 | 全部 6 个模块 System Prompt 重写，四段式结构 | prompts.py 中已有 6 个变量，直接替换内容 |
| PRM-02 | 各模块身份声明差异化，精准对应模块职责 | 当前 6 个已有差异化声明，需加强精准度，禁止同质化 |
| PRM-03 | Prompt 注入 Few-shot 正例（正常/异常/边界）+ 负面示例 | GENERATION_SYSTEM 已有完整 Few-shot 结构可参考 |
| PRM-04 | 智谱主力模型切换为 glm-5 | config.py 中 zhipu_model 默认值已是 "glm-5"；AIModelSettings 默认也是 glm-5 |
</phase_requirements>

---

## Summary

Phase 3 涉及四个相互独立的子任务：（1）历史用例 LLM 审查脚本，（2）向量库重建，（3）Prompt 体系重写，（4）SSE 换行 bug 修复。

项目已有 `scripts/vectorize_testcases.py` 实现了 CSV→嵌入→Qdrant 的完整流程，`review_testcases.py` 可在此基础上增加 LLM 审查层。`recreate_collection()` 函数已在 `retriever.py` 封装完毕，直接调用即可完成清空+重建。`embed_texts()` 和 Qdrant upsert 已验证可复用。

Prompt 重写方面，`GENERATION_SYSTEM` 已有完整的 Few-shot 正负例模板（3 正 2 负），其他 5 个模块需要补齐类似结构。`glm-5` 在 `config.py` 的 `zhipu_model` 默认值中已配置，`AIModelSettings` 前端默认也是 glm-5，PRM-04 的"切换"实际上只需验证 zhipu_model 默认值正确并确认 API 正常调用。

SSE 换行 bug 的根本原因已定位：`useSSE.ts` 中 `contentRef.current += data.delta` 正确积累了含 `\n` 的字符串，问题在下游渲染组件将 `content` 直接放入 `{content}` JSX，React 不会将 `\n` 渲染为 `<br>`，需要在渲染层加 `whitespace-pre-wrap` 或做 `\n` → `<br>` 替换。

**Primary recommendation:** 以 `vectorize_testcases.py` 为结构模板新建 `review_testcases.py`，以 `GENERATION_SYSTEM` 的 Few-shot 结构为标准改写其他 5 个模块 Prompt，SSE 渲染修复限定在 ChatArea 中的流式内容显示节点。

---

## Standard Stack

### Core（已存在，直接复用）

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| qdrant-client | 已安装 | Qdrant 向量库操作 | retriever.py 已用，recreate_collection() 已封装 |
| zhipuai | 已安装 | GLM-5 调用 + embedding-3 | llm_client.py + embedder.py 已集成 |
| httpx | 已安装 | async HTTP，embed API | embedder.py 已用 |
| sqlalchemy asyncpg | 已安装 | knowledge_documents 读取 | 整个后端统一 ORM |
| tabulate | 需确认 | 终端打印审查报告表格 | scripts/ 中 vectorize 未用，需安装 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tabulate | latest | 审查报告终端表格输出 | RAG-04 report 打印 |
| tqdm | latest (可选) | 脚本实时进度条 | --sample 和全量运行进度显示 |
| csv (stdlib) | stdlib | CSV 解析 | 读取「清洗后数据」228 个 CSV |

**Installation（如缺少）：**
```bash
cd backend && uv add tabulate tqdm
```

---

## Architecture Patterns

### CSV 数据结构（已确认）

228 个 CSV 文件分布在：
```
清洗后数据/
├── 信永中和/
│   ├── v0.2.0/        # N 个 .csv 文件（模块维度）
│   └── v0.2.1/
└── 数栈平台/
    ├── 公共组件/      # 二级目录（模块/版本）
    ├── 指标开发/
    ├── 离线开发/
    └── 数据资产/
```

CSV 字段（已确认为中文）：
```
用例编号,用例标题,所属模块,相关需求,前置条件,步骤,预期结果,优先级,用例类型
```

注意：`步骤` 字段是换行分隔的纯文本（不是 JSON），`预期结果` 同理。

### Pattern 1: 审查脚本流程架构

参考 `scripts/vectorize_testcases.py` 的结构：

```python
# scripts/review_testcases.py 骨架
async def main(sample: int | None = None) -> None:
    # 1. recreate_collection(TESTCASE_COLLECTION)
    # 2. recreate_collection(KNOWLEDGE_COLLECTION) → 重载 knowledge_documents
    # 3. find all CSV files under 清洗后数据/
    # 4. for each file: read rows (with sample limit)
    #    - skip if testcase_id already in done_ids (幂等)
    #    - call LLM reviewer → verdict: pass|polish|discard
    #    - if pass/polish: embed + upsert to Qdrant
    #    - accumulate stats
    # 5. save review_report.json
    # 6. print tabulate summary
```

### Pattern 2: 审查 LLM Prompt 结构

LLM 审查调用应输出结构化 JSON：

```python
REVIEW_SYSTEM = """你是历史测试用例质量审查专家。
对每条用例，输出 JSON：
{
  "verdict": "pass" | "polish" | "discard",
  "polished": { ...用例字段... } | null,  # 仅 polish 时有值
  "discard_reason": "步骤缺失" | "预期结果不具体" | "前置条件缺SQL" | "步骤不独立" | "无法修复" | null
}
"""
```

审查规则（RAG-02）转化为 Prompt 检查项：
1. 第一步必须是「进入[完整路径]页面」
2. 每步有独立的预期结果
3. 前置条件包含 SQL 或明确数据准备
4. 每步只含单一操作
5. 预期结果可客观验证（无「操作成功」「显示正常」）

### Pattern 3: knowledge_chunks 重建

```python
# 从 DB 读取 active 知识库文档，重新向量化
async def rebuild_knowledge_chunks(session: AsyncSession) -> int:
    docs = await session.execute(
        select(KnowledgeDocument)
        .where(KnowledgeDocument.deleted_at.is_(None))
        .where(KnowledgeDocument.is_active == True)
        .where(KnowledgeDocument.content.isnot(None))
    )
    for doc in docs.scalars():
        chunks = chunk_by_headers(doc.content, source_id=str(doc.id))
        await index_chunks(chunks, doc_id=str(doc.id))
```

### Pattern 4: SSE 换行渲染修复

**定位**：`useSSE.ts` 正确积累 `\n`，问题在渲染层。

修复方式（选一）：

```tsx
// 方案 A：CSS whitespace-pre-wrap（推荐，无额外处理）
<p className="whitespace-pre-wrap">{content}</p>

// 方案 B：split + join（需要找准渲染节点）
{content.split('\n').map((line, i) => (
  <span key={i}>{line}<br /></span>
))}
```

修复位置候选（需看实际渲染代码）：
- `frontend/src/app/(main)/workbench/_components/ChatArea.tsx` 中的流式内容区域
- `frontend/src/components/ui/ThinkingStream.tsx` 中的 content 渲染节点

### Pattern 5: GLM-5 配置验证

`config.py` 已设置 `zhipu_model: str = "glm-5"`，`AIModelSettings.tsx` 默认值也是 `glm-5`。

PRM-04 的实际工作是：
1. 验证 zhipu API 能正常调用 `glm-5` 模型（不报 model-not-found）
2. 如果后端 `settings.zhipu_model` 已是 `"glm-5"` 则无需修改
3. 前端设置页已支持，用户自行选择确认

### Anti-Patterns to Avoid

- **每条用例单独 LLM 调用**：对 12.9 万行性能极差，应批量（每次 3-5 条放一个 prompt）或对 CSV 按文件批处理
- **同步 LLM 调用阻塞事件循环**：zhipuai SDK 是同步的，必须用 `asyncio.to_thread()` 包装（参考 `llm_client.py`）
- **清空 collection 后不等重建完成**：`recreate_collection()` 是同步的，直接调用后立即可用
- **直接 `json.loads(content)`**：必须用 `re.search(r'\{.*\}', content, re.DOTALL)` 安全提取

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Qdrant collection 清空重建 | 自行拼接 delete+create | `recreate_collection()` in retriever.py | 已封装，处理 existed check |
| 文本嵌入 | 直接调 zhipu HTTP | `embed_texts()` in embedder.py | 已处理 batch/retry/provider |
| LLM 调用 | 直接实例化 ZhipuAI | `invoke_llm()` in llm_client.py | 已有重试/降级/to_thread |
| JSON 安全提取 | `json.loads(content)` | `re.search + json.loads(match.group())` | CLAUDE.md 强制规范 |
| knowledge 重建 | 用户手动重上传 | 脚本从 DB KnowledgeDocument 表读取重建 | 用户决策 |

---

## Common Pitfalls

### Pitfall 1: CSV BOM 编码问题
**What goes wrong:** CSV 文件首行包含 `\ufeff`（BOM），导致第一列字段名变成 `\ufeffid` 或 `﻿用例编号`
**Why it happens:** Windows 下保存 UTF-8 CSV 默认带 BOM
**How to avoid:** 使用 `open(path, encoding='utf-8-sig')` 读取，`csv.DictReader` 自动处理 BOM

**Warning signs:** 已在实际 CSV 中观察到 `﻿用例编号`（有 BOM 前缀）

### Pitfall 2: zhipuai SDK 同步阻塞
**What goes wrong:** `client.chat.completions.create()` 是同步调用，在 asyncio 事件循环中直接调用会阻塞整个线程
**Why it happens:** zhipuai SDK 没有 async 版本
**How to avoid:** 必须用 `await asyncio.to_thread(_call)`，参考 `llm_client.py` 中的 `_invoke_zhipu`

### Pitfall 3: 向量库幂等需要稳定 ID
**What goes wrong:** 每次运行脚本产生不同 UUID 导致重复向量
**Why it happens:** `uuid.uuid4()` 每次生成新 ID
**How to avoid:** 用 `testcase_id`（CSV 中的用例编号或文件路径+行号的 hash）作为 Qdrant point ID，已在 `vectorize_testcases.py` 中使用 `str(tc["id"])` 作为 point ID

### Pitfall 4: LLM 审查 rate limit
**What goes wrong:** 12.9 万条逐一审查触发 API rate limit（429）
**Why it happens:** zhipu API QPS 限制
**How to avoid:** 每批处理后加 `asyncio.sleep(0.5~1s)`，捕获 429 后指数退避，参考 `vectorize_testcases.py` 的处理模式

### Pitfall 5: SSE 换行 bug 修复范围过大
**What goes wrong:** 改了 useSSE.ts 的字符串处理，影响所有 SSE 流
**Why it happens:** bug 不在数据层而在渲染层
**How to avoid:** 只改渲染节点的 CSS class（加 `whitespace-pre-wrap`），不改数据处理逻辑

### Pitfall 6: Prompt Few-shot 膨胀
**What goes wrong:** Few-shot 示例过多导致单次 token 超过模型限制
**Why it happens:** 历史用例每条可能有 10+ 步骤，字符数很多
**How to avoid:** 每模块 2~3 正例 + 1 负例，正例选步骤数 ≤ 4 的简洁案例，不复用 GENERATION_SYSTEM 中的冗长示例

---

## Code Examples

### 审查脚本幂等 ID 生成

```python
# Source: scripts/vectorize_testcases.py pattern + 新需求
import hashlib

def make_point_id(file_path: str, row_index: int) -> str:
    """生成稳定的 Qdrant point ID（用文件路径 + 行号 hash）"""
    key = f"{file_path}::{row_index}"
    return hashlib.md5(key.encode()).hexdigest()
```

### recreate_collection 调用（RAG-08）

```python
# Source: backend/app/engine/rag/retriever.py - recreate_collection()
from app.engine.rag.retriever import recreate_collection, COLLECTION_NAME, TESTCASE_COLLECTION

# 清空两个 collection
result1 = recreate_collection(collection_name=TESTCASE_COLLECTION)
result2 = recreate_collection(collection_name=COLLECTION_NAME)
logger.info("清空 historical_testcases: %d points 删除", result1["deleted_points"])
logger.info("清空 knowledge_chunks: %d points 删除", result2["deleted_points"])
```

### CSV 读取（处理 BOM）

```python
# Source: 基于实际 CSV 字段观察（有 BOM 前缀）
import csv

def read_csv_cases(path: str, sample: int | None = None) -> list[dict]:
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = []
        for i, row in enumerate(reader):
            if sample is not None and i >= sample:
                break
            rows.append(row)
    return rows
```

### Qdrant 入库（历史用例，复用 testcase_id 去重）

```python
# Source: scripts/vectorize_testcases.py pattern
from qdrant_client import models

point = models.PointStruct(
    id=make_point_id(file_path, row_idx),   # 稳定 ID
    vector=embedding_vector,
    payload={
        "testcase_id": make_point_id(file_path, row_idx),
        "title": row["用例标题"],
        "product": product_name,             # 从目录路径提取
        "module": row["所属模块"],
        "priority": row["优先级"],
        "content": formatted_text,           # 用于检索展示
    },
)
client.upsert(collection_name=TESTCASE_COLLECTION, points=[point])
```

### LLM 审查调用

```python
# Source: backend/app/ai/llm_client.py invoke_llm pattern
import re, json
from app.ai.llm_client import invoke_llm

async def review_case(case_text: str) -> dict:
    messages = [
        {"role": "system", "content": REVIEW_SYSTEM},
        {"role": "user", "content": f"请审查以下测试用例：\n\n{case_text}"},
    ]
    result = await invoke_llm(messages, provider="zhipu", model="glm-5")
    match = re.search(r'\{.*\}', result.content, re.DOTALL)
    if not match:
        return {"verdict": "discard", "discard_reason": "无法修复", "polished": None}
    return json.loads(match.group())
```

### SSE 换行渲染修复

```tsx
// 修复前：\n 不渲染为换行
<p className="text-sm text-sy-text-2">{content}</p>

// 修复后：whitespace-pre-wrap 保留换行符
<p className="text-sm text-sy-text-2 whitespace-pre-wrap">{content}</p>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GLM-4-Flash 为默认 | glm-5 为默认 | PRM-04 | config.py zhipu_model 已是 glm-5，确认 API 调用即可 |
| 无历史用例质量控制 | LLM 审查三分支（通过/润色/丢弃） | Phase 3 | RAG 检索质量可信度从未知→可信 |
| vectorize 脚本从 DB 读取 | review 脚本从 CSV 直接读取 | Phase 3 | 数据源不同，脚本不复用但架构参考 |

**Deprecated/outdated:**
- `scripts/import_csv_testcases.py`：Phase 3 的审查脚本是不同职责（审查+入向量库），不是替代此脚本

---

## Open Questions

1. **GLM-5 API 是否可用**
   - What we know: `config.py` 中 `zhipu_model = "glm-5"` 已配置；zhipuai SDK 支持 model 参数传递
   - What's unclear: 用户的 API Key 是否有 glm-5 权限（可能需要申请）
   - Recommendation: Wave 0 增加一个 `uv run python -c "from zhipuai import ZhipuAI; ..."` 快速验证任务

2. **审查脚本批量策略**
   - What we know: 12.9 万行，逐条太慢，需要批量
   - What's unclear: 每次审查几条最优（多条 vs 单条影响 JSON 提取复杂度）
   - Recommendation: 每次审查 1 条，避免多条 JSON 解析复杂性；用 asyncio.sleep 控速

3. **ChatArea 流式内容渲染节点**
   - What we know: SSE `content` 在 `useSSE.ts` 正确积累含 `\n` 字符串
   - What's unclear: ChatArea 中渲染 `content` 的具体 JSX 节点位置（需查文件）
   - Recommendation: 执行任务前先 Read ChatArea.tsx，定位 `{sse.content}` 或等价节点

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio（asyncio_mode = "auto"） |
| Config file | `backend/pytest.ini` or `backend/pyproject.toml` |
| Quick run command | `cd backend && uv run pytest tests/unit/test_rag/ -x -q` |
| Full suite command | `cd backend && uv run pytest tests/unit/ -q` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RAG-01 | review 脚本 CSV 读取 + LLM 调用流程 | unit (mock LLM) | `uv run pytest tests/unit/test_rag/test_review_script.py -x` | ❌ Wave 0 |
| RAG-02 | 审查规则判断逻辑 | unit | `uv run pytest tests/unit/test_rag/test_review_rules.py -x` | ❌ Wave 0 |
| RAG-03 | 三分支决策 + 入库路径 | unit (mock Qdrant) | `uv run pytest tests/unit/test_rag/test_review_verdict.py -x` | ❌ Wave 0 |
| RAG-04 | 报告 JSON 生成格式 | unit | `uv run pytest tests/unit/test_rag/test_review_report.py -x` | ❌ Wave 0 |
| RAG-05 | retrieve_similar_cases top-5 阈值 0.72 | unit (mock) | `uv run pytest tests/unit/test_rag/ -k "retrieve" -x` | ✅（tests/unit/test_rag/ 存在） |
| RAG-06 | SSE 换行渲染 | manual | 手动验证：工作台 Step2 流式输出中 `\n` 显示为换行 | manual-only |
| RAG-07 | CSV 字段中文统一 | unit | `uv run pytest tests/unit/test_rag/test_csv_fields.py -x` | ❌ Wave 0 |
| RAG-08 | recreate_collection 清空 + 重建 | unit (mock) | `uv run pytest tests/unit/test_rag/test_recreate.py -x` | ❌ Wave 0 |
| PRM-01 | 6 模块 Prompt 存在四段式结构 | unit | `uv run pytest tests/unit/test_ai/test_prompts.py -x` | ✅（test_ai/ 存在） |
| PRM-02 | 身份声明不同质化 | unit | `uv run pytest tests/unit/test_ai/test_prompts.py -k "identity" -x` | ❌ Wave 0 |
| PRM-03 | Few-shot 注入正负例 | unit | `uv run pytest tests/unit/test_ai/test_prompts.py -k "fewshot" -x` | ❌ Wave 0 |
| PRM-04 | zhipu_model 默认值为 glm-5 | unit | `uv run pytest tests/unit/test_core/ -k "config" -x` | ✅（test_core/ 存在） |

### Sampling Rate
- **Per task commit:** `cd backend && uv run pytest tests/unit/test_rag/ tests/unit/test_ai/test_prompts.py -x -q`
- **Per wave merge:** `cd backend && uv run pytest tests/unit/ -q`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/test_rag/test_review_script.py` — RAG-01/02/03/04 的 mock 测试
- [ ] `tests/unit/test_rag/test_csv_fields.py` — RAG-07 字段名验证
- [ ] `tests/unit/test_rag/test_recreate.py` — RAG-08 collection 重建
- [ ] `tests/unit/test_ai/test_prompts.py` 中新增 identity/fewshot test case — PRM-02/03

---

## Sources

### Primary (HIGH confidence)
- `backend/app/engine/rag/retriever.py` — recreate_collection, retrieve_similar_cases, TESTCASE_COLLECTION 常量
- `backend/app/engine/rag/embedder.py` — EMBEDDING_DIMENSION=2048，embed_texts，zhipu embedding-3
- `backend/app/engine/rag/chunker.py` — chunk_by_headers，chunk_by_paragraphs
- `backend/app/ai/prompts.py` — 6 模块 Prompt 现状，assemble_prompt 7 层结构，GENERATION_SYSTEM Few-shot 标准
- `backend/app/ai/llm_client.py` — invoke_llm，asyncio.to_thread 模式，model 参数传递
- `backend/app/core/config.py` — zhipu_model = "glm-5"（默认已是目标值），llm_provider 配置
- `backend/app/modules/knowledge/models.py` — KnowledgeDocument 字段结构
- `scripts/vectorize_testcases.py` — 审查脚本架构参考：CSV 读取/嵌入/Qdrant 入库/进度/幂等
- `frontend/src/hooks/useSSE.ts` — content 积累逻辑，\n 在字符串层面已保留
- `frontend/src/app/(main)/workbench/_components/RagPreviewPanel.tsx` — RAG 预览 UI 已实现
- `frontend/src/app/(main)/settings/_components/AIModelSettings.tsx` — glm-5 为默认 modelId
- `清洗后数据/信永中和/v0.2.1/流程中心.csv` — 实际字段确认为中文，有 BOM

### Secondary (MEDIUM confidence)
- `backend/tests/` 目录结构 — 确认 test_rag/, test_ai/ 等子目录已存在

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 所有库已在 pyproject.toml 安装，只需确认 tabulate/tqdm
- Architecture: HIGH — recreate_collection/embed_texts/invoke_llm 均已实现，脚本架构参考现有 vectorize_testcases.py
- Pitfalls: HIGH — BOM、同步 SDK、rate limit 均从代码实际观察到或在现有脚本中已处理
- Prompt Few-shot: HIGH — GENERATION_SYSTEM 已有完整模板，其他 5 个模块复制结构即可

**Research date:** 2026-03-15
**Valid until:** 2026-04-15（Qdrant/zhipuai SDK 版本稳定，30 天有效）
