"""M02 历史数据导入清洗 — Router"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.core.dependencies import AsyncSessionDep
from app.modules.import_clean.schemas import (
    BatchFromDirectoryRequest,
    BatchPipelineStatsResponse,
    BatchRecordAction,
    FieldMappingResponse,
    FieldMappingUpdate,
    HealthReportResponse,
    ImportJobResponse,
    ImportRecordAction,
    ImportRecordResponse,
    TaskStatusResponse,
)
from app.modules.import_clean.service import ImportJobService, ImportRecordService

router = APIRouter(prefix="/import-clean", tags=["import-clean"])


# ── Job endpoints ──────────────────────────────────────────────────


@router.post("/upload", response_model=ImportJobResponse, status_code=status.HTTP_201_CREATED)
async def upload_import_file(
    session: AsyncSessionDep,
    file: Annotated[UploadFile, File(...)],
    product_id: uuid.UUID | None = None,
) -> ImportJobResponse:
    """上传导入文件并创建导入任务，自动解析文件内容。"""
    if not file.filename:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "文件名不能为空")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    file_type_map = {"csv": "csv", "xlsx": "excel", "xls": "excel", "md": "markdown"}
    file_type = file_type_map.get(ext)
    if not file_type:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"不支持的文件类型: {ext}")

    svc = ImportJobService(session)
    job = await svc.create_job(file_name=file.filename, file_type=file_type, product_id=product_id)

    data = await file.read()
    await svc.parse_file_content(job.id, data, file_type)
    await session.refresh(job)

    return ImportJobResponse.model_validate(job)


@router.get("/jobs", response_model=list[ImportJobResponse])
async def list_jobs(
    session: AsyncSessionDep,
    product_id: uuid.UUID | None = None,
) -> list[ImportJobResponse]:
    """列出导入任务。"""
    svc = ImportJobService(session)
    jobs = await svc.list_jobs(product_id=product_id)
    return [ImportJobResponse.model_validate(j) for j in jobs]


@router.get("/jobs/{job_id}", response_model=ImportJobResponse)
async def get_job(session: AsyncSessionDep, job_id: uuid.UUID) -> ImportJobResponse:
    """获取导入任务详情。"""
    svc = ImportJobService(session)
    job = await svc.get_job(job_id)
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "导入任务不存在")
    return ImportJobResponse.model_validate(job)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(session: AsyncSessionDep, job_id: uuid.UUID) -> None:
    """软删除导入任务。"""
    svc = ImportJobService(session)
    await svc.soft_delete_job(job_id)


# ── 字段映射 ──────────────────────────────────────────────────────


@router.post("/jobs/{job_id}/map-fields", response_model=FieldMappingResponse)
async def auto_map_fields(session: AsyncSessionDep, job_id: uuid.UUID) -> FieldMappingResponse:
    """AI 自动字段映射。"""
    svc = ImportJobService(session)
    mapping = await svc.auto_map_fields(job_id)
    unmapped = [k for k, v in mapping.items() if v is None]
    return FieldMappingResponse(mapping=mapping, unmapped_columns=unmapped)


@router.put("/jobs/{job_id}/map-fields")
async def update_field_mapping(
    session: AsyncSessionDep,
    job_id: uuid.UUID,
    body: FieldMappingUpdate,
) -> FieldMappingResponse:
    """手动调整字段映射。"""
    svc = ImportJobService(session)
    await svc.update_field_mapping(job_id, body.mapping)
    unmapped = [k for k, v in body.mapping.items() if v is None]
    return FieldMappingResponse(mapping=body.mapping, unmapped_columns=unmapped)


@router.post("/jobs/{job_id}/apply-mapping")
async def apply_field_mapping(session: AsyncSessionDep, job_id: uuid.UUID) -> dict:
    """应用字段映射到所有记录。"""
    svc = ImportJobService(session)
    count = await svc.apply_field_mapping(job_id)
    return {"mapped_count": count}


# ── 重复检测 ──────────────────────────────────────────────────────


@router.post("/jobs/{job_id}/detect-duplicates")
async def detect_duplicates(session: AsyncSessionDep, job_id: uuid.UUID) -> dict:
    """执行重复检测。"""
    svc = ImportJobService(session)
    dup_count = await svc.detect_duplicates(job_id)
    return {"duplicate_count": dup_count}


# ── 健康报告 ──────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/health-report", response_model=HealthReportResponse)
async def get_health_report(session: AsyncSessionDep, job_id: uuid.UUID) -> HealthReportResponse:
    """生成并返回导入健康报告。"""
    svc = ImportJobService(session)
    report = await svc.generate_health_report(job_id)
    return HealthReportResponse(**report)


# ── 批量操作与完成 ────────────────────────────────────────────────


@router.post("/jobs/{job_id}/batch-action")
async def batch_action(
    session: AsyncSessionDep,
    job_id: uuid.UUID,
    body: BatchRecordAction,
) -> dict:
    """批量确认/跳过记录。"""
    svc = ImportJobService(session)
    count = await svc.batch_confirm(job_id, body.record_ids, body.action)
    return {"affected_count": count}


@router.post("/jobs/{job_id}/complete", response_model=ImportJobResponse)
async def complete_job(session: AsyncSessionDep, job_id: uuid.UUID) -> ImportJobResponse:
    """完成导入任务。"""
    svc = ImportJobService(session)
    job = await svc.complete_job(job_id)
    return ImportJobResponse.model_validate(job)


# ── Record endpoints ──────────────────────────────────────────────


@router.get("/jobs/{job_id}/records", response_model=list[ImportRecordResponse])
async def list_records(
    session: AsyncSessionDep,
    job_id: uuid.UUID,
    status_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
    search: str | None = None,
) -> list[ImportRecordResponse]:
    """列出导入记录（支持分页和搜索）。"""
    from sqlalchemy import select

    from app.modules.import_clean.models import ImportRecord

    stmt = select(ImportRecord).where(
        ImportRecord.job_id == job_id,
        ImportRecord.deleted_at.is_(None),
    )
    if status_filter:
        stmt = stmt.where(ImportRecord.status == status_filter)
    if search:
        stmt = stmt.where(ImportRecord.original_title.ilike(f"%{search}%"))
    stmt = stmt.order_by(ImportRecord.row_number).limit(limit).offset(offset)
    result = await session.execute(stmt)
    records = list(result.scalars().all())
    return [ImportRecordResponse.model_validate(r) for r in records]


@router.get("/records/count")
async def count_all_records(
    session: AsyncSessionDep,
    search: str | None = None,
) -> dict:
    """统计所有导入记录数量。"""
    from sqlalchemy import func, select

    from app.modules.import_clean.models import ImportRecord

    stmt = select(func.count()).select_from(ImportRecord).where(ImportRecord.deleted_at.is_(None))
    if search:
        stmt = stmt.where(ImportRecord.original_title.ilike(f"%{search}%"))
    result = await session.execute(stmt)
    return {"total": result.scalar() or 0}


@router.get("/records/all", response_model=list[ImportRecordResponse])
async def list_all_records(
    session: AsyncSessionDep,
    limit: int = 50,
    offset: int = 0,
    search: str | None = None,
) -> list[ImportRecordResponse]:
    """列出所有导入记录（跨所有 Job，支持分页和搜索）。"""
    from sqlalchemy import select

    from app.modules.import_clean.models import ImportRecord

    stmt = select(ImportRecord).where(ImportRecord.deleted_at.is_(None))
    if search:
        stmt = stmt.where(ImportRecord.original_title.ilike(f"%{search}%"))
    stmt = stmt.order_by(ImportRecord.created_at.desc(), ImportRecord.row_number).limit(limit).offset(offset)
    result = await session.execute(stmt)
    records = list(result.scalars().all())
    return [ImportRecordResponse.model_validate(r) for r in records]


@router.get("/discarded", response_model=list[ImportRecordResponse])
async def list_discarded_records(
    session: AsyncSessionDep,
    limit: int = 200,
    offset: int = 0,
) -> list[ImportRecordResponse]:
    """列出所有清洗后被丢弃（score < 2.0）的导入记录，跨所有 Job。"""
    svc = ImportRecordService(session)
    records = await svc.list_discarded_records(limit=limit, offset=offset)
    return [ImportRecordResponse.model_validate(r) for r in records]


async def record_action(
    session: AsyncSessionDep,
    record_id: uuid.UUID,
    body: ImportRecordAction,
) -> ImportRecordResponse:
    """对导入记录执行操作。"""
    svc = ImportRecordService(session)
    record = await svc.apply_action(record_id, action=body.action, merge_target_id=body.merge_target_id)
    return ImportRecordResponse.model_validate(record)


# ── 批量清洗 ──────────────────────────────────────────────────────


@router.post("/batch-from-directory", response_model=BatchPipelineStatsResponse)
async def batch_from_directory(body: BatchFromDirectoryRequest) -> BatchPipelineStatsResponse:
    """触发从指定目录批量清洗 CSV 历史用例（异步 Celery 任务）。

    遍历 data_dir 下所有 CSV 文件，执行：
    1. 自动检测格式（数栈平台 / 信永中和）
    2. HTML 剥离 + LLM 清洗（GLM-4-Flash）
    3. 0-5 质量评分与路由（高/审查/润色/丢弃）
    4. 写入 PostgreSQL import_records
    5. 写入 Qdrant sisyphus_cleaned_cases collection

    使用 GET /import-clean/clean/status/{task_id} 轮询进度。
    """
    from app.worker.tasks.clean_tasks import clean_csv_batch

    task = clean_csv_batch.delay(body.data_dir, None)
    return BatchPipelineStatsResponse(
        task_id=task.id,
        status="queued",
        data_dir=body.data_dir,
        message="批量清洗任务已入队，共 65 个 CSV 文件待处理。使用 task_id 查询进度。",
    )


@router.post("/clean/trigger")
async def trigger_batch_clean(
    data_dir: str = "待清洗数据",
    product_id: uuid.UUID | None = None,
) -> dict:
    """触发 CSV 批量清洗任务。（兼容旧接口，推荐使用 /batch-from-directory）"""
    from app.worker.tasks.clean_tasks import clean_csv_batch

    task = clean_csv_batch.delay(data_dir, str(product_id) if product_id else None)
    return {"task_id": task.id, "status": "queued"}


@router.get("/clean/status/{task_id}", response_model=TaskStatusResponse)
async def get_clean_status(task_id: str) -> TaskStatusResponse:
    """查询批量清洗任务状态。"""
    from celery.result import AsyncResult

    from app.worker.celery_app import celery_app

    result = AsyncResult(task_id, app=celery_app)
    meta = result.info if isinstance(result.info, dict) else {}

    return TaskStatusResponse(
        task_id=task_id,
        status=result.status,
        progress=meta.get("progress"),
        step=meta.get("step"),
        result=meta if result.ready() else None,
    )
