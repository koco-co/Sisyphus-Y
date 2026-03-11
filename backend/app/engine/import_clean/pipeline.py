"""历史用例 CSV 批量清洗流水线。

执行步骤：
1. 遍历 ``root_dir`` 下所有 CSV 文件
2. 按目录层级提取 product（第1层）/ module（第2层）
3. 解析每条用例（两种 CSV 格式自动检测）
4. 规则评分 → 路由（high / review / polish / discard）
5. polish 档再次 LLM 润色 + 重新评分
6. 写入 PostgreSQL（testcases 表 via upsert）
7. 写入 Qdrant（sisyphus_cleaned_cases collection）
8. 提取高质量规范（quality_score >= 4.5）写入 prompt_rules.py
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.engine.import_clean.batch_parser import discover_csv_files, parse_csv_file
from app.engine.import_clean.cleaner import (
    SCORE_POLISH,
    llm_clean_case,
    normalize_empty_values,
    route_by_score,
    score_test_case,
    strip_html_tags,
)
from app.engine.import_clean.vectorizer import upsert_cases_to_qdrant

logger = logging.getLogger(__name__)

# Maximum LLM concurrency to avoid rate limiting
_LLM_CONCURRENCY = 5


@dataclass
class PipelineStats:
    """Accumulates pipeline run statistics."""

    total_files: int = 0
    total_cases: int = 0
    high: int = 0
    review: int = 0
    polished: int = 0
    discarded: int = 0
    failed: int = 0
    discarded_reasons: list[dict] = field(default_factory=list)


@dataclass
class CleanedCase:
    """A fully cleaned and scored test case ready for persistence."""

    product: str
    module: str
    module_path: str
    priority: str
    case_type: str
    tags: list[str]
    original_raw: dict
    title: str
    precondition: str
    steps: list[dict]
    quality_score: float
    clean_status: str  # high | review | polished | discarded


def _extract_product_module(csv_path: Path, root_dir: Path) -> tuple[str, str]:
    """Derive (product, module) from the file's relative path under root_dir.

    Directory structure:
      root_dir/
        <product>/           ← level 1
          <module_group>/    ← level 2 (may have sub-dirs)
            *.csv
    """
    try:
        rel = csv_path.relative_to(root_dir)
        parts = rel.parts  # e.g. ('数栈平台', '数据资产_STD', 'DataAssets_v6.4.8', 'xxx.csv')
        product = parts[0] if len(parts) >= 1 else "未知产品"
        module = parts[1] if len(parts) >= 2 else "通用"
        return product, module
    except ValueError:
        return "未知产品", "通用"


async def _clean_single(raw_case: dict, semaphore: asyncio.Semaphore) -> dict:
    """Apply LLM cleaning to one case under concurrency limit."""
    async with semaphore:
        try:
            return await llm_clean_case(raw_case)
        except Exception:
            logger.warning("LLM 清洗失败，使用原始数据: %s", raw_case.get("title", "")[:50], exc_info=True)
            return {
                "title": strip_html_tags(raw_case.get("title", "")),
                "precondition": strip_html_tags(raw_case.get("precondition", "")),
                "steps": raw_case.get("steps", []),
            }


async def _process_csv_file(
    csv_path: Path,
    root_dir: Path,
    semaphore: asyncio.Semaphore,
    stats: PipelineStats,
) -> list[CleanedCase]:
    """Parse and clean all cases from a single CSV file."""
    product, module = _extract_product_module(csv_path, root_dir)

    try:
        raw_cases = parse_csv_file(csv_path)
    except Exception:
        logger.error("CSV 解析失败: %s", csv_path, exc_info=True)
        stats.failed += 1
        return []

    results: list[CleanedCase] = []

    for raw in raw_cases:
        raw["product"] = product
        raw["module"] = module

        # Pre-clean HTML and normalize empties before LLM call
        raw_for_llm = dict(raw)
        raw_for_llm["title"] = normalize_empty_values(strip_html_tags(raw.get("title", "")))
        raw_for_llm["precondition"] = normalize_empty_values(strip_html_tags(raw.get("precondition", "")))
        for step in raw_for_llm.get("steps", []):
            step["action"] = normalize_empty_values(strip_html_tags(step.get("action", "")))
            step["expected_result"] = normalize_empty_values(strip_html_tags(step.get("expected_result", "")))

        if not raw_for_llm["title"]:
            stats.discarded += 1
            stats.discarded_reasons.append({"title": "(空)", "reason": "标题为空"})
            continue

        # First-pass LLM cleaning
        cleaned = await _clean_single(raw_for_llm, semaphore)
        cleaned["module_path"] = raw.get("module_path", module)
        cleaned["priority"] = raw.get("priority", "P1")

        score = score_test_case(cleaned)
        route = route_by_score(score)

        if route == "discard":
            stats.discarded += 1
            stats.discarded_reasons.append(
                {"title": cleaned["title"], "reason": f"首次评分 {score:.2f} < {SCORE_POLISH}"}
            )
            results.append(
                CleanedCase(
                    product=product,
                    module=module,
                    module_path=cleaned["module_path"],
                    priority=cleaned["priority"],
                    case_type=raw.get("case_type", "functional"),
                    tags=raw.get("tags", []),
                    original_raw=raw.get("original_raw", raw),
                    title=cleaned["title"],
                    precondition=cleaned["precondition"],
                    steps=cleaned["steps"],
                    quality_score=score,
                    clean_status="discarded",
                )
            )
            continue

        if route == "polish":
            # Second-pass LLM polish
            cleaned = await _clean_single(cleaned, semaphore)
            cleaned["module_path"] = raw.get("module_path", module)
            cleaned["priority"] = raw.get("priority", "P1")
            score = score_test_case(cleaned)
            route = route_by_score(score)
            if route == "discard":
                stats.discarded += 1
                stats.discarded_reasons.append(
                    {"title": cleaned["title"], "reason": f"润色后评分 {score:.2f} 仍 < {SCORE_POLISH}"}
                )
                results.append(
                    CleanedCase(
                        product=product,
                        module=module,
                        module_path=cleaned["module_path"],
                        priority=cleaned["priority"],
                        case_type=raw.get("case_type", "functional"),
                        tags=raw.get("tags", []),
                        original_raw=raw.get("original_raw", raw),
                        title=cleaned["title"],
                        precondition=cleaned["precondition"],
                        steps=cleaned["steps"],
                        quality_score=score,
                        clean_status="discarded",
                    )
                )
                continue
            clean_status = "polished"
            stats.polished += 1
        elif route == "high":
            clean_status = "high"
            stats.high += 1
        else:
            clean_status = "review"
            stats.review += 1

        results.append(
            CleanedCase(
                product=product,
                module=module,
                module_path=cleaned["module_path"],
                priority=cleaned["priority"],
                case_type=raw.get("case_type", "functional"),
                tags=raw.get("tags", []),
                original_raw=raw.get("original_raw", raw),
                title=cleaned["title"],
                precondition=cleaned["precondition"],
                steps=cleaned["steps"],
                quality_score=score,
                clean_status=clean_status,
            )
        )

    stats.total_cases += len(raw_cases)
    return results


async def run_pipeline(
    root_dir: str | Path,
    *,
    db: AsyncSession | None = None,
    dry_run: bool = False,
) -> PipelineStats:
    """Run the full CSV cleaning pipeline.

    Args:
        root_dir: Directory containing the CSV files (e.g. ``待清洗数据/``).
        db: AsyncSession for writing to PostgreSQL. Skip DB writes if None.
        dry_run: If True, skip all persistence (LLM cleaning still runs).

    Returns:
        PipelineStats with counts and discarded reasons.
    """
    root_dir = Path(root_dir)
    stats = PipelineStats()
    semaphore = asyncio.Semaphore(_LLM_CONCURRENCY)

    csv_files = discover_csv_files(root_dir)
    stats.total_files = len(csv_files)
    logger.info("发现 %d 个 CSV 文件，开始清洗流水线 (dry_run=%s)", stats.total_files, dry_run)

    all_cleaned: list[CleanedCase] = []

    for csv_path in csv_files:
        logger.info("处理: %s", csv_path.relative_to(root_dir))
        cases = await _process_csv_file(csv_path, root_dir, semaphore, stats)
        all_cleaned.extend(cases)

    importable = [c for c in all_cleaned if c.clean_status != "discarded"]
    logger.info(
        "清洗完成 — total=%d  high=%d  review=%d  polished=%d  discarded=%d  failed=%d",
        stats.total_cases,
        stats.high,
        stats.review,
        stats.polished,
        stats.discarded,
        stats.failed,
    )

    if dry_run:
        logger.info("dry_run=True，跳过持久化")
        return stats

    # Write to PostgreSQL
    if db is not None:
        await _write_to_postgres(all_cleaned, db)

    # Write to Qdrant
    if importable:
        qdrant_cases = [
            {
                "title": c.title,
                "precondition": c.precondition,
                "steps": c.steps,
                "module_path": c.module_path,
                "product": c.product,
                "module": c.module,
                "priority": c.priority,
                "quality_score": c.quality_score,
                "clean_status": c.clean_status,
            }
            for c in importable
        ]
        try:
            inserted = await upsert_cases_to_qdrant(qdrant_cases)
            logger.info("Qdrant 写入完成，共 %d 条", inserted)
        except Exception:
            logger.error("Qdrant 写入失败", exc_info=True)

    return stats


_STATUS_MAP: dict[str, str] = {
    "high": "imported",
    "review": "accepted",
    "polished": "merged",
    "discarded": "rejected",
}


async def _write_to_postgres(
    cases: list[CleanedCase],
    db: AsyncSession,
    *,
    job_id: str | None = None,
) -> None:
    """Write cleaned cases into import_records, grouped under an ImportJob.

    TestCase.requirement_id is non-nullable, so we persist cleaned cases into
    the import_records table instead, which is purpose-built for this workflow.
    The frontend queries import_records for the cleaned case management view.
    """
    import uuid as _uuid

    from app.modules.import_clean.models import ImportJob, ImportRecord

    if job_id is None:
        job = ImportJob(
            file_name="batch_from_directory",
            file_type="csv",
            status="completed",
            total_records=len(cases),
            success_count=sum(1 for c in cases if c.clean_status != "discarded"),
            failed_count=sum(1 for c in cases if c.clean_status == "discarded"),
        )
        db.add(job)
        await db.flush()
        job_id = str(job.id)

    for i, c in enumerate(cases, 1):
        record = ImportRecord(
            job_id=_uuid.UUID(job_id),
            row_number=i,
            original_title=c.original_raw.get("用例标题") or c.original_raw.get("title") or c.title,
            mapped_title=c.title,
            raw_data=c.original_raw,
            mapped_data={
                "title": c.title,
                "precondition": c.precondition,
                "steps": c.steps,
                "priority": c.priority,
                "case_type": c.case_type,
                "tags": c.tags,
                "product": c.product,
                "module": c.module,
                "module_path": c.module_path,
                "quality_score": c.quality_score,
                "clean_status": c.clean_status,
            },
            status=_STATUS_MAP.get(c.clean_status, "accepted"),
            match_score=c.quality_score,
        )
        db.add(record)

    await db.commit()
    logger.info("PostgreSQL import_records 写入完成，共 %d 条 (job_id=%s)", len(cases), job_id)
