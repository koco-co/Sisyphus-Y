import uuid

from app.shared.base_schema import BaseResponse, BaseSchema


class SessionCreate(BaseSchema):
    requirement_id: uuid.UUID
    mode: str = "test_point_driven"
    model_used: str = "gpt-4o"


class SessionResponse(BaseResponse):
    requirement_id: uuid.UUID
    mode: str
    status: str
    model_used: str


class ChatRequest(BaseSchema):
    message: str
