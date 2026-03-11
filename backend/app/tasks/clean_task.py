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
    """扫描 data_dir 下所有 CSV 文件，通过完整清洗流水线处理后写入 DB + Qdrant。

    Args:
        data_dir: 待清洗数据根目录路径
        product_id: 暂未使用，保留接口兼容
    """
    self.update_state(state="STARTED", meta={"step": "initializing", "progress": 0})

    loop = asyncio.new_event_loop()
    try:
        from app.core.database import get_async_session_context
        from app.engine.import_clean.pipeline import run_pipeline

        async def _run() -> dict:
            self.update_state(state="STARTED", meta={"step": "running", "progress": 10})
            async with get_async_session_context() as session:
                stats = await run_pipeline(data_dir, db=session)
            return {
                "status": "success",
                "total_files": stats.total_files,
                "total_cases": stats.total_cases,
                "high": stats.high,
                "review": stats.review,
                "polished": stats.polished,
                "discarded": stats.discarded,
                "failed": stats.failed,
            }

        result = loop.run_until_complete(_run())
        self.update_state(state="STARTED", meta={"step": "complete", "progress": 100})
        return result

    except Exception as exc:
        logger.error("批量清洗失败: %s", exc, exc_info=True)
        return {"status": "failed", "error": str(exc)}
    finally:
        loop.close()
