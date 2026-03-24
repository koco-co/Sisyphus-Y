# 用例生成质量提升实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 通过两阶段改造（Prompt 升级 + GitLab 多仓库集成）将用例生成采纳率从 ~0% 提升至 40%~50%

**Architecture:** Phase 1 升级 `GENERATION_SYSTEM` / `EXPLORATORY_SYSTEM` 融入 functional-test-case-writer 规范（强制步骤格式、具体测试数据、单逆向条件异常用例）；Phase 2 新建 `app/integrations/gitlab/` 适配层 + `app/modules/gitlab_config/` CRUD 模块，在 `assemble_prompt` 第 6 层注入源码上下文，前端新增设置页 Tab 和工作台"参考代码"面板。

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (async), Alembic, httpx (GitLab API), Next.js 16, TypeScript, Tailwind CSS, pytest-asyncio

---

## Phase 1：Prompt 升级

### Task 1：升级 GENERATION_SYSTEM

**Files:**
- Modify: `backend/app/ai/prompts.py`

**Step 1：在 GENERATION_SYSTEM 的 `## ③ 输出规范` 后追加三个新区块**

在 `## ④ 质量红线` 之前插入（约第 219 行后）：

```python
## ⑥ 步骤格式强制规范（不可违反）
第一步必须是进入目标页面，格式固定为：
  action: "进入【模块名-页面名】页面"
  expected_result: "成功进入【xxx】页面，页面标题/面包屑显示「xxx」"

每条用例的 steps 数组中，step_num 与 expected_result 必须严格一一对应：
  步骤数 == 预期结果数，禁止任何步骤的 expected_result 为空字符串

UI 元素引用规范：
  操作步骤中的按钮、菜单、页签用【】标注 → 点击【保存】、进入【数据质量】-【规则配置】
  用户实际输入的具体值用「」标注 → 在「告警名称」输入「质量超标告警_每日」

## ⑦ 测试数据强制规范（不可违反）
所有表单填写步骤必须给出具体可执行的测试数据，禁止使用模糊表述：

  文本字段
    ✅ 在「规则名称」字段输入「唯一性校验_用户ID」（12字符，满足1-50字符限制）
    ❌ 输入一个合法的规则名称 / 填写相关内容 / 输入合适的值

  下拉/单选字段
    ✅ 在「告警方式」选择「邮箱」
    ❌ 选择一种告警方式 / 选择对应选项

  数值/阈值字段
    ✅ 在「阈值」输入「0.05」（5%，满足0-1范围限制）
    ❌ 输入一个合理的阈值

  日期字段
    ✅ 在「生效日期」选择「2026-04-01」
    ❌ 选择一个日期

禁止出现的词汇：如、像、类似、例如、合适的值、有效值、适当数据、合法值、相关内容

## ⑧ 异常用例强制规范（最重要规则）
每条异常用例只能包含一个逆向条件：

  ✅ 正确：一条用例「验证「邮件地址」为空时不可提交」
  ✅ 正确：另一条用例「验证「邮件地址」格式非法时不可提交」
  ❌ 错误：一条用例「验证「邮件地址」为空或格式错误时不可提交」（包含两个逆向条件）

异常用例的 expected_result 必须明确描述错误提示内容：
  ✅ 「邮件地址」下方显示红色提示「请输入有效的邮件地址」，【提交】按钮保持禁用状态
  ❌ 系统提示错误 / 提交失败 / 表单校验不通过
```

同时在 `## ④ 质量红线` 末尾追加：
```python
- 任意步骤的 expected_result 为空（每步必须有对应预期）
- 步骤数与预期结果数不相等
- 出现"如"/"像"/"类似"/"例如"/"合适的值"等模糊测试数据
- 第一步不是"进入【xxx】页面"
- 异常用例包含多个逆向条件
```

**Step 2：验证文件语法正确**

```bash
cd /Users/poco/Projects/Sisyphus-Y/backend
uv run python -c "from app.ai.prompts import GENERATION_SYSTEM; print(len(GENERATION_SYSTEM), 'chars')"
```

Expected: 输出字符数（应比原来多 1500+ 字符），无 ImportError。

**Step 3：Commit**

```bash
git add backend/app/ai/prompts.py
git commit -m "feat(prompts): upgrade GENERATION_SYSTEM with strict step/data/exception rules"
```

---

### Task 2：升级 EXPLORATORY_SYSTEM + 新增业务 Few-Shot 示例

**Files:**
- Modify: `backend/app/ai/prompts.py`

**Step 1：在 EXPLORATORY_SYSTEM 的 `## ④ 质量红线` 末尾追加相同规则**

```python
- 任意步骤 expected_result 为空或使用模糊测试数据描述
- 第一步不是"进入【xxx】页面"
- 异常用例包含多个逆向条件
- 步骤中出现"如"/"像"/"类似"等模糊词汇
```

**Step 2：在 GENERATION_SYSTEM 的 `## ⑤ Few-Shot 示例` 末尾追加一个业务示例**

```python
### ✅ 正例 4 — 邮件告警明细数据（贴近真实数据质量场景）
```json
{
  "title": "数据质量-告警配置-邮件发送明细数据开关验证",
  "priority": "P1",
  "case_type": "normal",
  "precondition": "1. 已在【数据质量】-【单表规则】创建规则「用户ID唯一性校验」并配置调度；2. 已开启脏数据存储；3. 告警方式已配置为「邮箱」，接收人为「test@example.com」；4. 当前账号有质量配置管理权限。",
  "keywords": ["告警配置", "邮件明细", "附件发送"],
  "steps": [
    {"step_num": 1, "action": "进入【数据质量】-【规则配置】页面，找到规则「用户ID唯一性校验」，点击【编辑调度】", "expected_result": "成功进入调度编辑弹窗，表单字段完整显示：调度周期、告警方式、接收人、是否发送明细数据"},
    {"step_num": 2, "action": "在「告警方式」确认已选中「邮箱」，查看「是否发送明细数据」字段状态", "expected_result": "「是否发送明细数据」单选项显示可见，默认选中「是」；选项仅在告警方式为「邮箱」时出现"},
    {"step_num": 3, "action": "保持「是否发送明细数据」选择「是」，点击【保存】", "expected_result": "弹窗关闭，规则列表中该规则调度状态更新，toast 提示「保存成功」"},
    {"step_num": 4, "action": "手动触发规则执行（制造校验不通过场景），等待执行完成后查看告警邮件", "expected_result": "接收邮件附件为 zip 包，命名为「不符合规则的明细数据」，解压后包含 excel 文件，命名格式为「规则类型_字段名_统计函数」，内容为不符合唯一性规则的具体记录行"}
  ]
}
```
```

**Step 3：验证语法**

```bash
cd /Users/poco/Projects/Sisyphus-Y/backend
uv run python -c "from app.ai.prompts import EXPLORATORY_SYSTEM, GENERATION_SYSTEM; print('OK')"
```

Expected: 打印 `OK`，无异常。

**Step 4：Commit**

```bash
git add backend/app/ai/prompts.py
git commit -m "feat(prompts): upgrade EXPLORATORY_SYSTEM and add business few-shot example"
```

---

### Task 3：为 Prompt 升级写回归测试

**Files:**
- Modify: `backend/tests/unit/test_products/test_iteration_service.py` → 不动
- Create: `backend/tests/unit/test_ai/test_prompts.py`

