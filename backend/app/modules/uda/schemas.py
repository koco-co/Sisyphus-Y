from __future__ import annotations

import uuid

from pydantic import BaseModel

from app.shared.base_schema import BaseResponse, BaseSchema


class ParsedDocumentResponse(BaseResponse):
    requirement_id: uuid.UUID | None
    original_filename: str
    file_type: str
    file_size: int
    content_text: str | None
    content_ast: dict | None
    parse_status: str
    error_message: str | None


class ParseRequest(BaseSchema):
    requirement_id: uuid.UUID | None = None
    title: str | None = None


class RequirementItem(BaseModel):
    """单个需求条目（从文档章节拆分）"""

    temp_id: str
    title: str
    content: str
    level: int


class ParseStructureResponse(BaseModel):
    """文档结构化解析响应"""

    items: list[RequirementItem]
    confidence: float
    confidence_reason: str
    raw_text: str
    file_type: str
    total_sections: int
