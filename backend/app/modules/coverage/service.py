from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.products.models import Iteration, Requirement
from app.modules.testcases.models import TestCase


class CoverageService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_iteration_coverage(self, iteration_id: UUID) -> dict:
        req_q = select(Requirement).where(
            Requirement.iteration_id == iteration_id,
            Requirement.deleted_at.is_(None),
        )
        req_result = await self.session.execute(req_q)
        requirements = list(req_result.scalars().all())

        if not requirements:
            return {
                "requirements": [],
                "test_cases": [],
                "matrix": [],
                "coverage_rate": 0,
                "uncovered_requirements": [],
            }

        req_ids = [r.id for r in requirements]

        tc_q = select(TestCase).where(
            TestCase.requirement_id.in_(req_ids),
            TestCase.deleted_at.is_(None),
        )
        tc_result = await self.session.execute(tc_q)
        test_cases = list(tc_result.scalars().all())

        req_list = [{"id": str(r.id), "req_id": r.req_id, "title": r.title} for r in requirements]
        tc_list = [{"id": str(tc.id), "case_id": tc.case_id, "title": tc.title} for tc in test_cases]

        matrix = []
        for req in requirements:
            row = [tc.requirement_id == req.id for tc in test_cases]
            matrix.append(row)

        covered_req_ids = {tc.requirement_id for tc in test_cases}
        coverage_rate = len(covered_req_ids) / len(requirements) * 100 if requirements else 0
        uncovered = [
            {"id": str(r.id), "req_id": r.req_id, "title": r.title} for r in requirements if r.id not in covered_req_ids
        ]

        return {
            "requirements": req_list,
            "test_cases": tc_list,
            "matrix": matrix,
            "coverage_rate": round(coverage_rate, 1),
            "uncovered_requirements": uncovered,
        }

    async def get_product_coverage(self, product_id: UUID) -> dict:
        iter_q = select(Iteration).where(
            Iteration.product_id == product_id,
            Iteration.deleted_at.is_(None),
        )
        iter_result = await self.session.execute(iter_q)
        iterations = list(iter_result.scalars().all())

        results = []
        for iteration in iterations:
            cov = await self.get_iteration_coverage(iteration.id)
            results.append(
                {
                    "iteration_id": str(iteration.id),
                    "iteration_name": iteration.name,
                    "coverage_rate": cov["coverage_rate"],
                    "requirement_count": len(cov["requirements"]),
                    "testcase_count": len(cov["test_cases"]),
                    "uncovered_count": len(cov["uncovered_requirements"]),
                }
            )

        return {"iterations": results}
