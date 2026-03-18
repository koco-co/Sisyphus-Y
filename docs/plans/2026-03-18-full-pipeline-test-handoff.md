# 全链路测试交接文档

> 日期：2026-03-18
> 上一次对话完成内容：LangSmith + RAG + 结构化输出 实施计划（Task 1~8 全部完成）

---

## 一、已完成的工作

### 1.1 Commits 列表（本轮新增）

```
e20ed7e chore(deps): add langsmith, langchain-core, langchain-openai
eb4af1a fix(rag): wrap zhipu embedding sync call with asyncio.to_thread
c83b4b2 fix(rag): replace sync QdrantClient with AsyncQdrantClient
635f7ad fix(case-gen): auto-inject RAG context before generation
b22c908 feat(observability): add LangSmith @traceable to LLM call chain
a9c908e feat(ai): add structured output with Pydantic + LangSmith trace
8c4bac5 feat(case-gen): use structured output with Pydantic fallback to regex
2b7f986 feat(case-gen): use structured output with Pydantic fallback to regex (test fixes)
278bd81 fix(ai): disable system proxy in structured LLM client (trust_env=False)
fcb21fd fix(ai): fix JSON extraction regex and replace with_structured_output with manual parse+validate
89ebc1b fix(config): change default zhipu_model from glm-5 to glm-5 (当前是 glm-5)
194fe7b fix(config): revert default model to glm-5 (subscribed model)
```

### 1.2 关键改动文件

| 文件 | 改动说明 |
|------|---------|
| `backend/app/ai/structured.py` | **新建**：Pydantic 模型 + LangChain LLM 调用 + JSON 手动提取 + Pydantic 校验，带 `@traceable` |
| `backend/app/ai/parser.py` | 修复 `_extract_json` 非贪婪正则 bug（`\[[\s\S]*?\]` → `re.search(r'\[.*\]', text, re.DOTALL)`） |
| `backend/app/engine/case_gen/chat_driven.py` | 接入 `generate_cases_structured`，结果 stamp `source:"ai"` |
| `backend/app/engine/case_gen/template_driven.py` | 同上 |
| `backend/app/engine/rag/retriever.py` | `QdrantClient` → `AsyncQdrantClient`，所有方法改为 async |
| `backend/app/engine/rag/embedder.py` | ZhiPu embedding 同步调用改用 `asyncio.to_thread` 包裹 |
| `backend/app/ai/llm_client.py` | 加 `@traceable(name="llm_invoke")` |
| `backend/app/ai/stream_adapter.py` | 加 `@traceable(name="llm_stream")` |
| `backend/app/core/config.py` | `zhipu_model` 默认值保持 `"glm-5"` |

---

## 二、当前环境状态

### 2.1 基础设施（Docker）

```bash
# 查看状态
docker ps --format "{{.Names}}: {{.Status}}"

# 当前状态：
# postgres: Up (healthy)
# redis:    Up (healthy)
# qdrant:   Up (unhealthy) ← 注意：Qdrant 运行但 health check 失败，实际可连接
```

Qdrant 的 unhealthy 只是 Docker health check 配置问题，实际上 `curl http://localhost:6333/healthz` 返回 `healthz check passed`。

### 2.2 LLM 提供商

- **主提供商**：ZhiPu GLM-5（`settings.llm_provider = "zhipu"`）
- **API Key 已更新**：`8a0e9badd00244b39932c49ebc780e48.Ic4UuSFAuEOUEssM`
- **限速说明**：GLM-5 有限速，短时间密集调用会触发 `429`，等 1~2 分钟可恢复
- **Key 存储位置**：当前只在 shell 环境变量中，需要写入 `.env` 文件（见下方）

### 2.3 环境变量设置

在项目根目录（`/Users/poco/Projects/Sisyphus-Y/`）创建 `.env` 文件：

