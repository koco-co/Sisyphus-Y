"""Celery worker stub. Actual async tasks will be added as needed."""

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "sisyphus",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
)


@celery_app.task(name="sisyphus.health_check")
def health_check() -> dict:
    return {"status": "ok"}
