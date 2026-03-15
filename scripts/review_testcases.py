"""历史测试用例 LLM 审查脚本。

从「清洗后数据」目录读取 CSV，逐条用 GLM-5 审查质量，
通过/润色的用例入 Qdrant historical_testcases collection，
丢弃的记录原因。

Usage:
    uv run python scripts/review_testcases.py [--sample N] [--dry-run]
"""

import argparse
import asyncio
import csv
import hashlib
import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any

# ═══════════════════════════════════════════════════════════════════
# 路径 & 环境变量
# ═══════════════════════════════════════════════════════════════════

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.insert(0, BACKEND_DIR)

env_path = os.path.join(PROJECT_ROOT, ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k] = v

os.chdir(BACKEND_DIR)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-5s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("review")

# ═══════════════════════════════════════════════════════════════════
# 延迟导入（需要 env 先就位）
# ═══════════════════════════════════════════════════════════════════

from qdrant_client import QdrantClient, models  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.engine.rag.embedder import EMBEDDING_DIMENSION, embed_texts  # noqa: E402
from app.engine.rag.retriever import (  # noqa: E402
    COLLECTION_NAME,
    TESTCASE_COLLECTION,
    recreate_collection,
)
from app.ai.llm_client import invoke_llm  # noqa: E402

# ═══════════════════════════════════════════════════════════════════
# 常量
# ═══════════════════════════════════════════════════════════════════

REPORT_FILE = os.path.join(PROJECT_ROOT, "scripts", "review_report.json")
PROGRESS_FILE = os.path.join(PROJECT_ROOT, "scripts", ".review_progress.json")
DATA_DIR = os.path.join(PROJECT_ROOT, "清洗后数据")

REVIEW_SYSTEM = """你是一个专业的测试用例质量审查专家。

请审查以下测试用例，根据以下规则进行判断：

## 审查规则

1. **第一步**：检查用例是否包含完整的测试要素
   - 用例标题：清晰描述测试目的
   - 前置条件：执行测试的必要前提
   - 测试步骤：可执行的操作序列
   - 预期结果：明确的验证标准

2. **第二步**：评估用例质量
   - 步骤是否清晰可执行
   - 预期结果是否明确可验证
   - 优先级是否合理

## 输出格式

请以 JSON 格式输出审查结果：

```json
{
  "verdict": "pass|polish|discard",
  "polished": {  // 仅当 verdict=polish 时
    "title": "优化后的标题",
    "precondition": "优化后的前置条件",
    "steps": "优化后的步骤",
    "expected": "优化后的预期结果"
  },
  "discard_reason": "丢弃原因"  // 仅当 verdict=discard 时
}
```

## 判断标准

- **pass**：用例质量良好，可直接入库
- **polish**：用例有基础框架但需优化，提供润色后的内容
- **discard**：用例质量太差无法修复，记录原因

## 丢弃原因分类

1. 步骤缺失 - 没有测试步骤
2. 预期缺失 - 没有预期结果
3. 无法修复 - 内容混乱无法理解
4. 重复用例 - 与已有用例完全重复
5. 无效用例 - 非功能性描述或占位符
"""

# ═══════════════════════════════════════════════════════════════════
# 工具函数
# ═══════════════════════════════════════════════════════════════════


def read_csv_cases(path: str, sample: int | None = None) -> list[dict]:
    """读取 CSV 文件，返回用例列表。

    Args:
        path: CSV 文件路径
        sample: 最多读取的行数，None 表示不限制

    Returns:
        用例字典列表
    """
    cases = []
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if sample is not None and i >= sample:
                break
            cases.append(row)
    return cases


def make_point_id(file_path: str, row_index: int) -> str:
    """基于 md5(filepath::row_index) 生成稳定 ID。

    Args:
        file_path: CSV 文件路径
        row_index: 行索引

    Returns:
        md5 hex 字符串
    """
    key = f"{file_path}::{row_index}"
    return hashlib.md5(key.encode()).hexdigest()


def csv_row_to_text(row: dict) -> str:
    """将 CSV 行转换为用于嵌入的文本描述。

    Args:
        row: CSV 行字典

    Returns:
        格式化的文本描述
    """
    parts: list[str] = []

    if row.get("用例标题"):
        parts.append(f"用例: {row['用例标题']}")

    if row.get("所属模块"):
        parts.append(f"模块: {row['所属模块']}")

    if row.get("相关需求"):
        parts.append(f"需求: {row['相关需求']}")

    if row.get("优先级"):
        parts.append(f"优先级: {row['优先级']}")

    if row.get("前置条件"):
        parts.append(f"前置条件: {row['前置条件']}")

    if row.get("步骤"):
        parts.append(f"步骤: {row['步骤']}")

    if row.get("预期结果"):
        parts.append(f"预期结果: {row['预期结果']}")

    return "\n".join(parts)


