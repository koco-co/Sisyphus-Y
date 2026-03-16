import uuid
from typing import Literal

from app.shared.base_schema import BaseResponse, BaseSchema


class ExportJobCreate(BaseSchema):
    format: Literal["xlsx", "csv", "xmind", "md", "json"] = "xlsx"
    # 导出范围：folder=按目录, requirement=按需求, iteration=按迭代, selected=自由勾选
    scope: Literal["folder", "requirement", "iteration", "selected"] = "iteration"
    # folder_id / requirement_id / iteration_id（scope != "selected" 时使用）
    scope_value: str | None = None
    # scope="selected" 时使用的用例 ID 列表
    case_ids: list[str] | None = None
    # 自定义导出字段，None=全字段；XMind 格式忽略此参数
    fields: list[str] | None = None
    # 兼容旧字段（向后兼容）
    iteration_id: uuid.UUID | None = None
    requirement_id: uuid.UUID | None = None
    filter_criteria: dict | None = None
    created_by: uuid.UUID | None = None


class ExportJobResponse(BaseResponse):
    iteration_id: uuid.UUID | None = None
    requirement_id: uuid.UUID | None = None
    format: str
    status: str
    file_path: str | None = None
    filter_criteria: dict | None = None
    case_count: int = 0
    error_message: str | None = None
    created_by: uuid.UUID | None = None


class ExportJobStatusResponse(BaseSchema):
    id: uuid.UUID
    status: str
    file_path: str | None = None
    case_count: int = 0
    error_message: str | None = None


# ── Jira/Xray Push (B-M12-08) ────────────────────────────────────


class JiraConfig(BaseSchema):
    base_url: str
    project_key: str
    auth_token: str
    test_plan_key: str | None = None
    labels: list[str] = []
    custom_fields: dict | None = None


class JiraPushRequest(BaseSchema):
    job_id: uuid.UUID
    jira_config: JiraConfig


class JiraPushResponse(BaseSchema):
    job_id: uuid.UUID
    status: str
    pushed_count: int = 0
    failed_count: int = 0
    jira_issues: list[dict] = []
    error_message: str | None = None
