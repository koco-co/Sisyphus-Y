from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.testcases.models import TestCase, TestCaseStep, TestCaseVersion


class TestCaseService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_cases(
        self,
        requirement_id: UUID | None = None,
        status: str | None = None,
        priority: str | None = None,
        case_type: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[TestCase], int]:
        q = select(TestCase).where(TestCase.deleted_at.is_(None))
        count_q = select(func.count()).select_from(TestCase).where(TestCase.deleted_at.is_(None))

        if requirement_id:
            q = q.where(TestCase.requirement_id == requirement_id)
            count_q = count_q.where(TestCase.requirement_id == requirement_id)
        if status:
            q = q.where(TestCase.status == status)
            count_q = count_q.where(TestCase.status == status)
        if priority:
            q = q.where(TestCase.priority == priority)
            count_q = count_q.where(TestCase.priority == priority)
        if case_type:
            q = q.where(TestCase.case_type == case_type)
            count_q = count_q.where(TestCase.case_type == case_type)

        total = (await self.session.execute(count_q)).scalar() or 0
        q = q.order_by(TestCase.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await self.session.execute(q)
        return list(result.scalars().all()), total

    async def get_case(self, case_id: UUID) -> TestCase | None:
        q = select(TestCase).where(TestCase.id == case_id, TestCase.deleted_at.is_(None))
        result = await self.session.execute(q)
        return result.scalar_one_or_none()

    async def create_case(self, **kwargs: object) -> TestCase:
        tc = TestCase(**kwargs)
        self.session.add(tc)
        await self.session.commit()
        await self.session.refresh(tc)
        return tc

    async def update_case(self, case_id: UUID, **kwargs: object) -> TestCase | None:
        tc = await self.get_case(case_id)
        if not tc:
            return None
        # Create version snapshot before updating
        await self._create_version(tc)
        for key, value in kwargs.items():
            if hasattr(tc, key) and value is not None:
                setattr(tc, key, value)
        tc.version += 1
        await self.session.commit()
        await self.session.refresh(tc)
        return tc

    async def soft_delete(self, case_id: UUID) -> bool:
        tc = await self.get_case(case_id)
        if not tc:
            return False
        tc.deleted_at = datetime.now(UTC)
        await self.session.commit()
        return True

    async def batch_update_status(self, case_ids: list[UUID], status: str) -> int:
        count = 0
        for cid in case_ids:
            tc = await self.get_case(cid)
            if tc:
                tc.status = status
                count += 1
        await self.session.commit()
        return count

    async def get_steps(self, case_id: UUID) -> list[TestCaseStep]:
        q = (
            select(TestCaseStep)
            .where(TestCaseStep.test_case_id == case_id, TestCaseStep.deleted_at.is_(None))
            .order_by(TestCaseStep.step_num)
        )
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def add_step(self, case_id: UUID, step_num: int, action: str, expected_result: str) -> TestCaseStep:
        step = TestCaseStep(
            test_case_id=case_id,
            step_num=step_num,
            action=action,
            expected_result=expected_result,
        )
        self.session.add(step)
        await self.session.commit()
        await self.session.refresh(step)
        return step

    async def _create_version(self, tc: TestCase) -> TestCaseVersion:
        steps = await self.get_steps(tc.id)
        snapshot = {
            "title": tc.title,
            "priority": tc.priority,
            "case_type": tc.case_type,
            "precondition": tc.precondition,
            "steps": [
                {"step_num": s.step_num, "action": s.action, "expected_result": s.expected_result} for s in steps
            ],
        }
        version = TestCaseVersion(
            test_case_id=tc.id,
            version=tc.version,
            snapshot=snapshot,
        )
        self.session.add(version)
        return version

    async def count_by_requirement(self, requirement_id: UUID) -> int:
        q = select(func.count()).where(
            TestCase.requirement_id == requirement_id,
            TestCase.deleted_at.is_(None),
        )
        return (await self.session.execute(q)).scalar() or 0
