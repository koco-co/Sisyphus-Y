"""MOD-04 — SearchService entity_types 参数测试

后端不强制限制 entity_types，允许任意类型传入（前端负责过滤）。
此测试验证 entity_types 参数被正常处理（非法类型被忽略，合法类型正常搜索）。
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

from app.modules.search.service import SearchService


def _make_requirement(title: str = "需求标题") -> MagicMock:
    req = MagicMock()
    req.id = uuid.uuid4()
    req.title = title
    req.req_id = "REQ-001"
    req.updated_at = datetime.now(UTC)
    return req


def _make_testcase(title: str = "用例标题") -> MagicMock:
    tc = MagicMock()
    tc.id = uuid.uuid4()
    tc.title = title
    tc.case_id = "TC-001"
    tc.updated_at = datetime.now(UTC)
    return tc


class TestSearchEntityTypesRestriction:
    async def test_requirement_type_returns_results(self):
        """传入 requirement 类型时应正常返回结果（ILIKE 路径）。"""
        req = _make_requirement()

        # FTS result (returns empty set of ids)
        fts_result = MagicMock()
        fts_result.all.return_value = []
        # ILIKE id result (also empty, so falls through to combined_ids check)
        ilike_id_result = MagicMock()
        ilike_id_result.all.return_value = [(req.id,)]
        # Final select result
        final_result = MagicMock()
        final_result.scalars.return_value.all.return_value = [req]

        call_count = 0

        async def execute_side_effect(*_args, **_kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return fts_result      # FTS query
            if call_count == 2:
                return ilike_id_result  # ILIKE id query
            return final_result        # Final select by ids

        session = AsyncMock()
        session.execute = AsyncMock(side_effect=execute_side_effect)
        session.rollback = AsyncMock()

        svc = SearchService(session)
        items, total = await svc.global_search("需求", entity_types=["requirement"])

        assert total >= 1
        assert items[0].entity_type == "requirement"
        assert items[0].title == "需求标题"

    async def test_unknown_entity_type_is_silently_ignored(self):
        """传入后端未知的 entity_type（如 'diagnosis_old'）应被忽略，不抛出异常。"""
        session = AsyncMock()
        session.execute = AsyncMock(return_value=MagicMock())

        svc = SearchService(session)
        items, total = await svc.global_search("关键词", entity_types=["unknown_type_xyz"])

        assert items == []
        assert total == 0

    async def test_none_entity_types_searches_all(self):
        """entity_types=None 时不会报错（搜索所有已知类型）。"""
        # All FTS queries return empty, triggering empty combined_ids -> continue
        fts_result = MagicMock()
        fts_result.all.return_value = []
        ilike_id_result = MagicMock()
        ilike_id_result.all.return_value = []

        async def execute_side_effect(*_args, **_kwargs):
            return fts_result

        session = AsyncMock()
        session.execute = AsyncMock(side_effect=execute_side_effect)
        session.rollback = AsyncMock()

        svc = SearchService(session)
        items, total = await svc.global_search("全局", entity_types=None)
        # 所有结果为空但不应报错
        assert total >= 0
        assert isinstance(items, list)
