"""Tests for the data cleaning engine."""

from app.engine.import_clean.cleaner import (
    normalize_empty_values,
    score_test_case,
    strip_html_tags,
)


class TestStripHtmlTags:
    def test_basic_tags(self):
        assert strip_html_tags("<b>bold</b>") == "bold"

    def test_br_to_newline(self):
        assert strip_html_tags("line1<br/>line2") == "line1\nline2"

    def test_p_tags(self):
        assert strip_html_tags("<p>paragraph</p>") == "paragraph"

    def test_entities(self):
        assert strip_html_tags("&amp; &lt; &gt; &nbsp;") == "& < >"

    def test_empty(self):
        assert strip_html_tags("") == ""
        assert strip_html_tags(None) == ""

    def test_no_html(self):
        assert strip_html_tags("plain text") == "plain text"

    def test_nested(self):
        result = strip_html_tags("<div><p>hello <b>world</b></p></div>")
        assert result == "hello world"


class TestNormalizeEmptyValues:
    def test_none(self):
        assert normalize_empty_values(None) == ""

    def test_empty_string(self):
        assert normalize_empty_values("") == ""

    def test_dash(self):
        assert normalize_empty_values("-") == ""

    def test_na(self):
        assert normalize_empty_values("N/A") == ""
        assert normalize_empty_values("n/a") == ""

    def test_chinese_wu(self):
        assert normalize_empty_values("无") == ""
        assert normalize_empty_values("无。") == ""

    def test_null(self):
        assert normalize_empty_values("null") == ""
        assert normalize_empty_values("NULL") == ""

    def test_real_value(self):
        assert normalize_empty_values("有效数据") == "有效数据"

    def test_whitespace(self):
        assert normalize_empty_values("  ") == ""


class TestScoreTestCase:
    def test_perfect_case(self):
        case = {
            "title": "验证用户登录功能在正确账号密码下的成功场景",
            "precondition": "系统已部署，数据库已初始化",
            "priority": "P1",
            "steps": [
                {"no": 1, "action": "打开登录页面", "expected_result": "登录页面展示正确"},
                {"no": 2, "action": "输入账号密码", "expected_result": "输入成功"},
                {"no": 3, "action": "点击登录", "expected_result": "跳转到首页"},
            ],
        }
        score = score_test_case(case)
        # 0-5 量级：含多步骤+预期结果应得 ≥ 2.5（合格线以上）
        assert score >= 2.5, f"合格用例得分应 ≥ 2.5，实际：{score}"

    def test_empty_case(self):
        score = score_test_case({})
        # 空用例应得极低分
        assert score <= 1.5, f"空用例得分应 ≤ 1.5，实际：{score}"

    def test_title_only(self):
        case = {"title": "简单标题"}
        score = score_test_case(case)
        # 只有标题，无步骤，分数较低
        assert 0.0 <= score <= 2.0, f"仅有标题的用例得分应在 0-2.0，实际：{score}"

    def test_html_in_content(self):
        case = {
            "title": "标题",
            "steps": [{"no": 1, "action": "<b>step</b>", "expected_result": "ok"}],
        }
        score = score_test_case(case)
        # 含 HTML 标签不影响评分逻辑（评分基于内容质量，非格式）
        assert 0.0 <= score <= 5.0

    def test_missing_expected_results(self):
        case = {
            "title": "验证用户登录功能正确",
            "steps": [
                {"no": 1, "action": "打开页面", "expected_result": ""},
                {"no": 2, "action": "点击按钮", "expected_result": ""},
            ],
        }
        score = score_test_case(case)
        # 缺少预期结果会扣分
        assert score < 4.0, f"缺失预期结果的用例得分应 < 4.0，实际：{score}"
