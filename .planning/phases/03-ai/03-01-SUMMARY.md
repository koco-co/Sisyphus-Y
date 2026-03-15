---
phase: "03-ai"
plan: "03-01"
subsystem: "RAG"
tags: ["rag", "llm-review", "historical-testcases", "qdrant", "tdd"]
dependency_graph:
  requires: []
  provides: ["RAG-01", "RAG-02", "RAG-03", "RAG-04", "RAG-07", "RAG-08"]
  affects: ["historical_testcases collection"]
tech_stack:
  added: []
  patterns: ["TDD", "md5-stable-id", "utf-8-sig-csv", "three-branch-verdict"]
key_files:
  created:
    - scripts/review_testcases.py
    - backend/tests/unit/test_rag/test_csv_fields.py
    - backend/tests/unit/test_rag/test_recreate.py
    - backend/tests/unit/test_rag/test_review_script.py
    - backend/tests/unit/test_rag/test_review_rules.py
    - backend/tests/unit/test_rag/test_review_verdict.py
    - backend/tests/unit/test_rag/test_review_report.py
  modified: []
decisions:
  - "使用 md5(filepath::row_index) 生成稳定 ID 实现幂等性"
  - "utf-8-sig 编码处理带 BOM 的 CSV 文件"
  - "三分支 verdict 系统：pass/polish/discard"
  - "mock-based 单元测试避免外部依赖"
metrics:
  duration: "45"
  completed_date: "2026-03-15"
---

# Phase 03 Plan 03-01: 历史用例 LLM 审查脚本 Summary

**One-liner:** 使用 GLM-5 审查 228 个 CSV（约 12.9 万行历史用例），通过/润色入库 Qdrant，丢弃记录原因，支持幂等重跑。

## 脚本位置与使用

```bash
cd backend
uv run python ../scripts/review_testcases.py --help
uv run python ../scripts/review_testcases.py --dry-run        # 连通性检查
uv run python ../scripts/review_testcases.py --sample 10      # 采样测试
uv run python ../scripts/review_testcases.py                  # 全量执行
```

## REVIEW_SYSTEM Prompt 结构

```
你是一个专业的测试用例质量审查专家。

## 审查规则
1. 第一步：检查用例是否包含完整的测试要素
   - 用例标题、前置条件、测试步骤、预期结果
2. 第二步：评估用例质量（步骤可执行性、预期可验证性）

## 输出格式（JSON）
{
  "verdict": "pass|polish|discard",
  "polished": {...},        // verdict=polish 时
  "discard_reason": "..."   // verdict=discard 时
}

## 丢弃原因分类
1. 步骤缺失  2. 预期缺失  3. 无法修复  4. 重复用例  5. 无效用例
```

## 测试文件列表

| 文件 | 覆盖需求 | 测试内容 |
|------|----------|----------|
| `test_csv_fields.py` | RAG-07 | BOM 解析、必需字段验证 |
| `test_recreate.py` | RAG-08 | collection 清空重建 mock 测试 |
| `test_review_script.py` | RAG-01 | CSV 采样、稳定 ID 生成 |
| `test_review_rules.py` | RAG-02 | Prompt 内容验证 |
| `test_review_verdict.py` | RAG-02/03 | 三分支 verdict 解析测试 |
| `test_review_report.py` | RAG-04 | 报告格式、丢弃原因分组 |

## 关键实现细节

### 幂等 ID 生成
```python
def make_point_id(file_path: str, row_index: int) -> str:
    key = f"{file_path}::{row_index}"
    return hashlib.md5(key.encode()).hexdigest()
```

### CSV BOM 处理
```python
with open(path, encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
```

### JSON 安全提取
```python
def _extract_json(content: str) -> dict | None:
    # 1. 直接解析  2. 代码块提取  3. 正则搜索
    match = re.search(r"\{.*\}", content, re.DOTALL)
```

## 发现的坑与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 测试导入失败 | scripts 不在 Python path | 使用 `importlib.util.spec_from_file_location` 动态导入 |
| Mock 对象属性 | MagicMock 的 name 参数是特殊属性 | 显式设置 `mock_collection.name = "..."` |
| asyncio 测试 | review_case 是 async 函数 | 使用 `@pytest.mark.asyncio` + `async def` |
| CSV 编码 | 文件带 UTF-8 BOM | 使用 `utf-8-sig` 编码读取 |

## Deviations from Plan

**无偏差** - 计划执行完全符合预期。

## 验证结果

```bash
cd backend && uv run pytest tests/unit/test_rag/ -x -q
# 17 passed

cd backend && uv run python ../scripts/review_testcases.py --dry-run
# 23:58:06 INFO  找到 228 个 CSV 文件
# 23:58:06 INFO  DRY-RUN 模式: 找到 228 个 CSV 文件，跳过实际审查
```

## 后续工作

- 实际运行脚本需要配置 `ZHIPU_API_KEY` 环境变量
- 全量 12.9 万行预计耗时约 10 小时（按 0.3s/条估算）
- 考虑使用 Celery 任务化批量处理
