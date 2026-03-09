import uuid

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.dependencies import AsyncSessionDep
from app.modules.scene_map.schemas import (
    SceneMapResponse,
    TestPointCreate,
    TestPointResponse,
    TestPointUpdate,
)
from app.modules.scene_map.service import SceneMapService

router = APIRouter(prefix="/scene-map", tags=["scene_map"])


@router.get("/{requirement_id}", response_model=SceneMapResponse)
async def get_scene_map(requirement_id: uuid.UUID, session: AsyncSessionDep) -> SceneMapResponse:
    svc = SceneMapService(session)
    scene_map = await svc.get_or_create(requirement_id)
    test_points = await svc.list_test_points(scene_map.id)
    resp = SceneMapResponse.model_validate(scene_map)
    resp.test_points = [TestPointResponse.model_validate(tp) for tp in test_points]
    return resp


@router.post("/{requirement_id}/generate")
async def generate_scene_map(requirement_id: uuid.UUID, session: AsyncSessionDep) -> StreamingResponse:
    svc = SceneMapService(session)
    stream = await svc.generate_stream(requirement_id)
    return StreamingResponse(stream, media_type="text/event-stream")


@router.post(
    "/{requirement_id}/test-points",
    response_model=TestPointResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_test_point(
    requirement_id: uuid.UUID,
    data: TestPointCreate,
    session: AsyncSessionDep,
) -> TestPointResponse:
    svc = SceneMapService(session)
    scene_map = await svc.get_or_create(requirement_id)
    tp = await svc.add_test_point(scene_map.id, data)
    return TestPointResponse.model_validate(tp)


@router.patch("/test-points/{tp_id}", response_model=TestPointResponse)
async def update_test_point(
    tp_id: uuid.UUID,
    data: TestPointUpdate,
    session: AsyncSessionDep,
) -> TestPointResponse:
    svc = SceneMapService(session)
    tp = await svc.get_test_point(tp_id)
    if not tp:
        raise HTTPException(status_code=404, detail="TestPoint not found")
    tp = await svc.update_test_point(tp, data)
    return TestPointResponse.model_validate(tp)


@router.delete("/test-points/{tp_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_point(tp_id: uuid.UUID, session: AsyncSessionDep) -> None:
    svc = SceneMapService(session)
    tp = await svc.get_test_point(tp_id)
    if not tp:
        raise HTTPException(status_code=404, detail="TestPoint not found")
    await svc.soft_delete_test_point(tp)