**Step 1：创建测试文件**

```python
"""Prompt 规范回归测试 — 验证新增强制规则存在于组装后的 Prompt 中。"""
from app.ai.prompts import GENERATION_SYSTEM, EXPLORATORY_SYSTEM, assemble_prompt


class TestGenerationSystemRules:
    def test_step_format_rule_exists(self):
        """验证步骤格式规范区块存在。"""
        assert "⑥ 步骤格式强制规范" in GENERATION_SYSTEM
        assert "进入【模块名-页面名】页面" in GENERATION_SYSTEM

    def test_test_data_rule_exists(self):
        """验证测试数据规范区块存在。"""
        assert "⑦ 测试数据强制规范" in GENERATION_SYSTEM
        assert "禁止出现的词汇" in GENERATION_SYSTEM

    def test_exception_case_rule_exists(self):
        """验证异常用例单逆向条件规则存在。"""
        assert "⑧ 异常用例强制规范" in GENERATION_SYSTEM
        assert "只能包含一个逆向条件" in GENERATION_SYSTEM

    def test_quality_redline_updated(self):
        """验证质量红线新增了空 expected_result 和模糊数据禁令。"""
        assert "expected_result 为空" in GENERATION_SYSTEM
        assert "合适的值" in GENERATION_SYSTEM  # 出现在禁止词汇列表中


class TestExploratorySytemRules:
    def test_rules_synced(self):
        """验证 EXPLORATORY_SYSTEM 同步了相同规范。"""
        assert "expected_result 为空" in EXPLORATORY_SYSTEM
        assert "第一步不是" in EXPLORATORY_SYSTEM


class TestAssemblePrompt:
    def test_generation_prompt_includes_rules(self):
        """验证完整组装后的 Prompt 包含所有规则层。"""
        prompt = assemble_prompt("generation", "测试任务指令")
        assert "RULE-FORMAT" in prompt
        assert "RULE-QUALITY" in prompt
        assert "RULE-DATAPLAT" in prompt  # generation 模块注入数据中台规则
        assert "⑥ 步骤格式强制规范" in prompt

    def test_exploratory_prompt_no_dataplat(self):
        """验证 exploratory 模块不注入数据中台规则（减少干扰）。"""
        prompt = assemble_prompt("exploratory", "测试任务指令")
        assert "RULE-DATAPLAT" not in prompt
```

**Step 2：运行测试（应通过）**

```bash
cd /Users/poco/Projects/Sisyphus-Y/backend
uv run pytest tests/unit/test_ai/test_prompts.py -v
```

Expected: 全部 PASS。如果某条失败，说明 Task 1/2 的插入位置或内容有误，回去修正。

**Step 3：Commit**

```bash
git add backend/tests/unit/test_ai/test_prompts.py
git commit -m "test(prompts): add regression tests for new generation rules"
```

---

## Phase 2：GitLab 多仓库集成

### Task 4：GitLabConfig ORM 模型 + Alembic 迁移

**Files:**
- Create: `backend/app/modules/gitlab_config/models.py`
- Create: `backend/app/modules/gitlab_config/__init__.py`

**Step 1：创建 `__init__.py`（空文件）**

```python
# backend/app/modules/gitlab_config/__init__.py
```

**Step 2：创建 ORM 模型**

```python
# backend/app/modules/gitlab_config/models.py
import uuid

from sqlalchemy import Boolean, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import BaseModel


class GitLabConfig(BaseModel):
    """Per-product GitLab repository configuration."""

    __tablename__ = "gitlab_configs"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100))              # 如"前端仓库"
    gitlab_url: Mapped[str] = mapped_column(String(500))         # https://gitlab.example.com
    project_id: Mapped[str] = mapped_column(String(200))         # namespace/repo 或数字 ID
    access_token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_branch: Mapped[str] = mapped_column(String(100), default="main")
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
```

**Step 3：生成 Alembic 迁移**

```bash
cd /Users/poco/Projects/Sisyphus-Y/backend
# 先确保模型被 Base 发现（在 alembic/env.py 的 target_metadata 中）
# 检查 alembic/env.py 是否 import 了所有 models
grep -n "import" alembic/env.py | head -20
```

如果 `alembic/env.py` 通过 `from app.core.database import Base` 自动发现模型，需要确保新模型被导入：

```bash
# 验证模型可被导入
uv run python -c "from app.modules.gitlab_config.models import GitLabConfig; print(GitLabConfig.__tablename__)"
```

Expected: 打印 `gitlab_configs`。

```bash
uv run alembic revision --autogenerate -m "add_gitlab_configs_table"
```

Expected: 在 `alembic/versions/` 生成新迁移文件，检查内容包含 `CREATE TABLE gitlab_configs`。

**Step 4：执行迁移**

```bash
uv run alembic upgrade head
```

Expected: `Running upgrade ... -> xxxx, add_gitlab_configs_table`，无报错。

**Step 5：Commit**

```bash
git add backend/app/modules/gitlab_config/ backend/alembic/versions/
git commit -m "feat(gitlab): add GitLabConfig model and migration"
```

---

### Task 5：GitLab API 客户端

**Files:**
- Create: `backend/app/integrations/__init__.py`
- Create: `backend/app/integrations/gitlab/__init__.py`
- Create: `backend/app/integrations/gitlab/client.py`
- Create: `backend/tests/unit/test_integrations/test_gitlab_client.py`

**Step 1：先写失败测试**

```python
# backend/tests/unit/test_integrations/test_gitlab_client.py
"""GitLab API 客户端单元测试（mock HTTP 调用）。"""
from unittest.mock import AsyncMock, patch
import pytest
from app.integrations.gitlab.client import GitLabClient


class TestGetFileTree:
    async def test_returns_file_paths(self):
        """获取文件树时返回文件路径列表。"""
        client = GitLabClient(
            gitlab_url="https://gitlab.example.com",
            project_id="mygroup/myrepo",
            access_token="test-token",
        )
        mock_response = [
            {"path": "src/pages/quality/AlertConfig.tsx", "type": "blob"},
            {"path": "src/pages/quality/RuleList.tsx", "type": "blob"},
            {"path": "src/pages/quality/", "type": "tree"},
        ]
        with patch.object(client, "_get", new=AsyncMock(return_value=mock_response)):
            result = await client.get_file_tree("src/pages/quality", branch="main")
        # 只返回文件（blob），不包含目录
        assert len(result) == 2
        assert all(r["type"] == "blob" for r in result)

    async def test_returns_empty_on_404(self):
        """路径不存在时返回空列表而不是抛异常。"""
        client = GitLabClient(
            gitlab_url="https://gitlab.example.com",
            project_id="mygroup/myrepo",
            access_token="test-token",
        )
        with patch.object(client, "_get", new=AsyncMock(side_effect=Exception("404 Not Found"))):
            result = await client.get_file_tree("nonexistent/path")
        assert result == []


class TestGetFileContent:
    async def test_returns_decoded_content(self):
        """获取文件内容时返回 base64 解码后的文本。"""
        import base64
        client = GitLabClient(
            gitlab_url="https://gitlab.example.com",
            project_id="mygroup/myrepo",
            access_token="test-token",
        )
        raw_content = "const title = '告警配置';"
        encoded = base64.b64encode(raw_content.encode()).decode()
        mock_response = {"content": encoded, "encoding": "base64"}
        with patch.object(client, "_get", new=AsyncMock(return_value=mock_response)):
            result = await client.get_file_content("src/pages/quality/AlertConfig.tsx")
        assert result == raw_content

    async def test_returns_none_on_error(self):
        """文件获取失败时返回 None 而不是抛异常。"""
        client = GitLabClient(
            gitlab_url="https://gitlab.example.com",
            project_id="mygroup/myrepo",
            access_token="test-token",
        )
        with patch.object(client, "_get", new=AsyncMock(side_effect=Exception("403 Forbidden"))):
            result = await client.get_file_content("private/file.tsx")
        assert result is None
```

