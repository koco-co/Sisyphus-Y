"""CSV 批量清洗异步任务 — 从待清洗数据目录扫描并清洗历史用例。"""

from __future__ import annotations

import asyncio
import logging

from app.core.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.tasks.clean_task.clean_csv_batch",
    queue="import",
    max_retries=1,
)
def clean_csv_batch(self, data_dir: str, product_id: str | None = None) -> dict:
    """扫描 data_dir 下所有 CSV 文件，解析、评分、写入数据库。

    Args:
        data_dir: 待清洗数据根目录路径
        product_id: 可选，关联到哪个产品
    """
    self.update_state(state="STARTED", meta={"step": "discovering", "progress": 0})

    try:
        from app.engine.import_clean.batch_parser import discover_csv_files, parse_csv_file
        from app.engine.import_clean.cleaner import score_test_case

        csv_files = discover_csv_files(data_dir)
        if not csv_files:
            return {"status": "success", "total_files": 0, "total_cases": 0, "message": "No CSV files found"}

        total_files = len(csv_files)
        all_cases: list[dict] = []

        for idx, csv_path in enumerate(csv_files):
            self.update_state(
                state="STARTED",
                meta={
                    "step": "parsing",
                    "progress": int((idx / total_files) * 50),
                    "current_file": csv_path.name,
                    "files_processed": idx,
                    "total_files": total_files,
                },
            )

            try:
                cases = parse_csv_file(csv_path)
                for case in cases:
                    case["quality_score"] = score_test_case(case)
                    case["_source_file"] = str(csv_path)
                all_cases.extend(cases)
            except Exception:
                logger.warning("Failed to parse %s", csv_path, exc_info=True)

        self.update_state(
            state="STARTED",
            meta={"step": "saving", "progress": 60, "total_cases": len(all_cases)},
        )

        loop = asyncio.new_event_loop()
        try:
            saved_cases, saved = loop.run_until_complete(_persist_cleaned_cases(all_cases, product_id))
        finally:
            loop.close()

        # Vectorize saved cases into Qdrant (best-effort, non-blocking)
        vectorized = 0
        if saved_cases:
            self.update_state(
                state="STARTED",
                meta={"step": "vectorizing", "progress": 85, "total_cases": len(all_cases)},
            )
            try:
                from app.engine.import_clean.vectorizer import upsert_cases_to_qdrant

                loop2 = asyncio.new_event_loop()
                try:
                    vectorized = loop2.run_until_complete(upsert_cases_to_qdrant(saved_cases))
                finally:
                    loop2.close()
            except Exception:
                logger.warning("向量化步骤失败（非致命）", exc_info=True)

        self.update_state(state="STARTED", meta={"step": "complete", "progress": 100})
        return {
            "status": "success",
            "total_files": total_files,
            "total_cases": len(all_cases),
            "saved_cases": saved,
            "vectorized_cases": vectorized,
        }

    except Exception as exc:
        logger.error("批量清洗失败: %s", exc, exc_info=True)
        return {"status": "failed", "error": str(exc)}


async def _persist_cleaned_cases(cases: list[dict], product_id: str | None) -> tuple[list[dict], int]:
    """将清洗后的用例写入 test_cases 表（upsert by case_id）。

    Returns:
        (enriched_cases_with_db_id, saved_count)
        enriched_cases 中包含 ``_db_id`` 字段，供后续向量化使用。
    """
    import uuid as uuid_mod

    from sqlalchemy import select

    from app.core.database import get_async_session_context
    from app.modules.products.models import Product, Requirement
    from app.modules.testcases.models import TestCase

    saved = 0
    saved_cases_out: list[dict] = []
    async with get_async_session_context() as session:
        # Find or create a placeholder requirement for imported cases
        req_id: uuid_mod.UUID | None = None
        if product_id:
            pid = uuid_mod.UUID(product_id)
            q = select(Requirement).where(
                Requirement.product_id == pid,
                Requirement.title == "__imported_placeholder__",
                Requirement.deleted_at.is_(None),
            )
            result = await session.execute(q)
            req = result.scalar_one_or_none()
            if not req:
                # Find product's first iteration
                pq = select(Product).where(Product.id == pid)
                product = (await session.execute(pq)).scalar_one_or_none()
                if product:
                    from app.modules.products.models import Iteration

                    iq = (
                        select(Iteration)
                        .where(
                            Iteration.product_id == pid,
                            Iteration.deleted_at.is_(None),
                        )
                        .limit(1)
                    )
                    iteration = (await session.execute(iq)).scalar_one_or_none()
                    if iteration:
                        req = Requirement(
                            product_id=pid,
                            iteration_id=iteration.id,
                            title="__imported_placeholder__",
                            content="历史导入用例占位需求",
                            source="imported",
                            status="approved",
                        )
                        session.add(req)
                        await session.flush()
            if req:
                req_id = req.id

        if not req_id:
            logger.warning("No product_id or placeholder requirement available, skipping persistence")
            return [], 0

        for case in cases:
            existing_case_id = case.get("case_id", "")
            if existing_case_id:
                q = select(TestCase).where(
                    TestCase.case_id == existing_case_id,
                    TestCase.deleted_at.is_(None),
                )
                existing = (await session.execute(q)).scalar_one_or_none()
                if existing:
                    existing.quality_score = case.get("quality_score")
                    existing.original_raw = case.get("original_raw")
                    existing.clean_status = "scored"
                    saved_cases_out.append({**case, "_db_id": str(existing.id), "clean_status": "scored"})
                    saved += 1
                    continue

            # Generate a new case_id for cases without one
            if not existing_case_id:
                existing_case_id = f"IMP-{uuid_mod.uuid4().hex[:8].upper()}"

            tc = TestCase(
                requirement_id=req_id,
                case_id=existing_case_id,
                title=case.get("title", ""),
                precondition=case.get("precondition") or None,
                steps=case.get("steps", []),
                priority=case.get("priority", "P1"),
                case_type=case.get("case_type", "functional"),
                module_path=case.get("module_path") or None,
                tags=case.get("tags", []),
                source="imported",
                clean_status="scored",
                quality_score=case.get("quality_score"),
                original_raw=case.get("original_raw"),
            )
            session.add(tc)
            await session.flush()
            saved_cases_out.append({**case, "_db_id": str(tc.id), "clean_status": "scored"})
            saved += 1

    return saved_cases_out, saved
