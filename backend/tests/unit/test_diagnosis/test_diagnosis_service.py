"""DiagnosisService 回归测试。"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.diagnosis.service import DiagnosisService


def _make_report():
    report = MagicMock()
    report.id = uuid.uuid4()
    report.status = "running"
    report.summary = None
    report.risk_count_high = 1
    report.risk_count_medium = 2
    report.risk_count_industry = 3
    report.overall_score = None
    return report


class TestPersistAiResponse:
    async def test_persist_ai_response_extracts_markdown_risks_and_score(self):
        """Markdown 风险表格应被解析并持久化为 DiagnosisRisk。"""
        report = _make_report()
        session = AsyncMock()
        session.add = MagicMock()
        session.get = AsyncMock(return_value=report)
        session.flush = AsyncMock()
        session.commit = AsyncMock()

        service = DiagnosisService(session)
        ai_content = """## 测试健康诊断报告

### 总体健康评分
- 评分：40/100

### 风险点列表
| ID | Title | Description | Risk Level | Suggestion |
| --- | --- | --- | --- | --- |
| R1 | 权限校验缺失 | 管理员与普通用户权限边界不清 | high | 补充 RBAC 校验 |
| R2 | 导入上限未定义 | 批量导入的最大记录数未说明 | medium | 明确容量上限 |
"""

        risks = await service.persist_ai_response(report.id, ai_content)

        assert len(risks) == 2
        assert risks[0].title == "权限校验缺失"
        assert risks[0].level == "high"
        assert risks[1].title == "导入上限未定义"
        assert report.risk_count_high == 1
        assert report.risk_count_medium == 1
        assert report.overall_score == 40.0


class TestExtractRiskItems:
    def _make_service(self):
        session = AsyncMock()
        return DiagnosisService(session)

    def test_extracts_dimensions_from_json_code_block(self):
        """JSON 代码块中的 dimensions 格式应被正确解析（BUG-002 修复）。"""
        service = self._make_service()
        ai_content = """以下是分析结果：

```json
{
  "overall_health_score": 72,
  "dimensions": [
    {"title": "接口安全", "description": "缺少鉴权", "risk_level": "high", "suggestion": "加 JWT"},
    {"title": "边界覆盖", "description": "未定义上限", "risk_level": "medium", "suggestion": "明确范围"}
  ]
}
```
"""
        items = service._extract_risk_items(ai_content)
        assert len(items) == 2
        assert items[0]["title"] == "接口安全"
        assert items[0]["level"] == "high"
        assert items[1]["title"] == "边界覆盖"
        assert items[1]["level"] == "medium"

    def test_extracts_dimensions_from_bare_json_object(self):
        """无代码块包裹的 JSON 对象也应能提取。"""
        service = self._make_service()
        ai_content = '{"overall_health_score": 60, "dimensions": [{"title": "缺失场景", "description": "无异常流", "risk_level": "high", "suggestion": "补充"}]}'
        items = service._extract_risk_items(ai_content)
        assert len(items) == 1
        assert items[0]["title"] == "缺失场景"
        assert items[0]["level"] == "high"

    def test_extracts_json_array_format(self):
        """纯数组格式（risk_level 字段别名）应被正确提取。"""
        service = self._make_service()
        ai_content = '[{"title": "并发未定义", "description": "TPS 上限未说明", "risk_level": "medium"}]'
        items = service._extract_risk_items(ai_content)
        assert len(items) == 1
        assert items[0]["title"] == "并发未定义"
        assert items[0]["level"] == "medium"

    def test_filters_items_without_title(self):
        """无 title 字段的项应被过滤。"""
        service = self._make_service()
        ai_content = '{"dimensions": [{"description": "无标题项", "risk_level": "low"}, {"title": "有标题", "risk_level": "high"}]}'
        items = service._extract_risk_items(ai_content)
        assert len(items) == 1
        assert items[0]["title"] == "有标题"


class TestCompleteReport:
    async def test_complete_report_preserves_existing_risk_counts_by_default(self):
        """仅更新 summary/status 时不应把既有风险计数重置为 0。"""
        report = _make_report()
        session = AsyncMock()
        session.get = AsyncMock(return_value=report)
        session.commit = AsyncMock()
        session.refresh = AsyncMock()

        service = DiagnosisService(session)
        await service.complete_report(report.id, summary="诊断完成")

        assert report.status == "completed"
        assert report.summary == "诊断完成"
        assert report.risk_count_high == 1
        assert report.risk_count_medium == 2
        assert report.risk_count_industry == 3


class TestStreamingAdapterUsage:
    async def test_run_stream_uses_guarded_fallback_stream(self):
        session = AsyncMock()
        requirement = MagicMock()
        requirement.content_ast = {"raw_text": "需求内容", "sections": [{"title": "ignored"}]}
        requirement.title = "数据源管理"
        session.get = AsyncMock(return_value=requirement)

        service = DiagnosisService(session)
        guarded_stream = AsyncMock(return_value=iter(()))

        with patch(
            "app.modules.diagnosis.service.get_thinking_stream_with_fallback",
            new=guarded_stream,
            create=True,
        ):
            await service.run_stream(uuid.uuid4())

        guarded_stream.assert_awaited_once()
        call = guarded_stream.await_args
        assert call.kwargs["provider"] == "zhipu"
        assert call.kwargs["model"] == "glm-4-flash"
        assert "需求内容" in call.args[0][0]["content"]
        assert "sections" not in call.args[0][0]["content"]

    async def test_chat_stream_uses_guarded_fallback_stream(self):
        report = _make_report()
        session = AsyncMock()
        session.execute = AsyncMock(return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=lambda: []))))

        service = DiagnosisService(session)
        service.get_report = AsyncMock(return_value=report)
        guarded_stream = AsyncMock(return_value=iter(()))

        with patch(
            "app.modules.diagnosis.service.get_thinking_stream_with_fallback",
            new=guarded_stream,
            create=True,
        ):
            await service.chat_stream(uuid.uuid4(), "请补充超时策略")

        guarded_stream.assert_awaited_once()
        call = guarded_stream.await_args
        assert call.kwargs["provider"] == "zhipu"
        assert call.kwargs["model"] == "glm-4-flash"
        assert call.args[0][-1] == {"role": "user", "content": "请补充超时策略"}