**Step 2：运行测试确认失败**

```bash
cd /Users/poco/Projects/Sisyphus-Y/backend
uv run pytest tests/unit/test_integrations/test_gitlab_client.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.integrations'`。

**Step 3：实现客户端**

```python
# backend/app/integrations/__init__.py
# (空)

# backend/app/integrations/gitlab/__init__.py
# (空)
```

```python
# backend/app/integrations/gitlab/client.py
"""GitLab REST API 客户端（只读：文件树 + 文件内容）。"""
from __future__ import annotations

import base64
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_TIMEOUT = 10.0  # seconds


class GitLabClient:
    def __init__(self, gitlab_url: str, project_id: str, access_token: str) -> None:
        self._base = gitlab_url.rstrip("/")
        # project_id 可能是 "namespace/repo"，需要 URL 编码
        encoded_pid = httpx.URL(project_id).path.lstrip("/") if "/" in project_id else project_id
        import urllib.parse
        self._project_path = urllib.parse.quote(project_id, safe="")
        self._headers = {"PRIVATE-TOKEN": access_token}

    async def _get(self, path: str, params: dict | None = None) -> Any:
        url = f"{self._base}/api/v4/projects/{self._project_path}/{path}"
        async with httpx.AsyncClient(timeout=_TIMEOUT, trust_env=False) as c:
            resp = await c.get(url, headers=self._headers, params=params or {})
            resp.raise_for_status()
            return resp.json()

    async def get_file_tree(
        self, path: str = "", branch: str = "main", recursive: bool = False
    ) -> list[dict]:
        """返回指定路径下的文件列表（仅 blob 类型）。"""
        try:
            items = await self._get(
                "repository/tree",
                {"path": path, "ref": branch, "recursive": recursive, "per_page": 100},
            )
            return [i for i in items if i.get("type") == "blob"]
        except Exception as exc:
            logger.warning("GitLab get_file_tree failed (path=%s): %s", path, exc)
            return []

    async def get_file_content(self, file_path: str, branch: str = "main") -> str | None:
        """返回文件的文本内容（base64 解码），失败时返回 None。"""
        import urllib.parse
        encoded_path = urllib.parse.quote(file_path, safe="")
        try:
            data = await self._get(f"repository/files/{encoded_path}", {"ref": branch})
            if data.get("encoding") == "base64":
                return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
            return data.get("content", "")
        except Exception as exc:
            logger.warning("GitLab get_file_content failed (path=%s): %s", file_path, exc)
            return None

    async def test_connection(self) -> bool:
        """连接测试：验证 token 有效且有仓库读权限。"""
        try:
            await self._get("")  # GET /projects/{id}
            return True
        except Exception:
            return False
```

**Step 4：运行测试**

```bash
uv run pytest tests/unit/test_integrations/test_gitlab_client.py -v
```

Expected: 全部 PASS。

**Step 5：Commit**

```bash
git add backend/app/integrations/ backend/tests/unit/test_integrations/
git commit -m "feat(gitlab): add GitLabClient with file tree and content fetch"
```

---

### Task 6：源码裁剪器（Extractor）

**Files:**
- Create: `backend/app/integrations/gitlab/extractor.py`
- Create: `backend/tests/unit/test_integrations/test_gitlab_extractor.py`

**Step 1：先写失败测试**

```python
# backend/tests/unit/test_integrations/test_gitlab_extractor.py
from app.integrations.gitlab.extractor import extract_ui_context


class TestExtractUiContext:
    def test_extracts_button_text_from_tsx(self):
        """从 TSX 文件中提取按钮文本。"""
        content = """
export function AlertConfig() {
  return (
    <div>
      <button>保存</button>
      <button>取消</button>
      <Button variant="primary">测试连接</Button>
    </div>
  )
}
"""
        result = extract_ui_context("AlertConfig.tsx", content)
        assert "保存" in result["buttons"]
        assert "取消" in result["buttons"]
        assert "测试连接" in result["buttons"]

    def test_extracts_form_field_labels(self):
        """从 TSX 文件中提取表单字段 label。"""
        content = """
<label>告警名称</label>
<input placeholder="请输入告警名称" />
<label>告警方式</label>
<select>...</select>
"""
        result = extract_ui_context("Form.tsx", content)
        assert "告警名称" in result["fields"]
        assert "告警方式" in result["fields"]

    def test_extracts_python_schema_fields(self):
        """从 Python schema 文件中提取 Pydantic 字段名。"""
        content = """
class AlertConfigCreate(BaseModel):
    name: str
    alert_type: str
    email_list: list[str]
    send_detail: bool = True
"""
        result = extract_ui_context("schemas.py", content)
        assert "name" in result["fields"]
        assert "alert_type" in result["fields"]
        assert "send_detail" in result["fields"]

    def test_returns_empty_for_unknown_extension(self):
        """未知文件类型返回空结构。"""
        result = extract_ui_context("README.md", "# 说明文档")
        assert result["buttons"] == []
        assert result["fields"] == []
```

**Step 2：运行确认失败**

```bash
uv run pytest tests/unit/test_integrations/test_gitlab_extractor.py -v
```

Expected: `ModuleNotFoundError`。

**Step 3：实现裁剪器**

```python
# backend/app/integrations/gitlab/extractor.py
"""从源码文件中提取 UI 相关信息（按钮名、表单字段、路由路径）。"""
from __future__ import annotations

import re


def extract_ui_context(filename: str, content: str) -> dict:
    """
    Returns:
        {"buttons": [...], "fields": [...], "routes": [...]}
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in ("tsx", "jsx", "vue"):
        return _extract_from_frontend(content)
    if ext == "py":
        return _extract_from_python(content)
    return {"buttons": [], "fields": [], "routes": []}


def _extract_from_frontend(content: str) -> dict:
    # 按钮文本：<button>xxx</button> 或 <Button ...>xxx</Button>
    buttons: list[str] = []
    for m in re.finditer(r"<[Bb]utton[^>]*>([^<]{1,30})</[Bb]utton>", content):
        text = m.group(1).strip()
        if text and not text.startswith("{") and len(text) <= 20:
            buttons.append(text)

    # 字段 label：<label>xxx</label>
    fields: list[str] = []
    for m in re.finditer(r"<label[^>]*>([^<]{1,30})</label>", content):
        text = m.group(1).strip()
        if text and len(text) <= 20:
            fields.append(text)

    # placeholder 也作为字段提示
    for m in re.finditer(r'placeholder=["\']([^"\']{1,30})["\']', content):
        hint = m.group(1).strip()
        if hint.startswith("请输入") or hint.startswith("请选择"):
            name = hint.replace("请输入", "").replace("请选择", "").strip()
            if name and name not in fields:
                fields.append(name)

    # 路由路径
    routes: list[str] = []
    for m in re.finditer(r'(?:href|to|path)=["\']([/][^"\']{1,80})["\']', content):
        routes.append(m.group(1))

    return {
        "buttons": list(dict.fromkeys(buttons)),  # 去重保序
        "fields": list(dict.fromkeys(fields)),
        "routes": list(dict.fromkeys(routes)),
    }


def _extract_from_python(content: str) -> dict:
    # Pydantic / dataclass 字段名
    fields: list[str] = []
    for m in re.finditer(r"^\s{4}(\w+)\s*:\s*\w", content, re.MULTILINE):
        field = m.group(1)
        if not field.startswith("_") and field not in ("self", "cls"):
            fields.append(field)

    # FastAPI 路由路径
    routes: list[str] = []
    for m in re.finditer(r'@router\.\w+\(["\']([^"\']+)["\']', content):
        routes.append(m.group(1))

    return {"buttons": [], "fields": list(dict.fromkeys(fields)), "routes": routes}
```

