import uuid

from fastapi import APIRouter

from app.core.dependencies import AsyncSessionDep
from app.modules.execution.schemas import (
    BatchExecutionRequest,
    ExecutionResultCreate,
    ExecutionResultResponse,
)
from app.modules.execution.service import ExecutionService

router = APIRouter(prefix="/execution", tags=["execution"])


@router.post("/results", response_model=ExecutionResultResponse, status_code=201)
async def submit_result(data: ExecutionResultCreate, session: AsyncSessionDep) -> ExecutionResultResponse:
    svc = ExecutionService(session)
    result = await svc.submit_result(data)
    return ExecutionResultResponse.model_validate(result)


@router.post("/results/batch")
async def batch_submit(data: BatchExecutionRequest, session: AsyncSessionDep) -> dict:
    svc = ExecutionService(session)
    results = await svc.batch_submit(data.results)
    return {"submitted": len(results)}


@router.get("/results/{test_case_id}")
async def get_results(test_case_id: uuid.UUID, session: AsyncSessionDep) -> list[dict]:
    svc = ExecutionService(session)
    results = await svc.get_results(test_case_id)
    return [
        {
            "id": str(r.id),
            "status": r.status,
            "executor": r.executor,
            "duration_seconds": r.duration_seconds,
            "failure_reason": r.failure_reason,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in results
    ]


@router.get("/stats")
async def get_execution_stats(session: AsyncSessionDep) -> dict:
    svc = ExecutionService(session)
    return await svc.get_stats()
