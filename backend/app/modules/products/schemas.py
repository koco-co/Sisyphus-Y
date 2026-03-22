import uuid
from datetime import date

from app.shared.base_schema import BaseResponse, BaseSchema


# ── Requirement Folder schemas ──────────────────────────────────────

class ReqFolderCreate(BaseSchema):
    iteration_id: uuid.UUID
    parent_id: uuid.UUID | None = None
    name: str
    sort_order: int = 0


class ReqFolderUpdate(BaseSchema):
    name: str | None = None
    parent_id: uuid.UUID | None = None
    sort_order: int | None = None


class ReqFolderResponse(BaseResponse):
    iteration_id: uuid.UUID
    parent_id: uuid.UUID | None
    name: str
    sort_order: int
    level: int
    is_system: bool
    requirement_count: int = 0


class ReqFolderTreeNode(BaseSchema):
    id: uuid.UUID
    name: str
    parent_id: uuid.UUID | None
    sort_order: int
    level: int
    is_system: bool
    requirement_count: int = 0
    children: list["ReqFolderTreeNode"] = []

    model_config = {"from_attributes": True}


ReqFolderTreeNode.model_rebuild()


class FolderReorderItem(BaseSchema):
    """单个文件夹排序更新项"""
    id: uuid.UUID
    sort_order: int
    parent_id: uuid.UUID | None = None


class FolderReorderRequest(BaseSchema):
    """批量更新文件夹排序请求"""
    items: list[FolderReorderItem]


class ProductCreate(BaseSchema):
    name: str
    slug: str
    description: str | None = None


class ProductUpdate(BaseSchema):
    name: str | None = None
    slug: str | None = None
    description: str | None = None


class ProductResponse(BaseResponse):
    name: str
    slug: str
    description: str | None


class IterationCreate(BaseSchema):
    product_id: uuid.UUID
    name: str
    start_date: date | None = None
    end_date: date | None = None


class IterationUpdate(BaseSchema):
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None


class IterationResponse(BaseResponse):
    product_id: uuid.UUID
    name: str
    start_date: date | None
    end_date: date | None
    status: str


class RequirementCreate(BaseSchema):
    iteration_id: uuid.UUID
    req_id: str
    title: str
    content_ast: dict | None = None
    frontmatter: dict | None = None
    folder_id: uuid.UUID | None = None


class RequirementUpdate(BaseSchema):
    title: str | None = None
    content_ast: dict | None = None
    frontmatter: dict | None = None
    status: str | None = None
    folder_id: uuid.UUID | None = None


class RequirementResponse(BaseResponse):
    iteration_id: uuid.UUID
    folder_id: uuid.UUID | None = None
    req_id: str
    title: str
    status: str
    version: int
    content_ast: dict | None = None


class RequirementDetailResponse(RequirementResponse):
    frontmatter: dict | None = None
    product_name: str | None = None
    iteration_name: str | None = None


class PublishVersionRequest(BaseSchema):
    version_note: str | None = None


class PublishVersionResponse(BaseSchema):
    requirement_id: uuid.UUID
    version_from: int
    version_to: int
