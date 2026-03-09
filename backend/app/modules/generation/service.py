import json
from collections.abc import AsyncIterator
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.prompts import GENERATION_SYSTEM
from app.ai.stream_adapter import get_thinking_stream
from app.modules.generation.models import GenerationMessage, GenerationSession
from app.modules.generation.schemas import SessionCreate
from app.modules.products.models import Requirement
from app.modules.testcases.models import TestCase


class GenerationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_session(self, data: SessionCreate) -> GenerationSession:
        gs = GenerationSession(**data.model_dump())
        self.session.add(gs)
        await self.session.commit()
        await self.session.refresh(gs)
        return gs

    async def get_session(self, session_id: UUID) -> GenerationSession | None:
        q = select(GenerationSession).where(
            GenerationSession.id == session_id,
            GenerationSession.deleted_at.is_(None),
        )
        result = await self.session.execute(q)
        return result.scalar_one_or_none()

    async def chat_stream(self, session_id: UUID, user_message: str) -> AsyncIterator[str]:
        gs = await self.get_session(session_id)
        req = await self.session.get(Requirement, gs.requirement_id) if gs else None

        history: list[dict] = []
        if gs:
            q = (
                select(GenerationMessage)
                .where(GenerationMessage.session_id == session_id)
                .order_by(GenerationMessage.created_at)
            )
            result = await self.session.execute(q)
            for msg in result.scalars().all():
                history.append({"role": msg.role, "content": msg.content})

        context = ""
        if req:
            content = json.dumps(req.content_ast, ensure_ascii=False)
            context = f"需求标题：{req.title}\n需求内容：\n{content}\n\n"

        history.append({"role": "user", "content": f"{context}{user_message}"})
        return await get_thinking_stream(history, system=GENERATION_SYSTEM)

    async def list_cases(self, requirement_id: UUID) -> list[TestCase]:
        q = select(TestCase).where(
            TestCase.requirement_id == requirement_id,
            TestCase.deleted_at.is_(None),
        )
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def accept_case(self, case_id: UUID) -> TestCase | None:
        tc = await self.session.get(TestCase, case_id)
        if tc and tc.deleted_at is None:
            tc.status = "reviewed"
            await self.session.commit()
            await self.session.refresh(tc)
        return tc
