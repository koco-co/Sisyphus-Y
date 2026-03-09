import uuid

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.core.dependencies import AsyncSessionDep
from app.modules.scene_map.schemas import (
    SceneMapResponse,
    TestPointCreate,
    TestPointResponse,
    TestPointUpdate,
)
from app.modules.scene_map.service import SceneMapService

router = APIRouter(prefix="/scene-map", tags=["scene-map"])


@router.get("/{requirement_id}", response_model=SceneMapResponse)
async def get_scene_map(requirement_id: uuid.UUID, session: AsyncSessionDep) -> SceneMapResponse:
    svc = SceneMapService(session)
    scene_map = await svc.get_map(requirement_id)
    if not scene_map:
        raise HTTPException(status_code=404, detail="Scene map not found")
    test_points = await svc.list_test_points(scene_map.id)
    resp = SceneMapResponse.model_validate(scene_map)
    resp.test_points = [TestPointResponse.model_validate(tp) for tp in test_points]
    return resp


@router.post("/{requirement_id}/generate")
async def generate_scene_map(requirement_id: uuid.UUID, session: AsyncSessionDep) -> StreamingResponse:
    svc = SceneMapService(session)
    await svc.get_or_create(requirement_id)
    stream = await svc.generate_stream(requirement_id)
    return StreamingResponse(stream, media_type="text/event-stream")


@router.post("/{requirement_id}/test-points", response_model=TestPointResponse)
async def add_test_point(
    requirement_id: uuid.UUID,
    data: TestPointCreate,
    session: AsyncSessionDep,
) -> TestPointResponse:
    svc = SceneMapService(session)
    scene_map = await svc.get_or_create(requirement_id)
    tp = await svc.add_test_point(scene_map.id, data)
    return TestPointResponse.model_validate(tp)


@router.patch("/test-points/{test_point_id}", response_model=TestPointResponse)
async def update_test_point(
    test_point_id: uuid.UUID,
    data: TestPointUpdate,
    session: AsyncSessionDep,
) -> TestPointResponse:
    svc = SceneMapService(session)
    tp = await svc.update_test_point(test_point_id, data)
    if not tp:
        raise HTTPException(status_code=404, detail="Test point not found")
    return TestPointResponse.model_validate(tp)


@router.post("/test-points/{test_point_id}/confirm", response_model=TestPointResponse)
async def confirm_test_point(test_point_id: uuid.UUID, session: AsyncSessionDep) -> TestPointResponse:
    svc = SceneMapService(session)
    tp = await svc.confirm_test_point(test_point_id)
    if not tp:
        raise HTTPException(status_code=404, detail="Test point not found")
    return TestPointResponse.model_validate(tp)


@router.delete("/test-points/{test_point_id}")
async def delete_test_point(test_point_id: uuid.UUID, session: AsyncSessionDep) -> dict:
    svc = SceneMapService(session)
    success = await svc.soft_delete_test_point(test_point_id)
    if not success:
        raise HTTPException(status_code=404, detail="Test point not found")
    return {"ok": True}


@router.post("/{requirement_id}/confirm", response_model=SceneMapResponse)
async def confirm_scene_map(requirement_id: uuid.UUID, session: AsyncSessionDep) -> SceneMapResponse:
    svc = SceneMapService(session)
    scene_map = await svc.get_map(requirement_id)
    if not scene_map:
        raise HTTPException(status_code=404, detail="Scene map not found")
    scene_map = await svc.confirm_all(scene_map.id)
    if not scene_map:
        raise HTTPException(status_code=404, detail="Scene map not found")
    test_points = await svc.list_test_points(scene_map.id)
    resp = SceneMapResponse.model_validate(scene_map)
    resp.test_points = [TestPointResponse.model_validate(tp) for tp in test_points]
    return resp
