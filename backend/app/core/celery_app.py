"""Celery 应用实例配置。"""

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "sisyphus",
    broker=settings.celery_broker_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    # 序列化
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    # 时区
    timezone="Asia/Shanghai",
    enable_utc=True,
    # 任务行为
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # 结果过期（24 小时）
    result_expires=86400,
    # 死信队列
    task_reject_on_worker_lost=True,
    task_default_queue="default",
    task_queues={
        "default": {"exchange": "default", "routing_key": "default"},
        "import": {"exchange": "import", "routing_key": "import"},
        "ai": {"exchange": "ai", "routing_key": "ai"},
        "export": {"exchange": "export", "routing_key": "export"},
        "dead_letter": {"exchange": "dead_letter", "routing_key": "dead_letter"},
    },
    task_routes={
        "app.tasks.parse_task.*": {"queue": "import"},
        "app.tasks.embed_task.*": {"queue": "ai"},
        "app.tasks.diagnosis_task.*": {"queue": "ai"},
        "app.tasks.diff_task.*": {"queue": "ai"},
        "app.tasks.export_task.*": {"queue": "export"},
    },
)

celery_app.autodiscover_tasks(["app.tasks"])