```env
# LLM
LLM_PROVIDER=zhipu
ZHIPU_API_KEY=8a0e9badd00244b39932c49ebc780e48.Ic4UuSFAuEOUEssM
ZHIPU_MODEL=glm-5
LLM_FALLBACK_PROVIDER=zhipu

# 数据库
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/sisyphus
REDIS_URL=redis://localhost:6379/0

# Qdrant
QDRANT_URL=http://localhost:6333

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

> **注意**：`backend/app/core/config.py` 的 `_ENV_FILE` 指向项目根目录的 `.env`，不是 `backend/.env`。

---

## 三、全链路测试步骤

### 3.1 RAG 全链路验证路径

```
需求文档 → 知识库上传（embedding）→ 向量存入 Qdrant
       ↓
用例生成请求 → RAG 检索（retrieve_as_context）→ 注入 Prompt
       ↓
LLM 调用（glm-5）→ generate_cases_structured → Pydantic 校验
       ↓
返回标准化用例列表（含 source="ai"）
```

### 3.2 测试脚本（可直接使用）

保存为 `/tmp/test_full_pipeline.py`：

```python
"""全链路测试：RAG 检索 + 用例生成"""
import asyncio, os, sys, logging
sys.path.insert(0, '/Users/poco/Projects/Sisyphus-Y/backend')
os.environ['LANGCHAIN_TRACING_V2'] = 'false'  # 关闭 LangSmith 减少噪音

# 打开关键日志
logging.basicConfig(level=logging.INFO,
    format='%(levelname)s %(name)s: %(message)s')

TITLE = "【数据质量】质量校验不通过时支持发送邮件"
CONTENT = """\
当质量任务实例校验不通过时，若开启了脏数据存储，且配置了告警接受方式为邮箱，
则邮件内容附件形式发送不符合规则的明细数据。

### 单表规则
将校验未通过的规则的明细数据以附件形式发送至告警接受人邮箱，
一个校验子规则生成一个excel表格，命名为"规则类型_字段/表名_统计函数/校验格式"，
多个明细数据表表格合并为一个zip包，zip包命名为"不符合规则的明细数据"。

### 告警设置
当告警方式选择"邮箱"时，支持选择"是否发送明细数据"，默认选择"是"，单选。
"""

# ── Step 1: 测试 RAG 检索 ──────────────────────────────────
async def test_rag():
    print("\n" + "="*60)
    print("Step 1: RAG 检索测试")
    print("="*60)
    from app.engine.rag.retriever import retrieve_as_context, ensure_collection
    try:
        await ensure_collection()
        print("✅ Qdrant collection 就绪")
        result = await retrieve_as_context(CONTENT, top_k=5, score_threshold=0.5)
        if result:
            print(f"✅ RAG 检索到内容：{len(result)} 字符")
            print(result[:200])
        else:
            print("⚠️  RAG 无结果（知识库为空，属正常情况）")
    except Exception as e:
        print(f"❌ RAG 失败: {e}")

# ── Step 2: 测试 structured output ─────────────────────────
async def test_structured():
    print("\n" + "="*60)
    print("Step 2: generate_cases_structured 测试")
    print("="*60)
    from app.ai.structured import generate_cases_structured
    from app.ai.prompts import assemble_prompt

    system = assemble_prompt("generation",
        f"需求标题：{TITLE}\n需求内容：{CONTENT[:300]}")
    msgs = [
        {"role": "system", "content": system},
        {"role": "user", "content": "请生成3条核心测试用例，覆盖邮件发送正常流程"},
    ]
    cases = await generate_cases_structured(msgs)
    print(f"生成 {len(cases)} 条用例")
    for i, c in enumerate(cases, 1):
        print(f"  [{i}] {c.get('title','?')} | {c.get('priority','?')} | {c.get('case_type','?')}")

