"""变更影响分析 — 自动标记受影响的测试点和用例 (B-M07-04 / B-M07-05)。

分析策略：
  1. 关键词匹配：diff 变更文本中的关键词与测试点标题/描述的重叠度
  2. 分类关联：diff 涉及的功能分类与测试点分组匹配
  3. 传递标记：受影响测试点关联的用例自动标记为 needs_rewrite
"""

import logging
import re
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.scene_map.models import SceneMap, TestPoint
from app.modules.testcases.models import TestCase

logger = logging.getLogger(__name__)

# 中文停用词（不参与关键词匹配）
_STOPWORDS = frozenset(
    [
        "的",
        "了",
        "在",
        "是",
        "我",
        "有",
        "和",
        "就",
        "不",
        "人",
        "都",
        "一",
        "一个",
        "上",
        "也",
        "很",
        "到",
        "说",
        "要",
        "去",
        "你",
        "会",
        "着",
        "没有",
        "看",
        "好",
        "自己",
        "这",
        "他",
        "她",
        "它",
        "们",
        "这个",
        "那个",
        "什么",
        "怎么",
        "如何",
        "可以",
        "需要",
        "进行",
        "使用",
        "通过",
        "支持",
        "功能",
        "系统",
        "操作",
        "数据",
        "用户",
        "管理",
        "模块",
        "接口",
    ]
)

# 匹配中文词语的正则（2字以上中文 或 英文单词）
_TOKEN_RE = re.compile(r"[\u4e00-\u9fff]{2,}|[a-zA-Z_]\w+")


def _tokenize(text: str) -> set[str]:
    """提取文本关键词，过滤停用词和过短 token。"""
    tokens = set(_TOKEN_RE.findall(text.lower()))
    return tokens - _STOPWORDS


async def mark_affected_test_points(
    session: AsyncSession,
    requirement_id: UUID,
    diff_changes: list[dict],
) -> list[str]:
    """根据 Diff 变更，标记受影响的测试点。

    Args:
        session: 数据库会话
        requirement_id: 需求 ID
        diff_changes: 变更内容列表，每项含 content / old_content 等字段

    Returns:
        受影响的测试点 ID 列表
    """
    # 获取需求关联的场景地图
    map_q = select(SceneMap).where(
        SceneMap.requirement_id == requirement_id,
        SceneMap.deleted_at.is_(None),
    )
    map_result = await session.execute(map_q)
    scene_map = map_result.scalar_one_or_none()
    if not scene_map:
        logger.info("需求 %s 无关联场景地图，跳过测试点标记", requirement_id)
        return []

    # 获取所有测试点
    tp_q = select(TestPoint).where(
        TestPoint.scene_map_id == scene_map.id,
        TestPoint.deleted_at.is_(None),
    )
    tp_result = await session.execute(tp_q)
    test_points = list(tp_result.scalars().all())

    if not test_points:
        return []

    # 构建变更文本的关键词集合
    changed_text = " ".join(f"{c.get('content', '')} {c.get('old_content', '')}" for c in diff_changes)
    change_keywords = _tokenize(changed_text)

    if not change_keywords:
        logger.debug("变更内容无有效关键词，跳过标记")
        return []

    affected_ids: list[str] = []
    for tp in test_points:
        tp_text = f"{tp.title or ''} {tp.description or ''} {tp.group_name or ''}"
        tp_keywords = _tokenize(tp_text)
        overlap = tp_keywords & change_keywords

        if len(overlap) >= 2:
            affected_ids.append(str(tp.id))
            tp.status = "needs_review"

    if affected_ids:
        await session.flush()

    logger.info(
        "需求 %s 标记 %d/%d 个受影响测试点",
        requirement_id,
        len(affected_ids),
        len(test_points),
    )
    return affected_ids


async def mark_affected_test_cases(
    session: AsyncSession,
    requirement_id: UUID,
    affected_point_ids: list[str],
) -> list[str]:
    """标记受影响测试点关联的用例为 needs_rewrite。

    Args:
        session: 数据库会话
        requirement_id: 需求 ID（兜底查询）
        affected_point_ids: 受影响的测试点 ID 列表

    Returns:
        受影响的用例 ID 列表
    """
    if not affected_point_ids:
        # 即使没有受影响的测试点，也根据 requirement_id 查关联用例
        stmt = select(TestCase).where(
            TestCase.requirement_id == requirement_id,
            TestCase.deleted_at.is_(None),
        )
    else:
        stmt = select(TestCase).where(
            TestCase.scene_node_id.in_(affected_point_ids),
            TestCase.deleted_at.is_(None),
        )

    result = await session.execute(stmt)
    cases = list(result.scalars().all())

    affected_case_ids: list[str] = []
    for case in cases:
        case.status = "needs_rewrite"
        affected_case_ids.append(str(case.id))

    if affected_case_ids:
        await session.flush()

    logger.info("标记 %d 个受影响用例", len(affected_case_ids))
    return affected_case_ids
