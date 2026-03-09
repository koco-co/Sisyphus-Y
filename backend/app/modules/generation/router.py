import uuid

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.dependencies import AsyncSessionDep
from app.modules.generation.schemas import ChatRequest, SessionCreate, SessionResponse
from app.modules.generation.service import GenerationService
from app.modules.testcases.schemas import TestCaseResponse

router = APIRouter(prefix="/generation", tags=["generation"])


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(data: SessionCreate, session: AsyncSessionDep) -> SessionResponse:
    svc = GenerationService(session)
    gs = await svc.create_session(data)
    return SessionResponse.model_validate(gs)


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: uuid.UUID, session: AsyncSessionDep) -> SessionResponse:
    svc = GenerationService(session)
    gs = await svc.get_session(session_id)
    if not gs:
        raise HTTPException(status_code=404, detail="GenerationSession not found")
    return SessionResponse.model_validate(gs)


@router.post("/sessions/{session_id}/chat")
async def chat(
    session_id: uuid.UUID,
    data: ChatRequest,
    session: AsyncSessionDep,
) -> StreamingResponse:
    svc = GenerationService(session)
    gs = await svc.get_session(session_id)
    if not gs:
        raise HTTPException(status_code=404, detail="GenerationSession not found")
    stream = await svc.chat_stream(session_id, data.message)
    return StreamingResponse(stream, media_type="text/event-stream")


@router.get("/sessions/{session_id}/cases", response_model=list[TestCaseResponse])
async def list_cases(session_id: uuid.UUID, session: AsyncSessionDep) -> list[TestCaseResponse]:
    svc = GenerationService(session)
    gs = await svc.get_session(session_id)
    if not gs:
        raise HTTPException(status_code=404, detail="GenerationSession not found")
    cases = await svc.list_cases(gs.requirement_id)
    return [TestCaseResponse.model_validate(c) for c in cases]


@router.post("/sessions/{session_id}/cases/{case_id}/accept", response_model=TestCaseResponse)
async def accept_case(
    session_id: uuid.UUID,
    case_id: uuid.UUID,
    session: AsyncSessionDep,
) -> TestCaseResponse:
    svc = GenerationService(session)
    tc = await svc.accept_case(case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="TestCase not found")
    return TestCaseResponse.model_validate(tc)