# ── Step 3: 完整 chat_driven_generate ──────────────────────
async def test_chat_driven():
    print("\n" + "="*60)
    print("Step 3: chat_driven_generate 全链路测试")
    print("="*60)
    from app.engine.case_gen.chat_driven import chat_driven_generate

    full_text, cases = await chat_driven_generate(
        requirement_title=TITLE,
        requirement_content=CONTENT,
        history=[],
        current_message="请生成邮件发送功能的核心测试用例，5条以内",
    )
    print(f"AI 回复: {len(full_text)} 字，解析出 {len(cases)} 条用例")
    for i, c in enumerate(cases, 1):
        print(f"  [{i}] {c.get('title','?')} | {c.get('priority','?')} | source={c.get('source','?')}")
        for s in c.get('steps', [])[:2]:
            print(f"      Step{s.get('step_num','?')}: {str(s.get('action','?'))[:70]}")
    if not cases:
        print("--- AI 原始回复前 600 字 ---")
        print(full_text[:600])

async def main():
    await test_rag()
    await asyncio.sleep(2)  # 避免 GLM-5 限速
    await test_structured()
    await asyncio.sleep(2)
    await test_chat_driven()

asyncio.run(main())
```

运行方式：

```bash
cd /Users/poco/Projects/Sisyphus-Y/backend
uv run python /tmp/test_full_pipeline.py 2>&1 | grep -v "LangSmith\|multipart\|HTTPError\|trace="
```

### 3.3 向知识库写入测试数据（让 RAG 有内容可检索）

```bash
# 通过 API 上传需求文档到知识库
curl -X POST http://localhost:8000/api/knowledge/upload \
  -F "file=@/Users/poco/Documents/DTStack/XmindCase/DataAssets/Story/Story-15602.md" \
  -F "category=business_knowledge" \
  -F "title=数据质量邮件告警需求"
```

或者通过前端页面：`http://localhost:3000/knowledge` → 上传文档。

---

## 四、已知问题和待观察点

| 问题 | 状态 | 说明 |
|------|------|------|
| GLM-5 限速 429 | 已知 | 短时密集调用触发，等 1~2 分钟恢复 |
| RAG 知识库为空 | 待填充 | Qdrant 可连接，但没有向量数据，需要先上传文档 |
| LangSmith 追踪 | 未完全配置 | `LANGCHAIN_API_KEY` 未设置，trace 上报失败（功能不影响） |
| Qdrant `unhealthy` | 假警报 | Docker health check 配置问题，实际可用 |

---

## 五、下一步建议

1. **填充知识库**：上传几个需求文档到知识库，让 RAG 检索有实际内容
2. **配置 `.env` 文件**：把 API Key 写入项目根目录 `.env`，不再依赖 shell 环境变量
3. **端到端冒烟测试**：通过前端页面 `/workbench` 完整走一遍用例生成流程
4. **（可选）配置 LangSmith**：申请 LangSmith API Key 后设置 `LANGCHAIN_API_KEY` 和 `LANGCHAIN_TRACING_V2=true`

---

## 六、给下一次对话的 Prompt

```
我正在继续 Sisyphus-Y 项目的开发。上一次对话已经完成了 LangSmith + RAG + 结构化输出 的完整实施，代码已推送到 main 分支。

请阅读 docs/plans/2026-03-18-full-pipeline-test-handoff.md 了解当前状态，然后帮我完成全链路测试：

1. 先确认环境：Qdrant/PostgreSQL/Redis 是否运行，.env 文件是否配置好
2. 向知识库上传测试需求文档（/Users/poco/Documents/DTStack/XmindCase/DataAssets/Story/ 目录下任选一个）
3. 运行 /tmp/test_full_pipeline.py 脚本验证全链路（RAG检索 → LLM生成 → 结构化解析）
4. 根据测试结果修复剩余问题

ZhiPu GLM-5 API Key: 8a0e9badd00244b39932c49ebc780e48.Ic4UuSFAuEOUEssM
注意：GLM-5 有限速，测试脚本已加 sleep(2) 间隔，遇到 429 等 1~2 分钟重试即可。
```
