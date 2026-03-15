"""B-M03-15 — 诊断模块 API 测试"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import ASGITransport, AsyncClient

# ── Tests ────────────────────────────────────────────────────────────


class TestScanEndpoint:
    """测试诊断扫描端点。"""

    async def test_scan_endpoint_creates_report(self):
        """POST /api/diagnosis/{req_id}/run 应触发扫描流程并返回 SSE 流。"""
        req_id = uuid.uuid4()

        mock_report = MagicMock()
        mock_report.id = uuid.uuid4()
        mock_report.requirement_id = req_id
        mock_report.status = "scanning"

        mock_service_instance = AsyncMock()
        mock_service_instance.create_or_get_report = AsyncMock(return_value=mock_report)

        async def fake_stream():
            yield 'event: content\ndata: {"delta": "分析中..."}\n\n'

        mock_service_instance.run_stream = AsyncMock(return_value=fake_stream())

        with patch("app.modules.diagnosis.router.DiagnosisService", return_value=mock_service_instance):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post(f"/api/diagnosis/{req_id}/run")

            app.dependency_overrides.clear()

        assert resp.status_code == 200


class TestChatEndpoint:
    """测试诊断对话端点。"""

    async def test_chat_endpoint(self):
        """POST /api/diagnosis/{req_id}/chat 应接受消息并返回流式响应。"""
        req_id = uuid.uuid4()

        mock_report = MagicMock()
        mock_report.id = uuid.uuid4()
        mock_report.requirement_id = req_id
        mock_report.status = "completed"

        mock_service_instance = AsyncMock()
        mock_service_instance.create_or_get_report = AsyncMock(return_value=mock_report)
        mock_service_instance.save_message = AsyncMock()

        async def fake_stream():
            yield 'event: content\ndata: {"delta": "回答"}\n\n'

        mock_service_instance.chat_stream = AsyncMock(return_value=fake_stream())

        with patch("app.modules.diagnosis.router.DiagnosisService", return_value=mock_service_instance):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post(
                    f"/api/diagnosis/{req_id}/chat",
                    json={"message": "数据同步的异常处理策略是什么？"},
                )

            app.dependency_overrides.clear()

        assert resp.status_code == 200


class TestConfirmRiskEndpoint:
    """测试 PATCH /diagnosis/risks/{risk_id}/confirm 端点。"""

    async def test_confirm_risk_returns_confirmed_true(self):
        """PATCH /api/diagnosis/risks/{risk_id}/confirm 返回 200 且 confirmed=true。"""
        risk_id = uuid.uuid4()
        report_id = uuid.uuid4()

        _now = datetime.now(timezone.utc)
        mock_risk = MagicMock()
        mock_risk.id = risk_id
        mock_risk.report_id = report_id
        mock_risk.level = "high"
        mock_risk.title = "测试风险"
        mock_risk.description = "描述"
        mock_risk.risk_status = "pending"
        mock_risk.confirmed = True
        mock_risk.deleted_at = None
        mock_risk.created_at = _now
        mock_risk.updated_at = _now

        mock_service_instance = AsyncMock()
        mock_service_instance.get_risk = AsyncMock(return_value=mock_risk)
        mock_service_instance.confirm_risk = AsyncMock(return_value=mock_risk)

        with patch("app.modules.diagnosis.router.DiagnosisService", return_value=mock_service_instance):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.patch(f"/api/diagnosis/risks/{risk_id}/confirm")

            app.dependency_overrides.clear()

        assert resp.status_code == 200
        data = resp.json()
        assert data["confirmed"] is True

    async def test_confirm_risk_not_found_returns_404(self):
        """PATCH /api/diagnosis/risks/{nonexistent_id}/confirm 返回 404。"""
        risk_id = uuid.uuid4()

        mock_service_instance = AsyncMock()
        mock_service_instance.get_risk = AsyncMock(return_value=None)

        with patch("app.modules.diagnosis.router.DiagnosisService", return_value=mock_service_instance):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.patch(f"/api/diagnosis/risks/{risk_id}/confirm")

            app.dependency_overrides.clear()

        assert resp.status_code == 404

    async def test_confirm_risk_idempotent(self):
        """同一 risk 二次 confirm 仍返回 200（幂等）。"""
        risk_id = uuid.uuid4()
        report_id = uuid.uuid4()

        _now = datetime.now(timezone.utc)
        mock_risk = MagicMock()
        mock_risk.id = risk_id
        mock_risk.report_id = report_id
        mock_risk.level = "high"
        mock_risk.title = "测试风险"
        mock_risk.description = None
        mock_risk.risk_status = "confirmed"
        mock_risk.confirmed = True
        mock_risk.deleted_at = None
        mock_risk.created_at = _now
        mock_risk.updated_at = _now

        mock_service_instance = AsyncMock()
        mock_service_instance.get_risk = AsyncMock(return_value=mock_risk)
        mock_service_instance.confirm_risk = AsyncMock(return_value=mock_risk)

        with patch("app.modules.diagnosis.router.DiagnosisService", return_value=mock_service_instance):
            from app.core.database import get_async_session
            from app.main import app

            async def _override():
                yield AsyncMock()

            app.dependency_overrides[get_async_session] = _override
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp1 = await ac.patch(f"/api/diagnosis/risks/{risk_id}/confirm")
                resp2 = await ac.patch(f"/api/diagnosis/risks/{risk_id}/confirm")

            app.dependency_overrides.clear()

        assert resp1.status_code == 200
        assert resp2.status_code == 200
