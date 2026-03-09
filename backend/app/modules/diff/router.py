import uuid

from fastapi import APIRouter

from app.core.dependencies import AsyncSessionDep
from app.modules.diff.schemas import DiffRequest, DiffResponse
from app.modules.diff.service import DiffService

router = APIRouter(prefix="/diff", tags=["diff"])


@router.post("/{requirement_id}/compute", response_model=DiffResponse)
async def compute_diff(
    requirement_id: uuid.UUID,
    data: DiffRequest,
    session: AsyncSessionDep,
) -> DiffResponse:
    svc = DiffService(session)
    diff = await svc.compute_diff(requirement_id, data.version_from, data.version_to)
    return DiffResponse.model_validate(diff)


@router.get("/{requirement_id}/history")
async def list_diffs(requirement_id: uuid.UUID, session: AsyncSessionDep) -> list[dict]:
    svc = DiffService(session)
    diffs = await svc.get_diffs(requirement_id)
    return [
        {
            "id": str(d.id),
            "version_from": d.version_from,
            "version_to": d.version_to,
            "impact_level": d.impact_level,
            "summary": d.summary,
            "created_at": d.created_at.isoformat() if d.created_at else "",
        }
        for d in diffs
    ]


@router.get("/{requirement_id}/latest", response_model=DiffResponse | None)
async def get_latest_diff(requirement_id: uuid.UUID, session: AsyncSessionDep) -> DiffResponse | None:
    svc = DiffService(session)
    diff = await svc.get_latest_diff(requirement_id)
    if not diff:
        return None
    return DiffResponse.model_validate(diff)
