import difflib
import json
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.diff.models import RequirementDiff
from app.modules.products.models import Requirement, RequirementVersion
from app.modules.scene_map.models import SceneMap, TestPoint
from app.modules.testcases.models import TestCase


class DiffService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def compute_diff(self, requirement_id: UUID, version_from: int, version_to: int) -> RequirementDiff:
        old_content = await self._get_version_content(requirement_id, version_from)
        new_content = await self._get_version_content(requirement_id, version_to)

        # Phase 1: Text-level diff (Myers algorithm via difflib)
        old_text = json.dumps(old_content, ensure_ascii=False, indent=2) if old_content else ""
        new_text = json.dumps(new_content, ensure_ascii=False, indent=2) if new_content else ""

        differ = difflib.unified_diff(
            old_text.splitlines(keepends=True),
            new_text.splitlines(keepends=True),
            fromfile=f"v{version_from}",
            tofile=f"v{version_to}",
        )
        diff_lines = list(differ)

        text_diff = {
            "additions": len([line for line in diff_lines if line.startswith("+") and not line.startswith("+++")]),
            "deletions": len([line for line in diff_lines if line.startswith("-") and not line.startswith("---")]),
            "diff_text": "".join(diff_lines[:200]),
        }

        total_changes = text_diff["additions"] + text_diff["deletions"]
        if total_changes == 0:
            impact_level = "none"
        elif total_changes < 5:
            impact_level = "low"
        elif total_changes < 20:
            impact_level = "medium"
        else:
            impact_level = "high"

        affected_tp = await self._find_affected_test_points(requirement_id)
        affected_tc = await self._find_affected_test_cases(requirement_id)

        diff_record = RequirementDiff(
            requirement_id=requirement_id,
            version_from=version_from,
            version_to=version_to,
            text_diff=text_diff,
            impact_level=impact_level,
            affected_test_points=affected_tp,
            affected_test_cases=affected_tc,
            summary=(f"变更影响等级: {impact_level}, 新增{text_diff['additions']}行, 删除{text_diff['deletions']}行"),
        )
        self.session.add(diff_record)
        await self.session.commit()
        await self.session.refresh(diff_record)
        return diff_record

    async def get_diffs(self, requirement_id: UUID) -> list[RequirementDiff]:
        q = (
            select(RequirementDiff)
            .where(
                RequirementDiff.requirement_id == requirement_id,
                RequirementDiff.deleted_at.is_(None),
            )
            .order_by(RequirementDiff.created_at.desc())
        )
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def get_latest_diff(self, requirement_id: UUID) -> RequirementDiff | None:
        q = (
            select(RequirementDiff)
            .where(
                RequirementDiff.requirement_id == requirement_id,
                RequirementDiff.deleted_at.is_(None),
            )
            .order_by(RequirementDiff.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(q)
        return result.scalar_one_or_none()

    async def _get_version_content(self, requirement_id: UUID, version: int) -> dict | None:
        q = select(RequirementVersion).where(
            RequirementVersion.requirement_id == requirement_id,
            RequirementVersion.version == version,
        )
        result = await self.session.execute(q)
        rv = result.scalar_one_or_none()
        if rv:
            return rv.content_ast
        req = await self.session.get(Requirement, requirement_id)
        if req and req.version == version:
            return req.content_ast
        return None

    async def _find_affected_test_points(self, requirement_id: UUID) -> dict:
        q = select(SceneMap).where(
            SceneMap.requirement_id == requirement_id,
            SceneMap.deleted_at.is_(None),
        )
        result = await self.session.execute(q)
        scene_map = result.scalar_one_or_none()
        if not scene_map:
            return {"count": 0, "items": []}

        tp_q = select(TestPoint).where(
            TestPoint.scene_map_id == scene_map.id,
            TestPoint.deleted_at.is_(None),
        )
        tp_result = await self.session.execute(tp_q)
        test_points = list(tp_result.scalars().all())
        return {
            "count": len(test_points),
            "items": [{"id": str(tp.id), "title": tp.title, "status": "needs_review"} for tp in test_points],
        }

    async def _find_affected_test_cases(self, requirement_id: UUID) -> dict:
        tc_q = select(TestCase).where(
            TestCase.requirement_id == requirement_id,
            TestCase.deleted_at.is_(None),
        )
        tc_result = await self.session.execute(tc_q)
        test_cases = list(tc_result.scalars().all())
        return {
            "count": len(test_cases),
            "items": [
                {
                    "id": str(tc.id),
                    "case_id": tc.case_id,
                    "title": tc.title,
                    "impact": "needs_review",
                }
                for tc in test_cases
            ],
        }