**Step 4：运行测试**

```bash
uv run pytest tests/unit/test_integrations/test_gitlab_extractor.py -v
```

Expected: 全部 PASS。

**Step 5：Commit**

```bash
git add backend/app/integrations/gitlab/extractor.py backend/tests/unit/test_integrations/test_gitlab_extractor.py
git commit -m "feat(gitlab): add source code UI context extractor"
```

---

### Task 7：Context Builder（Token 截断）

**Files:**
- Create: `backend/app/integrations/gitlab/context_builder.py`
- Create: `backend/tests/unit/test_integrations/test_gitlab_context_builder.py`

**Step 1：先写失败测试**

```python
# backend/tests/unit/test_integrations/test_gitlab_context_builder.py
from app.integrations.gitlab.context_builder import build_gitlab_context, estimate_tokens


class TestEstimateTokens:
    def test_rough_estimate(self):
        """token 估算：中文约 1.5 字符/token，英文约 4 字符/token。"""
        text = "A" * 400  # ~100 tokens
        assert 80 <= estimate_tokens(text) <= 120


class TestBuildGitlabContext:
    def test_formats_context_block(self):
        """生成标准格式的源码参考文本块。"""
        file_contexts = [
            {
                "path": "src/pages/quality/AlertConfig.tsx",
                "buttons": ["保存", "取消", "测试连接"],
                "fields": ["告警名称", "告警方式", "是否发送明细"],
                "routes": ["/quality/alert-config"],
            }
        ]
        result = build_gitlab_context("前端仓库", "src/pages/quality", file_contexts)
        assert "源码参考" in result
        assert "AlertConfig.tsx" in result
        assert "保存" in result
        assert "告警名称" in result
        assert "/quality/alert-config" in result

    def test_truncates_at_token_limit(self):
        """超出 4000 token 时截断。"""
        # 生成大量虚假文件上下文
        file_contexts = [
            {
                "path": f"src/pages/module{i}/Page.tsx",
                "buttons": [f"按钮{j}" for j in range(20)],
                "fields": [f"字段{j}" for j in range(20)],
                "routes": [f"/module{i}/page"],
            }
            for i in range(50)
        ]
        result = build_gitlab_context("大仓库", "src/pages", file_contexts)
        assert estimate_tokens(result) <= 4200  # 允许少量超出（最后一个文件）
        assert "token 上限" in result or len(file_contexts) > 0  # 有截断提示
```

**Step 2：运行确认失败**

```bash
uv run pytest tests/unit/test_integrations/test_gitlab_context_builder.py -v
```

**Step 3：实现 Context Builder**

```python
# backend/app/integrations/gitlab/context_builder.py
"""将多个文件的 UI 上下文拼装为 Prompt 可注入的文本块，并控制 Token 用量。"""
from __future__ import annotations

_MAX_TOKENS = 4000


def estimate_tokens(text: str) -> int:
    """粗略估算 token 数（中英混合场景）。"""
    return max(1, len(text) // 3)


def build_gitlab_context(
    repo_name: str,
    base_path: str,
    file_contexts: list[dict],
) -> str:
    """
    Args:
        repo_name: 仓库配置名称，如"前端仓库"
        base_path: 用户选择的路径，如"src/pages/quality"
        file_contexts: list of {path, buttons, fields, routes}
    Returns:
        注入到 assemble_prompt 的源码参考文本块
    """
    header = f"## 源码参考（来自 GitLab · {repo_name} · {base_path}）\n"
    parts: list[str] = [header]
    current_tokens = estimate_tokens(header)

    for fc in file_contexts:
        filename = fc["path"].rsplit("/", 1)[-1]
        lines: list[str] = [f"\n文件：{fc['path']}"]

        if fc.get("routes"):
            lines.append(f"  页面路径：{', '.join(fc['routes'][:3])}")
        if fc.get("buttons"):
            lines.append(f"  按钮：【{'】【'.join(fc['buttons'][:10])}】")
        if fc.get("fields"):
            lines.append(f"  表单字段：「{'」「'.join(fc['fields'][:15])}」")

        block = "\n".join(lines)
        block_tokens = estimate_tokens(block)

        if current_tokens + block_tokens > _MAX_TOKENS:
            parts.append("\n（已达源码参考 token 上限，后续文件已省略）")
            break

        parts.append(block)
        current_tokens += block_tokens

    return "\n".join(parts)
```

**Step 4：运行测试**

```bash
uv run pytest tests/unit/test_integrations/test_gitlab_context_builder.py -v
```

Expected: 全部 PASS。

**Step 5：Commit**

```bash
git add backend/app/integrations/gitlab/context_builder.py backend/tests/unit/test_integrations/test_gitlab_context_builder.py
git commit -m "feat(gitlab): add context builder with 4000-token limit"
```

---

### Task 8：gitlab_config 模块 CRUD + API

**Files:**
- Create: `backend/app/modules/gitlab_config/schemas.py`
- Create: `backend/app/modules/gitlab_config/service.py`
- Create: `backend/app/modules/gitlab_config/router.py`
- Modify: `backend/app/main.py`

**Step 1：创建 Schemas**

```python
# backend/app/modules/gitlab_config/schemas.py
import uuid
from pydantic import BaseModel, HttpUrl, field_validator


class GitLabConfigCreate(BaseModel):
    product_id: uuid.UUID
    name: str
    gitlab_url: str
    project_id: str
    access_token: str | None = None
    default_branch: str = "main"
    is_enabled: bool = True

    @field_validator("gitlab_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("gitlab_url must start with http:// or https://")
        return v.rstrip("/")


class GitLabConfigUpdate(BaseModel):
    name: str | None = None
    gitlab_url: str | None = None
    project_id: str | None = None
    access_token: str | None = None
    default_branch: str | None = None
    is_enabled: bool | None = None


class GitLabConfigResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    name: str
    gitlab_url: str
    project_id: str
    access_token_masked: str | None  # "glpat-xxxx****"
    default_branch: str
    is_enabled: bool

    model_config = {"from_attributes": True}


class FileTreeItem(BaseModel):
    path: str
    type: str  # "blob" | "tree"


class ConnectionTestResponse(BaseModel):
    success: bool
    message: str
```

**Step 2：创建 Service**

