import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.prompts import SCENE_MAP_SYSTEM
from app.ai.stream_adapter import get_thinking_stream
from app.modules.products.models import Requirement
from app.modules.scene_map.models import SceneMap, TestPoint
from app.modules.scene_map.schemas import TestPointCreate, TestPointUpdate


class SceneMapService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create(self, requirement_id: UUID) -> SceneMap:
        q = select(SceneMap).where(
            SceneMap.requirement_id == requirement_id,
            SceneMap.deleted_at.is_(None),
        )
        result = await self.session.execute(q)
        scene_map = result.scalar_one_or_none()
        if scene_map:
            return scene_map

        scene_map = SceneMap(requirement_id=requirement_id)
        self.session.add(scene_map)
        await self.session.commit()
        await self.session.refresh(scene_map)
        return scene_map

    async def list_test_points(self, scene_map_id: UUID) -> list[TestPoint]:
        q = select(TestPoint).where(
            TestPoint.scene_map_id == scene_map_id,
            TestPoint.deleted_at.is_(None),
        )
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def add_test_point(self, scene_map_id: UUID, data: TestPointCreate) -> TestPoint:
        tp = TestPoint(scene_map_id=scene_map_id, source="manual", **data.model_dump())
        self.session.add(tp)
        await self.session.commit()
        await self.session.refresh(tp)
        return tp

    async def update_test_point(self, tp: TestPoint, data: TestPointUpdate) -> TestPoint:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(tp, field, value)
        await self.session.commit()
        await self.session.refresh(tp)
        return tp

    async def soft_delete_test_point(self, tp: TestPoint) -> None:
        tp.deleted_at = datetime.now(UTC)
        await self.session.commit()

    async def get_test_point(self, tp_id: UUID) -> TestPoint | None:
        q = select(TestPoint).where(TestPoint.id == tp_id, TestPoint.deleted_at.is_(None))
        result = await self.session.execute(q)
        return result.scalar_one_or_none()

    async def generate_stream(self, requirement_id: UUID) -> AsyncIterator[str]:
        req = await self.session.get(Requirement, requirement_id)
        content = json.dumps(req.content_ast, ensure_ascii=False) if req else ""
        messages = [
            {"role": "user", "content": f"需求标题：{req.title if req else ''}\n\n需求内容：\n{content}"},
        ]
        return await get_thinking_stream(messages, system=SCENE_MAP_SYSTEM)
