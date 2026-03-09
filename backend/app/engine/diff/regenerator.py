"""一键重新生成受影响用例 (B-M07-10)。

将受影响的测试点重新送入用例生成引擎，批量产出新版本用例。
旧用例保留版本快照后更新为新内容。
"""

import json
import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm_client import invoke_llm
from app.ai.parser import parse_test_cases
from app.ai.prompts import assemble_prompt
from app.modules.products.models import Requirement
from app.modules.scene_map.models import TestPoint
from app.modules.testcases.models import TestCase, TestCaseVersion

logger = logging.getLogger(__name__)

_REGEN_TASK = """\
请根据以下测试点和需求上下文，重新生成高质量测试用例。

## 需求背景
标题：{req_title}
内容：{req_content}

## 需要重新生成用例的测试点
{test_points}

## 重新生成原因
需求发生变更，原有用例已过时，需要根据最新需求内容重新生成。

## 输出要求
为每个测试点生成 2~5 条用例，以 JSON 数组输出。"""


async def regenerate_cases_for_points(
    session: AsyncSession,
    requirement_id: UUID,
    test_point_ids: list[str],
    *,
    diff_summary: str = "",
) -> list[dict]:
    """批量重新生成受影响测试点的用例。

    流程：
      1. 查询测试点详情和需求上下文
      2. 组装 Prompt 并调用 LLM 生成新用例
      3. 解析 LLM 输出为结构化用例
      4. 为旧用例创建版本快照
      5. 更新用例内容并重置状态为 draft

    Args:
        session: 数据库会话
        requirement_id: 需求 ID
        test_point_ids: 要重新生成用例的测试点 ID 列表
        diff_summary: diff 变更摘要（可选，提供更好的上下文）

    Returns:
        重新生成的用例字典列表
    """
    if not test_point_ids:
        return []

    # 查询需求上下文
    req = await session.get(Requirement, requirement_id)
    req_title = req.title if req else "未知需求"
    req_content = json.dumps(req.content_ast, ensure_ascii=False) if req and req.content_ast else ""

    # 查询测试点
    tp_q = select(TestPoint).where(
        TestPoint.id.in_(test_point_ids),
        TestPoint.deleted_at.is_(None),
    )
    tp_result = await session.execute(tp_q)
    test_points = list(tp_result.scalars().all())

    if not test_points:
        logger.warning("未找到有效测试点 (ids=%s)", test_point_ids)
        return []

    # 构建测试点描述
    tp_lines = []
    for tp in test_points:
        tp_lines.append(f"- [{tp.group_name}] {tp.title} (优先级: {tp.priority})\n  描述: {tp.description or '无'}")
    tp_text = "\n".join(tp_lines)

    # 组装 Prompt 并调用 LLM
    task = _REGEN_TASK.format(
        req_title=req_title,
        req_content=req_content[:3000],
        test_points=tp_text,
    )
    if diff_summary:
        task += f"\n\n## 变更摘要\n{diff_summary}"

    system = assemble_prompt(module="generation", task_instruction=task)
    messages = [{"role": "system", "content": system}, {"role": "user", "content": task}]

    result = await invoke_llm(messages=messages)
    new_cases = parse_test_cases(result.content)

    if not new_cases:
        logger.warning("LLM 重新生成未产出有效用例")
        return new_cases

    # 更新数据库中的旧用例
    tp_id_set = {str(tp.id) for tp in test_points}
    await _snapshot_and_update_cases(session, requirement_id, tp_id_set, new_cases)

    logger.info(
        "需求 %s 重新生成 %d 条用例 (涉及 %d 个测试点)",
        requirement_id,
        len(new_cases),
        len(test_points),
    )
    return new_cases


async def _snapshot_and_update_cases(
    session: AsyncSession,
    requirement_id: UUID,
    affected_tp_ids: set[str],
    new_cases: list[dict],
) -> None:
    """为旧用例创建版本快照，并根据新生成内容更新。"""
    # 查询受影响的旧用例
    old_q = select(TestCase).where(
        TestCase.requirement_id == requirement_id,
        TestCase.deleted_at.is_(None),
        TestCase.status == "needs_rewrite",
    )
    old_result = await session.execute(old_q)
    old_cases = list(old_result.scalars().all())

    # 为旧用例创建版本快照
    for old_case in old_cases:
        snapshot = TestCaseVersion(
            test_case_id=old_case.id,
            version=old_case.version,
            snapshot={
                "title": old_case.title,
                "precondition": old_case.precondition,
                "steps": old_case.steps,
                "priority": old_case.priority,
                "case_type": old_case.case_type,
            },
            change_reason="需求变更自动重新生成",
        )
        session.add(snapshot)

        # 标记旧用例状态
        old_case.version += 1
        old_case.status = "draft"

    # 匹配新用例到旧用例（按标题相似度）或创建新记录
    existing_titles = {c.title: c for c in old_cases}
    for nc in new_cases:
        title = nc.get("title", "")
        if title in existing_titles:
            # 更新已有用例
            case = existing_titles[title]
            case.precondition = nc.get("precondition", "")
            case.steps = nc.get("steps", [])
            case.priority = nc.get("priority", "P1")
            case.case_type = nc.get("case_type", "normal")
            case.source = "ai_regenerated"
        # 全新用例不在此处创建，留给 service 层处理

    await session.flush()