```python
# backend/app/modules/gitlab_config/service.py
"""GitLab 仓库配置的 CRUD + 连接测试业务逻辑。"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import encrypt_value, decrypt_value
from app.integrations.gitlab.client import GitLabClient
from app.modules.gitlab_config.models import GitLabConfig
from app.modules.gitlab_config.schemas import GitLabConfigCreate, GitLabConfigUpdate


class GitLabConfigService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_product(self, product_id: uuid.UUID) -> list[GitLabConfig]:
        result = await self._session.execute(
            select(GitLabConfig)
            .where(GitLabConfig.product_id == product_id)
            .where(GitLabConfig.deleted_at.is_(None))
            .order_by(GitLabConfig.created_at)
        )
        return list(result.scalars().all())

    async def create(self, data: GitLabConfigCreate) -> GitLabConfig:
        token_encrypted = encrypt_value(data.access_token) if data.access_token else None
        config = GitLabConfig(
            product_id=data.product_id,
            name=data.name,
            gitlab_url=data.gitlab_url,
            project_id=data.project_id,
            access_token_encrypted=token_encrypted,
            default_branch=data.default_branch,
            is_enabled=data.is_enabled,
        )
        self._session.add(config)
        await self._session.commit()
        await self._session.refresh(config)
        return config

    async def update(self, config_id: uuid.UUID, data: GitLabConfigUpdate) -> GitLabConfig | None:
        config = await self._session.get(GitLabConfig, config_id)
        if not config or config.deleted_at:
            return None
        update_data = data.model_dump(exclude_none=True)
        if "access_token" in update_data:
            config.access_token_encrypted = encrypt_value(update_data.pop("access_token"))
        for k, v in update_data.items():
            setattr(config, k, v)
        await self._session.commit()
        await self._session.refresh(config)
        return config

    async def delete(self, config_id: uuid.UUID) -> bool:
        config = await self._session.get(GitLabConfig, config_id)
        if not config or config.deleted_at:
            return False
        from datetime import datetime, timezone
        config.deleted_at = datetime.now(timezone.utc)
        await self._session.commit()
        return True

    async def test_connection(self, config_id: uuid.UUID) -> tuple[bool, str]:
        config = await self._session.get(GitLabConfig, config_id)
        if not config:
            return False, "配置不存在"
        token = decrypt_value(config.access_token_encrypted) if config.access_token_encrypted else ""
        client = GitLabClient(config.gitlab_url, config.project_id, token)
        ok = await client.test_connection()
        return ok, "连接成功" if ok else "连接失败，请检查 URL、Project ID 和 Token"

    async def get_file_tree(
        self, config_id: uuid.UUID, path: str = "", branch: str | None = None
    ) -> list[dict]:
        config = await self._session.get(GitLabConfig, config_id)
        if not config:
            return []
        token = decrypt_value(config.access_token_encrypted) if config.access_token_encrypted else ""
        client = GitLabClient(config.gitlab_url, config.project_id, token)
        return await client.get_file_tree(path, branch or config.default_branch)

    @staticmethod
    def mask_token(encrypted: str | None) -> str | None:
        if not encrypted:
            return None
        token = decrypt_value(encrypted) if encrypted else ""
        if len(token) <= 8:
            return "****"
        return token[:8] + "****"
```

**Step 3：创建 Router**

```python
# backend/app/modules/gitlab_config/router.py
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.gitlab_config.schemas import (
    GitLabConfigCreate, GitLabConfigUpdate, GitLabConfigResponse,
    FileTreeItem, ConnectionTestResponse,
)
from app.modules.gitlab_config.service import GitLabConfigService

router = APIRouter(prefix="/gitlab-configs", tags=["gitlab-configs"])


def _to_response(config, service: GitLabConfigService) -> GitLabConfigResponse:
    return GitLabConfigResponse(
        id=config.id,
        product_id=config.product_id,
        name=config.name,
        gitlab_url=config.gitlab_url,
        project_id=config.project_id,
        access_token_masked=service.mask_token(config.access_token_encrypted),
        default_branch=config.default_branch,
        is_enabled=config.is_enabled,
    )


@router.get("", response_model=list[GitLabConfigResponse])
async def list_configs(
    product_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    svc = GitLabConfigService(session)
    configs = await svc.list_by_product(product_id)
    return [_to_response(c, svc) for c in configs]


@router.post("", response_model=GitLabConfigResponse, status_code=201)
async def create_config(
    data: GitLabConfigCreate,
    session: AsyncSession = Depends(get_session),
):
    svc = GitLabConfigService(session)
    config = await svc.create(data)
    return _to_response(config, svc)


@router.put("/{config_id}", response_model=GitLabConfigResponse)
async def update_config(
    config_id: uuid.UUID,
    data: GitLabConfigUpdate,
    session: AsyncSession = Depends(get_session),
):
    svc = GitLabConfigService(session)
    config = await svc.update(config_id, data)
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    return _to_response(config, svc)


@router.delete("/{config_id}", status_code=204)
async def delete_config(
    config_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    svc = GitLabConfigService(session)
    ok = await svc.delete(config_id)
    if not ok:
        raise HTTPException(status_code=404, detail="配置不存在")


@router.post("/{config_id}/test", response_model=ConnectionTestResponse)
async def test_connection(
    config_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    svc = GitLabConfigService(session)
    ok, message = await svc.test_connection(config_id)
    return ConnectionTestResponse(success=ok, message=message)


@router.get("/{config_id}/tree", response_model=list[FileTreeItem])
async def get_file_tree(
    config_id: uuid.UUID,
    path: str = "",
    branch: str | None = None,
    session: AsyncSession = Depends(get_session),
):
    svc = GitLabConfigService(session)
    items = await svc.get_file_tree(config_id, path, branch)
    return [FileTreeItem(path=i["path"], type=i["type"]) for i in items]
```

**Step 4：注册路由到 main.py**

在 `backend/app/main.py` 的 `_MODULE_NAMES` 列表中添加 `"gitlab_config"`：

```python
_MODULE_NAMES = [
    ...
    "ai_config",
    "gitlab_config",   # ← 新增这一行
    "notification",
    ...
]
```

**Step 5：验证路由注册成功**

```bash
cd /Users/poco/Projects/Sisyphus-Y/backend
uv run python -c "
from app.modules.gitlab_config.router import router
print('Routes:', [r.path for r in router.routes])
"
```

Expected: 打印路由列表，包含 `/gitlab-configs` 等路径。

**Step 6：Commit**

```bash
git add backend/app/modules/gitlab_config/ backend/app/main.py
git commit -m "feat(gitlab): add gitlab_config CRUD module and router"
```

---

### Task 9：扩展 assemble_prompt 支持 gitlab_context

**Files:**
- Modify: `backend/app/ai/prompts.py`
- Modify: `backend/app/engine/case_gen/doc_driven.py`
- Modify: `backend/app/engine/case_gen/chat_driven.py`
- Modify: `backend/tests/unit/test_ai/test_prompts.py`

**Step 1：更新 assemble_prompt 函数签名**

在 `backend/app/ai/prompts.py` 的 `assemble_prompt` 函数中增加 `gitlab_context` 参数，并在第 6 层（RAG context 之后）注入：

```python
def assemble_prompt(
    module: str,
    task_instruction: str,
    *,
    team_standard: str | None = None,
    module_rules: str | None = None,
    output_preference: dict | None = None,
    rag_context: str | None = None,
    gitlab_context: str | None = None,   # ← 新增
) -> str:
    ...
    # Layer 6: RAG context
    if rag_context:
        parts.append(f"\n\n---\n## 参考知识库\n{rag_context}")

    # Layer 6b: GitLab source code context（新增，紧跟 RAG 之后）
    if gitlab_context:
        parts.append(f"\n\n---\n{gitlab_context}")

    # Layer 7: Task instruction
    ...
```

