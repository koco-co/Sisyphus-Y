"""Celery tasks for CSV batch cleaning pipeline."""

from __future__ import annotations

import asyncio
import logging

from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="app.worker.tasks.clean_tasks.clean_csv_batch")
def clean_csv_batch(self, data_dir: str, product_id: str | None = None) -> dict:
    """Run CSV batch cleaning pipeline synchronously via asyncio."""
    self.update_state(state="STARTED", meta={"step": "initializing", "progress": 0})

    async def _run() -> dict:
        from pathlib import Path

        from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
        from sqlalchemy.orm import sessionmaker

        from app.core.config import settings
        from app.engine.import_clean.pipeline import run_pipeline

        engine = create_async_engine(settings.database_url, echo=False)
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async with async_session() as session:
            self.update_state(state="PROGRESS", meta={"progress": 10, "step": "running pipeline"})
            stats = await run_pipeline(
                root_dir=Path(data_dir),
                db=session,
            )
            return {
                "total": stats.total_cases,
                "high": stats.high,
                "review": stats.review,
                "polished": stats.polished,
                "discarded": stats.discarded,
                "total_files": stats.total_files,
            }

    try:
        result = asyncio.run(_run())
        return result
    except Exception as exc:
        logger.exception("clean_csv_batch failed: %s", exc)
        self.update_state(state="FAILURE", meta={"error": str(exc)})
        raise
