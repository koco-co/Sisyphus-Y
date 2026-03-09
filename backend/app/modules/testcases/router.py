import uuid

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.dependencies import AsyncSessionDep
from app.modules.testcases.service import TestCaseService

router = APIRouter(prefix="/testcases", tags=["testcases"])


class TestCaseCreate(BaseModel):
    requirement_id: uuid.UUID
    test_point_id: uuid.UUID | None = None
    case_id: str
    title: str
    priority: str = "P1"
    case_type: str = "normal"
    precondition: str | None = None
    source: str = "manual"


class TestCaseUpdate(BaseModel):
    title: str | None = None
    priority: str | None = None
    case_type: str | None = None
    status: str | None = None
    precondition: str | None = None


class BatchStatusUpdate(BaseModel):
    case_ids: list[uuid.UUID]
    status: str


class StepCreate(BaseModel):
    step_num: int
    action: str
    expected_result: str


@router.get("/")
async def list_cases(
    session: AsyncSessionDep,
    requirement_id: uuid.UUID | None = None,
    status: str | None = None,
    priority: str | None = None,
    case_type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict:
    svc = TestCaseService(session)
    cases, total = await svc.list_cases(requirement_id, status, priority, case_type, page, page_size)
    return {
        "items": [
            {
                "id": str(tc.id),
                "requirement_id": str(tc.requirement_id),
                "test_point_id": str(tc.test_point_id) if tc.test_point_id else None,
                "case_id": tc.case_id,
                "title": tc.title,
                "priority": tc.priority,
                "case_type": tc.case_type,
                "status": tc.status,
                "source": tc.source,
                "ai_score": tc.ai_score,
                "version": tc.version,
                "created_at": tc.created_at.isoformat() if tc.created_at else "",
            }
            for tc in cases
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{case_id}")
async def get_case(case_id: uuid.UUID, session: AsyncSessionDep) -> dict:
    svc = TestCaseService(session)
    tc = await svc.get_case(case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    steps = await svc.get_steps(tc.id)
    return {
        "id": str(tc.id),
        "requirement_id": str(tc.requirement_id),
        "test_point_id": str(tc.test_point_id) if tc.test_point_id else None,
        "case_id": tc.case_id,
        "title": tc.title,
        "priority": tc.priority,
        "case_type": tc.case_type,
        "status": tc.status,
        "source": tc.source,
        "ai_score": tc.ai_score,
        "precondition": tc.precondition,
        "version": tc.version,
        "steps": [{"step_num": s.step_num, "action": s.action, "expected_result": s.expected_result} for s in steps],
        "created_at": tc.created_at.isoformat() if tc.created_at else "",
    }


@router.post("/", status_code=201)
async def create_case(data: TestCaseCreate, session: AsyncSessionDep) -> dict:
    svc = TestCaseService(session)
    tc = await svc.create_case(
        requirement_id=data.requirement_id,
        test_point_id=data.test_point_id,
        case_id=data.case_id,
        title=data.title,
        priority=data.priority,
        case_type=data.case_type,
        precondition=data.precondition,
        source=data.source,
    )
    return {"id": str(tc.id), "case_id": tc.case_id}


@router.patch("/{case_id}")
async def update_case(case_id: uuid.UUID, data: TestCaseUpdate, session: AsyncSessionDep) -> dict:
    svc = TestCaseService(session)
    tc = await svc.update_case(
        case_id,
        title=data.title,
        priority=data.priority,
        case_type=data.case_type,
        status=data.status,
        precondition=data.precondition,
    )
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    return {"id": str(tc.id), "version": tc.version}


@router.delete("/{case_id}")
async def delete_case(case_id: uuid.UUID, session: AsyncSessionDep) -> dict:
    svc = TestCaseService(session)
    success = await svc.soft_delete(case_id)
    if not success:
        raise HTTPException(status_code=404, detail="Test case not found")
    return {"ok": True}


@router.post("/batch-status")
async def batch_update_status(data: BatchStatusUpdate, session: AsyncSessionDep) -> dict:
    svc = TestCaseService(session)
    count = await svc.batch_update_status(data.case_ids, data.status)
    return {"updated": count}


@router.post("/{case_id}/steps", status_code=201)
async def add_step(case_id: uuid.UUID, data: StepCreate, session: AsyncSessionDep) -> dict:
    svc = TestCaseService(session)
    tc = await svc.get_case(case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    step = await svc.add_step(case_id, data.step_num, data.action, data.expected_result)
    return {"id": str(step.id)}


@router.get("/{case_id}/steps")
async def get_steps(case_id: uuid.UUID, session: AsyncSessionDep) -> list[dict]:
    svc = TestCaseService(session)
    steps = await svc.get_steps(case_id)
    return [
        {"id": str(s.id), "step_num": s.step_num, "action": s.action, "expected_result": s.expected_result}
        for s in steps
    ]