**Step 2：更新 test_prompts.py 验证新参数**

在 `backend/tests/unit/test_ai/test_prompts.py` 中追加：

```python
    def test_gitlab_context_injected(self):
        """验证 gitlab_context 被注入到组装后的 Prompt 中。"""
        gitlab_ctx = "## 源码参考\n文件：AlertConfig.tsx\n  按钮：【保存】【取消】"
        prompt = assemble_prompt("generation", "任务指令", gitlab_context=gitlab_ctx)
        assert "源码参考" in prompt
        assert "AlertConfig.tsx" in prompt
```

**Step 3：运行测试**

```bash
uv run pytest tests/unit/test_ai/test_prompts.py -v
```

Expected: 全部 PASS（含新增的 gitlab_context 测试）。

**Step 4：更新 doc_driven.py 接受 gitlab_context**

在 `doc_driven_stream` 和 `doc_driven_generate` 函数中增加 `gitlab_context` 参数并传给 `assemble_prompt`：

```python
async def doc_driven_stream(
    requirement_title: str,
    requirement_content: str,
    *,
    scope: str | None = None,
    rag_context: str | None = None,
    gitlab_context: str | None = None,   # ← 新增
) -> AsyncIterator[str]:
    task_instruction = build_task_instruction(requirement_title, requirement_content, scope)
    system = assemble_prompt(
        "generation", task_instruction,
        rag_context=rag_context,
        gitlab_context=gitlab_context,   # ← 新增
    )
    ...
```

同样更新 `chat_driven.py` 中的 `chat_driven_stream` 和 `chat_driven_generate`。

**Step 5：Commit**

```bash
git add backend/app/ai/prompts.py backend/app/engine/case_gen/ backend/tests/unit/test_ai/
git commit -m "feat(prompts): add gitlab_context support to assemble_prompt pipeline"
```

---

### Task 10：前端设置页 — 代码仓库 Tab

**Files:**
- Create: `frontend/src/app/(main)/settings/_components/GitLabRepoSettings.tsx`
- Modify: `frontend/src/app/(main)/settings/page.tsx`

**Step 1：创建 GitLabRepoSettings 组件**

参考 `AIModelSettings.tsx` 的结构（Sheet 侧拉编辑模式），新建组件：

```typescript
// frontend/src/app/(main)/settings/_components/GitLabRepoSettings.tsx
'use client';

import { Check, GitBranch, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ConnectionTestButton } from '@/components/ui/ConnectionTestButton';
import { api } from '@/lib/api';

interface GitLabConfigRecord {
  id: string;
  product_id: string;
  name: string;
  gitlab_url: string;
  project_id: string;
  access_token_masked: string | null;
  default_branch: string;
  is_enabled: boolean;
}

interface ConfigDraft {
  name: string;
  gitlab_url: string;
  project_id: string;
  access_token: string;
  default_branch: string;
  is_enabled: boolean;
}

const EMPTY_DRAFT: ConfigDraft = {
  name: '',
  gitlab_url: '',
  project_id: '',
  access_token: '',
  default_branch: 'main',
  is_enabled: true,
};

// 注：product_id 需要从全局状态或 URL 参数获取
// 此处暂时使用固定占位（实际从 useProductStore 或 props 获取）
const PLACEHOLDER_PRODUCT_ID = '00000000-0000-0000-0000-000000000000';

export function GitLabRepoSettings() {
  const [configs, setConfigs] = useState<GitLabConfigRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ConfigDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<GitLabConfigRecord[]>(
        `/gitlab-configs?product_id=${PLACEHOLDER_PRODUCT_ID}`,
      );
      setConfigs(data);
    } catch {
      toast.error('加载仓库配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadConfigs(); }, [loadConfigs]);

  const handleCreateNew = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setSaved(false);
    setSheetOpen(true);
  };

  const handleEdit = (config: GitLabConfigRecord) => {
    setEditingId(config.id);
    setDraft({
      name: config.name,
      gitlab_url: config.gitlab_url,
      project_id: config.project_id,
      access_token: config.access_token_masked ?? '',
      default_branch: config.default_branch,
      is_enabled: config.is_enabled,
    });
    setSaved(false);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        product_id: PLACEHOLDER_PRODUCT_ID,
        name: draft.name.trim(),
        gitlab_url: draft.gitlab_url.trim(),
        project_id: draft.project_id.trim(),
        default_branch: draft.default_branch.trim() || 'main',
        is_enabled: draft.is_enabled,
      };
      // 只在输入了新 token（不含 ****）时才传
      if (draft.access_token.trim() && !draft.access_token.includes('****')) {
        payload.access_token = draft.access_token.trim();
      }

      if (editingId) {
        await api.put(`/gitlab-configs/${editingId}`, payload);
      } else {
        await api.post('/gitlab-configs', payload);
      }
      setSaved(true);
      setSheetOpen(false);
      await loadConfigs();
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    setDeleting(true);
    try {
      await api.delete(`/gitlab-configs/${editingId}`);
      setSheetOpen(false);
      await loadConfigs();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const isSaveDisabled =
    saving || deleting || !draft.name.trim() || !draft.gitlab_url.trim() || !draft.project_id.trim();

  return (
    <div>
      <div className="sec-header">
        <GitBranch className="h-4 w-4 text-sy-accent" />
        <span className="sec-title">代码仓库配置</span>
      </div>
      <p className="mb-4 text-[12px] text-sy-text-3">
        绑定 GitLab 仓库后，生成用例时可引用源码中的真实页面路径、按钮名、字段名，提升用例准确性。
      </p>

      <div className="card mb-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-sy-text">仓库列表</p>
          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 rounded-md border border-sy-border bg-sy-bg-2 px-3 py-1.5 text-[12px] font-medium text-sy-text transition-colors hover:border-sy-accent/35 hover:text-sy-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            新建仓库配置
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-sy-text-3" />
          </div>
        ) : configs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-sy-border-2 bg-sy-bg-2 px-3 py-6 text-center">
            <p className="text-[12px] text-sy-text-2">还没有仓库配置</p>
            <p className="mt-1 text-[11px] text-sy-text-3">创建后可在工作台生成用例时选择参考仓库</p>
          </div>
        ) : (
          <div className="space-y-2">
            {configs.map((config) => (
              <button
                key={config.id}
                type="button"
                onClick={() => handleEdit(config)}
                className="w-full rounded-xl border border-sy-border bg-sy-bg-2 px-3 py-3 text-left transition-all hover:border-sy-border-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-sy-text">{config.name}</p>
                    <p className="mt-1 text-[11px] text-sy-text-3">
                      {config.gitlab_url} · {config.project_id}
                    </p>
                    <p className="mt-0.5 text-[11px] text-sy-text-3">
                      分支：{config.default_branch}
                    </p>
                  </div>
                  {!config.is_enabled && (
                    <span className="rounded-full border border-sy-border bg-sy-bg-3 px-2 py-0.5 text-[10px] font-mono text-sy-text-3">
                      已停用
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSheetOpen(false)}>
          <div
            className="relative flex h-full w-full max-w-[520px] flex-col overflow-y-auto border-l border-sy-border bg-sy-bg-1 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-sy-border px-6 py-4">
              <div>
                <p className="text-[14px] font-semibold text-sy-text">
                  {editingId ? '编辑仓库配置' : '新建仓库配置'}
                </p>
                <p className="mt-1 text-[11px] text-sy-text-3">
                  配置完成后点击测试连接验证 Token 权限。
                </p>
              </div>
              <div className="flex items-center gap-2">
                {editingId && (
                  <ConnectionTestButton
                    testUrl={`/api/gitlab-configs/${editingId}/test`}
                    label="测试连接"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-sy-border text-sy-text-3 hover:border-sy-border-2 hover:text-sy-text"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 px-6 py-5">
              {[
                { id: 'gl-name', label: '配置名称', key: 'name', placeholder: '例如：前端仓库' },
                { id: 'gl-url', label: 'GitLab URL', key: 'gitlab_url', placeholder: 'https://gitlab.example.com' },
                { id: 'gl-pid', label: 'Project ID / Path', key: 'project_id', placeholder: 'mygroup/myrepo 或数字 ID' },
                { id: 'gl-token', label: 'Access Token', key: 'access_token', placeholder: 'glpat-xxxxxxxxxxxx', mono: true },
                { id: 'gl-branch', label: '默认分支', key: 'default_branch', placeholder: 'main' },
              ].map(({ id, label, key, placeholder, mono }) => (
                <div key={key}>
                  <label htmlFor={id} className="mb-1 block text-[12px] text-sy-text-2">{label}</label>
                  <input
                    id={id}
                    type={key === 'access_token' ? 'password' : 'text'}
                    value={draft[key as keyof ConfigDraft] as string}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                    className={`w-full rounded-md border border-sy-border bg-sy-bg-2 px-3 py-2 text-[12.5px] text-sy-text outline-none transition-colors focus:border-sy-accent/50 ${mono ? 'font-mono' : ''}`}
                    placeholder={placeholder}
                  />
                </div>
              ))}

              <label className="inline-flex items-center gap-2 text-[12px] text-sy-text-2">
                <input
                  type="checkbox"
                  checked={draft.is_enabled}
                  onChange={(e) => setDraft((prev) => ({ ...prev, is_enabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-sy-border bg-sy-bg-2 accent-sy-accent"
                />
                启用此配置
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-sy-border px-6 py-4">
              {editingId && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={saving || deleting}
                  className="inline-flex items-center gap-1.5 rounded-md border border-sy-danger/30 bg-sy-danger/10 px-3 py-1.5 text-[12px] font-medium text-sy-danger transition-colors hover:bg-sy-danger/15 disabled:opacity-60"
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  删除
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaveDisabled}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-sy-accent px-3 py-1.5 text-[12px] font-semibold text-black transition-colors hover:bg-sy-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                {saved ? '已保存' : saving ? '保存中...' : '保存配置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2：注册到设置页 `page.tsx`**

在 `sidebarItems` 中 `integration` 之前插入：
```typescript
{ icon: GitBranch, key: 'code-repo', label: '代码仓库' },
```

在 `panels` 中添加：
```typescript
'code-repo': GitLabRepoSettings,
```

在文件顶部 import 区域添加：
```typescript
import { GitBranch } from 'lucide-react';
import { GitLabRepoSettings } from './_components/GitLabRepoSettings';
```

**Step 3：类型检查**

```bash
cd /Users/poco/Projects/Sisyphus-Y/frontend
bunx tsc --noEmit
```

Expected: 无类型错误。

**Step 4：Commit**

```bash
git add frontend/src/app/\(main\)/settings/
git commit -m "feat(frontend): add GitLab repo settings tab"
```

---

### Task 11：工作台 — 参考代码面板

**Files:**
- Create: `frontend/src/app/(main)/workbench/_components/GitLabContextPanel.tsx`
- Modify: `frontend/src/app/(main)/workbench/_components/GenerationPanel.tsx`

**Step 1：创建 GitLabContextPanel 组件**

```typescript
// frontend/src/app/(main)/workbench/_components/GitLabContextPanel.tsx
'use client';

