import uuid

from fastapi import APIRouter

from app.core.dependencies import AsyncSessionDep
from app.modules.coverage.service import CoverageService

router = APIRouter(prefix="/coverage", tags=["coverage"])


@router.get("/iteration/{iteration_id}")
async def get_iteration_coverage(iteration_id: uuid.UUID, session: AsyncSessionDep) -> dict:
    svc = CoverageService(session)
    return await svc.get_iteration_coverage(iteration_id)


@router.get("/product/{product_id}")
async def get_product_coverage(product_id: uuid.UUID, session: AsyncSessionDep) -> dict:
    svc = CoverageService(session)
    return await svc.get_product_coverage(product_id)
