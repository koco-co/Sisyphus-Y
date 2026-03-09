import uuid

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import AsyncSessionDep
from app.modules.testcases.schemas import (
    TestCaseCreate,
    TestCaseResponse,
    TestCaseUpdate,
)
from app.modules.testcases.service import TestCaseService

router = APIRouter(prefix="/testcases", tags=["testcases"])


@router.get("", response_model=list[TestCaseResponse])
async def list_testcases(
    session: AsyncSessionDep,
    requirement_id: uuid.UUID | None = None,
    priority: str | None = None,
    case_type: str | None = None,
    status_filter: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> list[TestCaseResponse]:
    svc = TestCaseService(session)
    cases = await svc.list_cases(requirement_id, priority, case_type, status_filter, page, page_size)
    return [TestCaseResponse.model_validate(c) for c in cases]


@router.post("", response_model=TestCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_testcase(data: TestCaseCreate, session: AsyncSessionDep) -> TestCaseResponse:
    svc = TestCaseService(session)
    tc = await svc.create(data)
    return TestCaseResponse.model_validate(tc)


@router.get("/{case_id}", response_model=TestCaseResponse)
async def get_testcase(case_id: uuid.UUID, session: AsyncSessionDep) -> TestCaseResponse:
    svc = TestCaseService(session)
    tc = await svc.get(case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="TestCase not found")
    return TestCaseResponse.model_validate(tc)


@router.patch("/{case_id}", response_model=TestCaseResponse)
async def update_testcase(case_id: uuid.UUID, data: TestCaseUpdate, session: AsyncSessionDep) -> TestCaseResponse:
    svc = TestCaseService(session)
    tc = await svc.get(case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="TestCase not found")
    tc = await svc.update(tc, data)
    return TestCaseResponse.model_validate(tc)


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_testcase(case_id: uuid.UUID, session: AsyncSessionDep) -> None:
    svc = TestCaseService(session)
    tc = await svc.get(case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="TestCase not found")
    await svc.soft_delete(tc)