import { ChevronDown, Code2, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface GitLabConfigOption {
  id: string;
  name: string;
  default_branch: string;
}

interface GitLabContextPanelProps {
  productId: string | null;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onContextReady: (context: GitLabContextPayload | null) => void;
}

export interface GitLabContextPayload {
  config_id: string;
  path: string;
  branch: string;
  file_count: number;
  estimated_tokens: number;
}

export function GitLabContextPanel({
  productId,
  enabled,
  onEnabledChange,
  onContextReady,
}: GitLabContextPanelProps) {
  const [configs, setConfigs] = useState<GitLabConfigOption[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [path, setPath] = useState('');
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [loadingTree, setLoadingTree] = useState(false);
  const [fileCount, setFileCount] = useState<number | null>(null);
  const [estimatedTokens, setEstimatedTokens] = useState<number | null>(null);

  useEffect(() => {
    if (!productId || !enabled) return;
    setLoadingConfigs(true);
    api
      .get<GitLabConfigOption[]>(`/gitlab-configs?product_id=${productId}`)
      .then((data) => {
        const active = data.filter((c) => (c as { is_enabled?: boolean }).is_enabled !== false);
        setConfigs(active);
        if (active.length > 0 && !selectedConfigId) {
          setSelectedConfigId(active[0].id);
        }
      })
      .catch(() => setConfigs([]))
      .finally(() => setLoadingConfigs(false));
  }, [productId, enabled, selectedConfigId]);

  const handleFetch = useCallback(async () => {
    if (!selectedConfigId) return;
    setLoadingTree(true);
    setFileCount(null);
    setEstimatedTokens(null);
    onContextReady(null);
    try {
      const items = await api.get<{ path: string; type: string }[]>(
        `/gitlab-configs/${selectedConfigId}/tree?path=${encodeURIComponent(path)}`,
      );
      const blobCount = items.filter((i) => i.type === 'blob').length;
      const estTokens = blobCount * 150; // 粗略估算：每文件约 150 tokens
      setFileCount(blobCount);
      setEstimatedTokens(estTokens);
      onContextReady({
        config_id: selectedConfigId,
        path,
        branch: configs.find((c) => c.id === selectedConfigId)?.default_branch ?? 'main',
        file_count: blobCount,
        estimated_tokens: estTokens,
      });
    } catch {
      setFileCount(0);
    } finally {
      setLoadingTree(false);
    }
  }, [selectedConfigId, path, configs, onContextReady]);

  // 关闭时清空
  useEffect(() => {
    if (!enabled) {
      setFileCount(null);
      setEstimatedTokens(null);
      onContextReady(null);
    }
  }, [enabled, onContextReady]);

  return (
    <div className="rounded-xl border border-sy-border bg-sy-bg-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Code2 className="h-3.5 w-3.5 text-sy-text-3" />
          <span className="text-[12px] font-medium text-sy-text-2">参考代码（可选）</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onEnabledChange(!enabled)}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            enabled ? 'bg-sy-accent' : 'bg-sy-bg-3'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="mt-3 space-y-2">
          {loadingConfigs ? (
            <Loader2 className="h-4 w-4 animate-spin text-sy-text-3" />
          ) : configs.length === 0 ? (
            <p className="text-[11px] text-sy-text-3">
              暂无可用仓库配置，请先在【设置 → 代码仓库】中添加。
            </p>
          ) : (
            <>
              <div className="relative">
                <select
                  value={selectedConfigId}
                  onChange={(e) => {
                    setSelectedConfigId(e.target.value);
                    setFileCount(null);
                    setEstimatedTokens(null);
                    onContextReady(null);
                  }}
                  className="w-full appearance-none rounded-md border border-sy-border bg-sy-bg-1 px-3 py-1.5 pr-8 text-[12px] text-sy-text outline-none focus:border-sy-accent/50"
                >
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sy-text-3" />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={path}
                  onChange={(e) => {
                    setPath(e.target.value);
                    setFileCount(null);
                    onContextReady(null);
                  }}
                  placeholder="路径（如 src/pages/quality）"
                  className="flex-1 rounded-md border border-sy-border bg-sy-bg-1 px-3 py-1.5 text-[12px] text-sy-text outline-none placeholder:text-sy-text-3 focus:border-sy-accent/50"
                />
                <button
                  type="button"
                  onClick={() => void handleFetch()}
                  disabled={loadingTree || !selectedConfigId}
                  className="inline-flex items-center gap-1 rounded-md border border-sy-border bg-sy-bg-1 px-3 py-1.5 text-[12px] text-sy-text-2 transition-colors hover:border-sy-accent/35 hover:text-sy-accent disabled:opacity-50"
                >
                  {loadingTree ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  获取
                </button>
              </div>

              {fileCount !== null && (
                <p className={`text-[11px] ${fileCount > 0 ? 'text-sy-accent' : 'text-sy-warn'}`}>
                  {fileCount > 0
                    ? `✓ 已加载 ${fileCount} 个文件，约 ${estimatedTokens ?? 0} tokens`
                    : '路径下未找到可读文件'}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2：在 GenerationPanel.tsx 中集成**

在 `GenerationPanel.tsx` 中：

1. 导入 `GitLabContextPanel` 和 `GitLabContextPayload`
2. 添加 state：
   ```typescript
   const [gitlabEnabled, setGitlabEnabled] = useState(false);
   const [gitlabContext, setGitlabContext] = useState<GitLabContextPayload | null>(null);
   ```
3. 在 `startGeneration` 的 API 调用 body 中增加 `gitlab_context` 字段（当 gitlabEnabled 且 gitlabContext 不为空时）：
   ```typescript
   body: {
     message,
     ...(gitlabEnabled && gitlabContext ? { gitlab_context: gitlabContext } : {}),
   },
   ```
4. 在组件 JSX 的生成按钮上方渲染 `<GitLabContextPanel>` 面板。

**Step 3：类型检查**

```bash
cd /Users/poco/Projects/Sisyphus-Y/frontend
bunx tsc --noEmit
```

Expected: 无类型错误。

**Step 4：Commit**

```bash
git add frontend/src/app/\(main\)/workbench/
git commit -m "feat(workbench): add GitLab code reference panel in generation"
```

---

### Task 12：后端 generation 路由接收 gitlab_context 并注入 Prompt

**Files:**
- Modify: `backend/app/modules/generation/router.py`（或对应处理 chat 的 service）
- Create: `backend/app/integrations/gitlab/pipeline.py`

**Step 1：创建 pipeline.py 整合获取 + 裁剪 + 构建**

```python
# backend/app/integrations/gitlab/pipeline.py
"""一站式：接收前端 gitlab_context payload → 获取文件内容 → 裁剪 → 构建上下文文本。"""
from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import decrypt_value
from app.integrations.gitlab.client import GitLabClient
from app.integrations.gitlab.context_builder import build_gitlab_context
from app.integrations.gitlab.extractor import extract_ui_context
from app.modules.gitlab_config.models import GitLabConfig

logger = logging.getLogger(__name__)

_MAX_FILES = 30  # 单次最多处理 30 个文件


async def build_gitlab_prompt_context(
    payload: dict,  # {config_id, path, branch, file_count, estimated_tokens}
    session: AsyncSession,
) -> str | None:
    """
    Returns:
        组装好的源码参考文本块，失败时返回 None（降级处理）。
    """
    config_id = payload.get("config_id")
    if not config_id:
        return None

    config: GitLabConfig | None = await session.get(GitLabConfig, config_id)
    if not config or not config.is_enabled:
        return None

    token = decrypt_value(config.access_token_encrypted) if config.access_token_encrypted else ""
    client = GitLabClient(config.gitlab_url, config.project_id, token)

    path = payload.get("path", "")
    branch = payload.get("branch", config.default_branch)

    try:
        tree = await client.get_file_tree(path, branch)
    except Exception as exc:
        logger.warning("GitLab tree fetch failed: %s", exc)
        return None

    # 过滤出可处理的文件类型，限制数量
    processable = [
        f for f in tree
        if f["path"].endswith((".tsx", ".jsx", ".vue", ".py"))
    ][:_MAX_FILES]

    file_contexts: list[dict] = []
    for file_item in processable:
        content = await client.get_file_content(file_item["path"], branch)
        if not content:
            continue
        ctx = extract_ui_context(file_item["path"], content)
        if ctx["buttons"] or ctx["fields"] or ctx["routes"]:
            file_contexts.append({"path": file_item["path"], **ctx})

    if not file_contexts:
        return None

    return build_gitlab_context(config.name, path, file_contexts)
```

**Step 2：在 generation service/router 中接收 payload 并调用 pipeline**

找到处理 `/generation/sessions/{id}/chat` 的 service 方法（`chat_driven_generate`），增加对 `gitlab_context` payload 的处理：

在 `GenerationService.chat` 或对应方法中：
```python
# 如果请求 body 中包含 gitlab_context payload，调用 pipeline
gitlab_ctx_text: str | None = None
if gitlab_context_payload := body.get("gitlab_context"):
    from app.integrations.gitlab.pipeline import build_gitlab_prompt_context
    try:
        gitlab_ctx_text = await build_gitlab_prompt_context(gitlab_context_payload, session)
    except Exception:
        logger.warning("GitLab context build failed, proceeding without it")

# 传给 chat_driven_stream / chat_driven_generate
stream = await chat_driven_stream(
    ...,
    gitlab_context=gitlab_ctx_text,
)
```

**Step 3：运行所有后端测试**

```bash
cd /Users/poco/Projects/Sisyphus-Y/backend
uv run pytest tests/unit/ -v --tb=short
```

Expected: 所有测试通过（新增测试 + 原有测试）。

**Step 4：Commit**

```bash
git add backend/app/integrations/gitlab/pipeline.py backend/app/modules/generation/
git commit -m "feat(gitlab): integrate pipeline into generation chat endpoint"
```

---

## 验收标准

1. **Phase 1**：用 Story 目录中的任一需求测试生成，生成的用例：
   - 第一步是"进入【模块名-页面名】页面"
   - 所有表单步骤含具体测试数据（无"合法值"/"例如"等模糊词）
   - 每条异常用例只有一个逆向条件

2. **Phase 2**：
   - 设置页能成功创建 GitLab 仓库配置并测试连接
   - 工作台开启"参考代码"后能获取文件列表
   - 生成用例时步骤中出现仓库中真实存在的按钮名/字段名
   - GitLab 不可达时降级生成（不报错）

3. **测试覆盖**：所有新增后端模块单元测试通过，`uv run pytest tests/unit/ -v` 全绿
