import logging
import uuid

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.ai.parser import parse_test_cases
from app.ai.sse_collector import SSECollector
from app.core.dependencies import AsyncSessionDep
from app.modules.generation.service import GenerationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/generation", tags=["generation"])


class CreateSessionRequest(BaseModel):
    requirement_id: uuid.UUID
    mode: str = "test_point_driven"


class ChatRequest(BaseModel):
    message: str


async def _save_and_parse(
    session_id: uuid.UUID,
    requirement_id: uuid.UUID,
    full_text: str,
) -> None:
    """Persist assistant message and auto-parse test cases from AI output."""
    from app.core.database import get_async_session_context
    from app.modules.testcases.service import TestCaseService

    async with get_async_session_context() as new_session:
        gen_svc = GenerationService(new_session)
        await gen_svc.save_message(session_id, "assistant", full_text)

        parsed = parse_test_cases(full_text)
        if not parsed:
            return

        tc_svc = TestCaseService(new_session)
        for case in parsed:
            try:
                case_id = f"TC-{uuid.uuid4().hex[:8].upper()}"
                tc = await tc_svc.create_case(
                    requirement_id=requirement_id,
                    case_id=case_id,
                    title=case["title"],
                    priority=case.get("priority", "P1"),
                    case_type=case.get("case_type", "normal"),
                    precondition=case.get("precondition", ""),
                    source="ai",
                )
                for step in case.get("steps", []):
                    await tc_svc.add_step(
                        tc.id,
                        step["step_num"],
                        step["action"],
                        step["expected_result"],
                    )
            except Exception:
                logger.warning("Failed to save parsed test case: %s", case.get("title", ""))


@router.post("/sessions")
async def create_session(data: CreateSessionRequest, session: AsyncSessionDep) -> dict:
    svc = GenerationService(session)
    gen_session = await svc.create_session(data.requirement_id, data.mode)
    return {
        "id": str(gen_session.id),
        "requirement_id": str(gen_session.requirement_id),
        "mode": gen_session.mode,
        "status": gen_session.status,
    }


@router.get("/sessions/by-requirement/{requirement_id}")
async def list_sessions(requirement_id: uuid.UUID, session: AsyncSessionDep) -> list[dict]:
    svc = GenerationService(session)
    sessions = await svc.list_sessions(requirement_id)
    return [
        {
            "id": str(s.id),
            "requirement_id": str(s.requirement_id),
            "mode": s.mode,
            "status": s.status,
            "created_at": s.created_at.isoformat() if s.created_at else "",
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}/messages")
async def list_messages(session_id: uuid.UUID, session: AsyncSessionDep) -> list[dict]:
    svc = GenerationService(session)
    messages = await svc.list_messages(session_id)
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "thinking_content": m.thinking_content,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }
        for m in messages
    ]


@router.post("/sessions/{session_id}/chat")
async def chat(session_id: uuid.UUID, data: ChatRequest, session: AsyncSessionDep) -> StreamingResponse:
    svc = GenerationService(session)
    gen_session = await svc.get_session(session_id)
    if not gen_session:
        raise HTTPException(status_code=404, detail="Session not found")
    await svc.save_message(session_id, "user", data.message)
    stream = await svc.chat_stream(session_id, data.message)

    sid = session_id
    req_id = gen_session.requirement_id

    async def on_complete(full_text: str) -> None:
        await _save_and_parse(sid, req_id, full_text)

    collector = SSECollector(stream, on_complete=on_complete)
    return StreamingResponse(collector, media_type="text/event-stream")


@router.post("/by-requirement/{requirement_id}/chat")
async def chat_by_requirement(
    requirement_id: uuid.UUID,
    data: ChatRequest,
    session: AsyncSessionDep,
) -> StreamingResponse:
    """Chat endpoint that auto-creates a generation session if none exists."""
    svc = GenerationService(session)
    gen_session = await svc.get_or_create_session(requirement_id)
    sid = gen_session.id

    await svc.save_message(sid, "user", data.message)
    stream = await svc.chat_stream(sid, data.message)

    async def on_complete(full_text: str) -> None:
        await _save_and_parse(sid, requirement_id, full_text)

    collector = SSECollector(stream, on_complete=on_complete)
    return StreamingResponse(collector, media_type="text/event-stream")
