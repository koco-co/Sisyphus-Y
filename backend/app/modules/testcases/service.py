from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.testcases.models import TestCase, TestCaseStep, TestCaseVersion
from app.modules.testcases.schemas import TestCaseCreate, TestCaseUpdate


class TestCaseService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, data: TestCaseCreate) -> TestCase:
        case_data = data.model_dump(exclude={"steps"})
        tc = TestCase(**case_data, source="manual")
        self.session.add(tc)
        await self.session.flush()

        for i, step in enumerate(data.steps, 1):
            s = TestCaseStep(test_case_id=tc.id, step_num=i, **step.model_dump())
            self.session.add(s)

        await self.session.commit()
        await self.session.refresh(tc)
        return tc

    async def list_cases(
        self,
        requirement_id: UUID | None = None,
        priority: str | None = None,
        case_type: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> list[TestCase]:
        q = select(TestCase).where(TestCase.deleted_at.is_(None))
        if requirement_id:
            q = q.where(TestCase.requirement_id == requirement_id)
        if priority:
            q = q.where(TestCase.priority == priority)
        if case_type:
            q = q.where(TestCase.case_type == case_type)
        if status:
            q = q.where(TestCase.status == status)
        q = q.offset((page - 1) * page_size).limit(page_size)
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def get(self, case_id: UUID) -> TestCase | None:
        return await self.session.get(TestCase, case_id)

    async def update(self, tc: TestCase, data: TestCaseUpdate) -> TestCase:
        snapshot = {
            "title": tc.title,
            "priority": tc.priority,
            "case_type": tc.case_type,
            "status": tc.status,
        }
        version = TestCaseVersion(
            test_case_id=tc.id,
            version=tc.version,
            snapshot=snapshot,
            change_reason="manual_edit",
        )
        self.session.add(version)

        for field, value in data.model_dump(exclude_none=True, exclude={"steps"}).items():
            setattr(tc, field, value)
        tc.version += 1

        if data.steps is not None:
            existing = await self.session.execute(select(TestCaseStep).where(TestCaseStep.test_case_id == tc.id))
            for s in existing.scalars():
                await self.session.delete(s)
            for i, step in enumerate(data.steps, 1):
                self.session.add(TestCaseStep(test_case_id=tc.id, step_num=i, **step.model_dump()))

        await self.session.commit()
        await self.session.refresh(tc)
        return tc

    async def soft_delete(self, tc: TestCase) -> None:
        tc.deleted_at = datetime.now(UTC)
        await self.session.commit()
