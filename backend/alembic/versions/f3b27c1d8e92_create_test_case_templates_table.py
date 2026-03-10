"""create test case templates table

Revision ID: f3b27c1d8e92
Revises: 8f4b46d7a911
Create Date: 2026-03-10 11:15:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "f3b27c1d8e92"
down_revision: str | Sequence[str] | None = "8f4b46d7a911"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "test_case_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column(
            "category",
            sa.String(length=50),
            nullable=False,
            server_default=sa.text("'functional'"),
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "template_content",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("variables", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "usage_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "is_builtin",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_test_case_templates_category",
        "test_case_templates",
        ["category"],
        unique=False,
    )
    op.create_index(
        "ix_test_case_templates_status",
        "test_case_templates",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_test_case_templates_deleted_at",
        "test_case_templates",
        ["deleted_at"],
        unique=False,
    )

    template_table = sa.table(
        "test_case_templates",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String(length=200)),
        sa.column("category", sa.String(length=50)),
        sa.column("description", sa.Text()),
        sa.column("template_content", postgresql.JSONB(astext_type=sa.Text())),
        sa.column("variables", postgresql.JSONB(astext_type=sa.Text())),
        sa.column("usage_count", sa.Integer()),
        sa.column("is_builtin", sa.Boolean()),
        sa.column("created_by", postgresql.UUID(as_uuid=True)),
        sa.column("status", sa.String(length=20)),
    )

    op.bulk_insert(
        template_table,
        [
            {
                "id": "2c6db91a-08bb-4a6d-a08f-3cddc9ea6001",
                "name": "登录功能标准模板",
                "category": "functional",
                "description": "覆盖正常/异常登录流程，包含密码校验、验证码、SSO 等场景",
                "template_content": {
                    "tags": ["登录", "认证", "SSO"],
                    "precondition": "已准备好{{username}}测试账号",
                    "steps": [
                        {"step": 1, "action": "输入正确的用户名和密码", "expected": "登录成功，跳转到首页"},
                        {"step": 2, "action": "输入错误密码", "expected": "提示密码错误，剩余尝试次数"},
                        {"step": 3, "action": "连续5次错误密码", "expected": "账号锁定，提示联系管理员"},
                    ],
                },
                "variables": {"username": "test_user"},
                "usage_count": 42,
                "is_builtin": True,
                "created_by": None,
                "status": "active",
            },
            {
                "id": "2c6db91a-08bb-4a6d-a08f-3cddc9ea6002",
                "name": "CRUD 操作通用模板",
                "category": "functional",
                "description": "增删改查基础操作覆盖，含边界值和权限检查",
                "template_content": {
                    "tags": ["CRUD", "通用"],
                    "precondition": "已进入{{module_name}}模块",
                    "steps": [
                        {"step": 1, "action": "创建记录（必填+选填）", "expected": "记录创建成功"},
                        {"step": 2, "action": "查询刚创建的记录", "expected": "查询结果正确展示"},
                        {"step": 3, "action": "修改记录部分字段", "expected": "修改成功，数据更新"},
                    ],
                },
                "variables": {"module_name": "业务模块"},
                "usage_count": 38,
                "is_builtin": True,
                "created_by": None,
                "status": "active",
            },
            {
                "id": "2c6db91a-08bb-4a6d-a08f-3cddc9ea6003",
                "name": "API 接口测试模板",
                "category": "api",
                "description": "RESTful API 接口标准测试，含参数校验、权限、幂等性",
                "template_content": {
                    "tags": ["API", "REST", "接口"],
                    "precondition": "接口 {{endpoint}} 已部署且鉴权配置完成",
                    "steps": [
                        {"step": 1, "action": "发送正常请求", "expected": "返回 200，数据符合 Schema"},
                        {"step": 2, "action": "缺少必填参数", "expected": "返回 422，错误提示明确"},
                        {"step": 3, "action": "无权限请求", "expected": "返回 403，无数据泄露"},
                    ],
                },
                "variables": {"endpoint": "/api/resource"},
                "usage_count": 25,
                "is_builtin": True,
                "created_by": None,
                "status": "active",
            },
            {
                "id": "2c6db91a-08bb-4a6d-a08f-3cddc9ea6004",
                "name": "文件上传测试模板",
                "category": "functional",
                "description": "文件上传场景全覆盖，含大小限制、格式校验、断点续传",
                "template_content": {
                    "tags": ["上传", "文件"],
                    "precondition": "已准备{{file_type}}测试文件",
                    "steps": [
                        {"step": 1, "action": "上传支持格式的文件", "expected": "上传成功，预览正常"},
                        {"step": 2, "action": "上传超过大小限制的文件", "expected": "提示文件过大"},
                        {"step": 3, "action": "上传不支持格式的文件", "expected": "提示格式不支持"},
                    ],
                },
                "variables": {"file_type": "图片"},
                "usage_count": 18,
                "is_builtin": True,
                "created_by": None,
                "status": "active",
            },
            {
                "id": "2c6db91a-08bb-4a6d-a08f-3cddc9ea6005",
                "name": "安全测试基线模板",
                "category": "security",
                "description": "OWASP Top 10 基础安全测试检查项",
                "template_content": {
                    "tags": ["安全", "OWASP", "XSS"],
                    "precondition": "测试环境已开启安全审计日志",
                    "steps": [
                        {"step": 1, "action": "在输入框注入 XSS 脚本", "expected": "输入被转义，无脚本执行"},
                        {"step": 2, "action": "SQL 注入测试", "expected": "参数被正确过滤"},
                        {"step": 3, "action": "CSRF Token 验证", "expected": "无 Token 请求被拒绝"},
                    ],
                },
                "variables": {},
                "usage_count": 12,
                "is_builtin": True,
                "created_by": None,
                "status": "active",
            },
        ],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_test_case_templates_deleted_at", table_name="test_case_templates")
    op.drop_index("ix_test_case_templates_status", table_name="test_case_templates")
    op.drop_index("ix_test_case_templates_category", table_name="test_case_templates")
    op.drop_table("test_case_templates")
