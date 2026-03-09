from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.execution.models import ExecutionResult
from app.modules.execution.schemas import ExecutionResultCreate


class ExecutionService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def submit_result(self, data: ExecutionResultCreate) -> ExecutionResult:
        result = ExecutionResult(
            test_case_id=data.test_case_id,
            status=data.status,
            executor=data.executor,
            environment=data.environment,
            duration_seconds=data.duration_seconds,
            failure_reason=data.failure_reason,
            notes=data.notes,
        )
        self.session.add(result)
        await self.session.commit()
        await self.session.refresh(result)
        return result

    async def batch_submit(self, results: list[ExecutionResultCreate]) -> list[ExecutionResult]:
        created = []
        for data in results:
            result = await self.submit_result(data)
            created.append(result)
        return created

    async def get_results(self, test_case_id: UUID) -> list[ExecutionResult]:
        q = (
            select(ExecutionResult)
            .where(
                ExecutionResult.test_case_id == test_case_id,
                ExecutionResult.deleted_at.is_(None),
            )
            .order_by(ExecutionResult.created_at.desc())
        )
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def get_stats(self) -> dict:
        total_q = select(func.count()).where(ExecutionResult.deleted_at.is_(None))
        total = (await self.session.execute(total_q)).scalar() or 0

        passed_q = select(func.count()).where(
            ExecutionResult.status == "passed",
            ExecutionResult.deleted_at.is_(None),
        )
        passed = (await self.session.execute(passed_q)).scalar() or 0

        failed_q = select(func.count()).where(
            ExecutionResult.status == "failed",
            ExecutionResult.deleted_at.is_(None),
        )
        failed = (await self.session.execute(failed_q)).scalar() or 0

        return {
            "total": total,
            "passed": passed,
            "failed": failed,
            "pass_rate": round(passed / total * 100, 1) if total > 0 else 0,
        }
