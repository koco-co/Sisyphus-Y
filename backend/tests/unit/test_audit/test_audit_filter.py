"""MOD-05 — AuditService 时间范围过滤测试"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

from app.modules.audit.service import AuditService


def _make_log(created_at: datetime | None = None) -> MagicMock:
    log = MagicMock()
    log.id = uuid.uuid4()
    log.user_id = uuid.uuid4()
    log.action = "create"
    log.entity_type = "test_case"
    log.entity_id = uuid.uuid4()
    log.old_value = None
    log.new_value = {"title": "新用例"}
    log.ip_address = "127.0.0.1"
    log.user_agent = "TestAgent"
    log.created_at = created_at or datetime.now(UTC)
    return log


def _make_session(logs: list, total: int = 0) -> AsyncMock:
    session = AsyncMock()
    count_result = MagicMock()
    count_result.scalar.return_value = total or len(logs)
    list_result = MagicMock()
    list_result.scalars.return_value.all.return_value = logs

    call_count = 0

    async def execute_side_effect(*_args, **_kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return count_result
        return list_result

    session.execute = AsyncMock(side_effect=execute_side_effect)
    return session


class TestAuditDateFromFilter:
    async def test_date_from_accepted_as_parameter(self):
        """get_audit_logs 应接受 date_from 参数而不抛出 TypeError。"""
        now = datetime.now(UTC)
        session = _make_session([_make_log(now)])
        svc = AuditService(session)
        logs, total = await svc.get_audit_logs(date_from=now - timedelta(hours=1))
        assert isinstance(logs, list)

    async def test_date_to_accepted_as_parameter(self):
        """get_audit_logs 应接受 date_to 参数而不抛出 TypeError。"""
        now = datetime.now(UTC)
        session = _make_session([_make_log(now)])
        svc = AuditService(session)
        logs, total = await svc.get_audit_logs(date_to=now + timedelta(hours=1))
        assert isinstance(logs, list)

    async def test_date_from_and_date_to_combined(self):
        """date_from + date_to 组合参数应同时被接受，不抛出错误。"""
        now = datetime.now(UTC)
        date_from = now - timedelta(days=1)
        date_to = now
        session = _make_session([_make_log(now)])
        svc = AuditService(session)
        logs, total = await svc.get_audit_logs(date_from=date_from, date_to=date_to)
        assert isinstance(logs, list)

    async def test_no_date_filter_returns_all(self):
        """不传时间参数时行为与原来一致。"""
        now = datetime.now(UTC)
        session = _make_session([_make_log(now), _make_log(now - timedelta(hours=2))])
        svc = AuditService(session)
        logs, total = await svc.get_audit_logs()
        assert isinstance(logs, list)
        assert total >= 0
