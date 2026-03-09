import uuid

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.dependencies import AsyncSessionDep
from app.modules.generation.service import GenerationService

router = APIRouter(prefix="/generation", tags=["generation"])


class CreateSessionRequest(BaseModel):
    requirement_id: uuid.UUID
    mode: str = "test_point_driven"


class ChatRequest(BaseModel):
    message: str


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
    # Save user message
    await svc.save_message(session_id, "user", data.message)
    stream = await svc.chat_stream(session_id, data.message)
    return StreamingResponse(stream, media_type="text/event-stream")