def _extract_json(content: str) -> dict | None:
    """从 LLM 响应中提取 JSON。

    Args:
        content: LLM 响应文本

    Returns:
        解析后的字典，失败返回 None
    """
    # 尝试直接解析
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # 尝试从代码块中提取
    match = re.search(r"```json\s*(\{.*?\})\s*```", content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # 尝试搜索 JSON 对象
    match = re.search(r"\{.*\}", content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    return None


async def review_case(case_text: str) -> dict:
    """审查单个用例。

    Args:
        case_text: 用例文本描述

    Returns:
        审查结果字典，包含 verdict, polished, discard_reason 等
    """
    messages = [
        {"role": "system", "content": REVIEW_SYSTEM},
        {"role": "user", "content": f"请审查以下测试用例：\n\n{case_text}"},
    ]

    try:
        result = await invoke_llm(messages, provider="zhipu", model="glm-5")
        data = _extract_json(result.content)

        if data is None:
            return {
                "verdict": "discard",
                "discard_reason": "无法修复: LLM 返回格式异常",
                "raw_response": result.content[:200],
            }

        verdict = data.get("verdict", "discard")

        if verdict == "pass":
            return {"verdict": "pass"}
        elif verdict == "polish":
            return {
                "verdict": "polish",
                "polished": data.get("polished", {}),
            }
        else:  # discard or unknown
            return {
                "verdict": "discard",
                "discard_reason": data.get("discard_reason", "未知原因"),
            }

    except Exception as e:
        logger.warning("审查失败: %s", e)
        return {
            "verdict": "discard",
            "discard_reason": f"无法修复: {str(e)[:50]}",
        }


def load_progress() -> set[str]:
    """加载已处理的用例 ID 集合（断点续传）。"""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            return set(json.load(f))
    return set()


def save_progress(done_ids: set[str]) -> None:
    """保存已处理的用例 ID 集合。"""
    with open(PROGRESS_FILE, "w") as f:
        json.dump(list(done_ids), f)


def generate_report(review_results: list[dict]) -> dict:
    """生成审查报告。

    Args:
        review_results: 审查结果列表

    Returns:
        报告字典
    """
    total = len(review_results)
    passed = sum(1 for r in review_results if r["verdict"] == "pass")
    polished = sum(1 for r in review_results if r["verdict"] == "polish")
    discarded = sum(1 for r in review_results if r["verdict"] == "discard")

    # 统计丢弃原因
    discard_reasons: dict[str, int] = {}
    for r in review_results:
        if r["verdict"] == "discard":
            reason = r.get("discard_reason", "未知原因")
            discard_reasons[reason] = discard_reasons.get(reason, 0) + 1

    return {
        "total": total,
        "passed": passed,
        "polished": polished,
        "discarded": discarded,
        "discard_reasons": discard_reasons,
    }


async def rebuild_knowledge_chunks() -> int:
    """从 KnowledgeDocument DB 读取，重新向量化。

    Returns:
        处理的文档数量
    """
    from sqlalchemy import select
    from app.core.database import async_session
    from app.modules.knowledge.models import KnowledgeDocument
    from app.engine.rag.chunker import chunk_by_headers
    from app.engine.rag.retriever import index_chunks

    count = 0
    async with async_session() as session:
        result = await session.execute(
            select(KnowledgeDocument).where(
                KnowledgeDocument.deleted_at.is_(None),
                KnowledgeDocument.is_active == True,
                KnowledgeDocument.content.isnot(None),
            )
        )
        documents = result.scalars().all()

        for doc in documents:
            if not doc.content:
                continue

            try:
                chunks = chunk_by_headers(doc.content, source_id=str(doc.id))
                await index_chunks(chunks, doc_id=str(doc.id))
                count += 1
            except Exception as e:
                logger.warning("文档 %s 向量化失败: %s", doc.id, e)

    logger.info("重建 knowledge_chunks: %d 个文档", count)
    return count


# ═══════════════════════════════════════════════════════════════════
# 主流程
# ═══════════════════════════════════════════════════════════════════


async def main(sample: int | None = None, dry_run: bool = False) -> None:
    """主流程。

    Args:
        sample: 每个 CSV 文件最多处理的行数
        dry_run: 是否只打印信息而不实际执行
    """
    logger.info("=" * 60)
    logger.info("历史用例审查脚本启动")
    logger.info("=" * 60)

    # 1. 查找 CSV 文件
    if not os.path.exists(DATA_DIR):
        logger.error("数据目录不存在: %s", DATA_DIR)
        sys.exit(1)

    csv_files = list(Path(DATA_DIR).glob("**/*.csv"))
    logger.info("找到 %d 个 CSV 文件", len(csv_files))

    if dry_run:
        logger.info("DRY-RUN 模式: 找到 %d 个 CSV 文件，跳过实际审查", len(csv_files))
        return

    # 2. 重建 collections
    logger.info("重建 Qdrant collections...")
    recreate_collection(collection_name=TESTCASE_COLLECTION, vector_size=EMBEDDING_DIMENSION)
    recreate_collection(collection_name=COLLECTION_NAME, vector_size=EMBEDDING_DIMENSION)

    # 3. 重建知识库向量
    logger.info("重建知识库向量...")
    await rebuild_knowledge_chunks()

    # 4. 加载进度
    done_ids = load_progress()
    logger.info("已处理 %d 条用例", len(done_ids))

    # 5. 初始化统计
    review_results: list[dict] = []
    total_cases = 0
    indexed_count = 0

    # 6. 处理每个 CSV 文件
    for csv_file in csv_files:
        logger.info("处理文件: %s", csv_file)

        try:
            cases = read_csv_cases(str(csv_file), sample=sample)
        except Exception as e:
            logger.error("读取文件失败 %s: %s", csv_file, e)
            continue

        for row_index, row in enumerate(cases):
            total_cases += 1

            # 生成稳定 ID
            point_id = make_point_id(str(csv_file), row_index)

            # 幂等检查
            if point_id in done_ids:
                continue

            # 转换为文本
            case_text = csv_row_to_text(row)

            # 审查
            try:
                result = await review_case(case_text)
                result["point_id"] = point_id
                result["file"] = str(csv_file)
                result["row_index"] = row_index
                review_results.append(result)
            except Exception as e:
                logger.error("审查失败 %s:%d: %s", csv_file, row_index, e)
                review_results.append({
                    "verdict": "discard",
                    "discard_reason": f"审查异常: {str(e)[:50]}",
                    "point_id": point_id,
                })
                continue

            # 处理审查结果
            if result["verdict"] in ("pass", "polish"):
                # 嵌入并入库
                try:
                    vectors = await embed_texts([case_text], batch_size=1)

                    client = QdrantClient(
                        url=settings.qdrant_url,
                        timeout=30,
                        trust_env=False,
                    )

                    payload = {
                        "testcase_id": point_id,
                        "title": row.get("用例标题", ""),
                        "module": row.get("所属模块", ""),
                        "requirement": row.get("相关需求", ""),
                        "priority": row.get("优先级", ""),
                        "case_type": row.get("用例类型", ""),
                        "content": case_text,
                        "file": str(csv_file),
                    }

                    if result["verdict"] == "polish":
                        payload["polished"] = result.get("polished", {})

                    point = models.PointStruct(
                        id=point_id,
                        vector=vectors[0],
                        payload=payload,
                    )

                    client.upsert(collection_name=TESTCASE_COLLECTION, points=[point])
                    indexed_count += 1

                except Exception as e:
                    logger.error("入库失败 %s: %s", point_id, e)

            # 标记为已处理
            done_ids.add(point_id)

            # 进度打印
            if total_cases % 50 == 0:
                logger.info("进度: 已处理 %d 条用例", total_cases)

            # rate limit 控制
            await asyncio.sleep(0.3)

    # 7. 保存进度
    save_progress(done_ids)

    # 8. 生成报告
    report = generate_report(review_results)

    # 9. 保存报告
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    # 10. 打印汇总表格
    logger.info("=" * 60)
    logger.info("审查完成!")
    logger.info("=" * 60)
    logger.info("汇总统计:")
    logger.info("  总数:    %d", report["total"])
    logger.info("  通过:    %d", report["passed"])
    logger.info("  润色:    %d", report["polished"])
    logger.info("  丢弃:    %d", report["discarded"])
    logger.info("  入库数:  %d", indexed_count)

    if report["discard_reasons"]:
        logger.info("\n丢弃原因分布:")
        for reason, count in report["discard_reasons"].items():
            logger.info("  - %s: %d", reason, count)

    logger.info("\n报告已保存: %s", REPORT_FILE)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="历史测试用例 LLM 审查脚本")
    parser.add_argument(
        "--sample",
        type=int,
        default=None,
        help="每个 CSV 文件只取前 N 行",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="不实际调用 LLM，只打印读取到的文件数",
    )
    args = parser.parse_args()

    asyncio.run(main(sample=args.sample, dry_run=args.dry_run))
