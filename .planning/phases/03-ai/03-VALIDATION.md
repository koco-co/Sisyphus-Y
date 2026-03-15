---
phase: 3
slug: ai
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio（asyncio_mode = "auto"） |
| **Config file** | `backend/pyproject.toml` |
| **Quick run command** | `cd backend && uv run pytest tests/unit/test_rag/ tests/unit/test_ai/test_prompts.py -x -q` |
| **Full suite command** | `cd backend && uv run pytest tests/unit/ -q` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && uv run pytest tests/unit/test_rag/ tests/unit/test_ai/test_prompts.py -x -q`
- **After every plan wave:** Run `cd backend && uv run pytest tests/unit/ -q`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | RAG-08 | unit | `uv run pytest tests/unit/test_rag/test_recreate.py -x` | ❌ Wave 0 | ⬜ pending |
| 3-01-02 | 01 | 0 | RAG-07 | unit | `uv run pytest tests/unit/test_rag/test_csv_fields.py -x` | ❌ Wave 0 | ⬜ pending |
| 3-01-03 | 01 | 1 | RAG-01 | unit | `uv run pytest tests/unit/test_rag/test_review_script.py -x` | ❌ Wave 0 | ⬜ pending |
| 3-01-04 | 01 | 1 | RAG-02 | unit | `uv run pytest tests/unit/test_rag/test_review_rules.py -x` | ❌ Wave 0 | ⬜ pending |
| 3-01-05 | 01 | 1 | RAG-03 | unit | `uv run pytest tests/unit/test_rag/test_review_verdict.py -x` | ❌ Wave 0 | ⬜ pending |
| 3-01-06 | 01 | 1 | RAG-04 | unit | `uv run pytest tests/unit/test_rag/test_review_report.py -x` | ❌ Wave 0 | ⬜ pending |
| 3-01-07 | 01 | 1 | RAG-05 | unit | `uv run pytest tests/unit/test_rag/ -k "retrieve" -x` | ✅ | ⬜ pending |
| 3-02-01 | 02 | 2 | RAG-06 | manual | 手动验证 | manual-only | ⬜ pending |
| 3-03-01 | 03 | 2 | PRM-01 | unit | `uv run pytest tests/unit/test_ai/test_prompts.py -x` | ✅ | ⬜ pending |
| 3-03-02 | 03 | 2 | PRM-02 | unit | `uv run pytest tests/unit/test_ai/test_prompts.py -k "identity" -x` | ❌ Wave 0 | ⬜ pending |
| 3-03-03 | 03 | 2 | PRM-03 | unit | `uv run pytest tests/unit/test_ai/test_prompts.py -k "fewshot" -x` | ❌ Wave 0 | ⬜ pending |
| 3-04-01 | 04 | 3 | PRM-04 | unit | `uv run pytest tests/unit/test_core/ -k "config" -x` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/test_rag/test_review_script.py` — RAG-01 CSV 读取 + LLM mock 调用
- [ ] `tests/unit/test_rag/test_review_rules.py` — RAG-02 审查规则判断逻辑
- [ ] `tests/unit/test_rag/test_review_verdict.py` — RAG-03 三分支决策（pass/polish/discard）
- [ ] `tests/unit/test_rag/test_review_report.py` — RAG-04 报告 JSON 格式验证
- [ ] `tests/unit/test_rag/test_csv_fields.py` — RAG-07 CSV BOM 解析 + 字段名中文验证
- [ ] `tests/unit/test_rag/test_recreate.py` — RAG-08 collection 清空 + 重建（mock Qdrant）
- [ ] `tests/unit/test_ai/test_prompts.py` 新增 `identity` 和 `fewshot` 测试 — PRM-02/03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSE 流式输出中 `\n` 渲染为换行 | RAG-06 | 涉及浏览器渲染行为，无法 jest 覆盖 | 1. 进入工作台 Step2；2. 触发 SSE 生成；3. 确认流式输出的换行符显示为换行而非 `\n` 字符 |
| 设置页选择 glm-5 后 AI 分析使用新模型 | PRM-04 | 需要真实 API 调用验证 | 1. 进入设置页 AI 配置；2. 选择 glm-5；3. 触发需求分析，确认使用 glm-5 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
