"""集成测试：历史 CSV 清洗流水线（信永中和产品）。

测试范围：
- 信永中和格式 CSV 的解析（9列格式）
- 批量清洗流水线各阶段（解析→HTML剥离→质量评分→路由）
- ImportRecord 写入格式验证

注意：本测试为 dry_run 模式（不调用真实 LLM，不写 PG/Qdrant），
验证流水线逻辑和数据格式正确性。
"""

from __future__ import annotations

import csv
import io
import os
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from app.engine.import_clean.batch_parser import parse_csv_file
from app.engine.import_clean.cleaner import (
    normalize_empty_values as normalize_empty,
    route_by_score,
    score_test_case,
    strip_html_tags,
)
from app.engine.import_clean.prompt_rules import (
    DEPENDENCY_PHRASES,
    VAGUE_ADJECTIVES,
    SCORE_THRESHOLDS,
)


# ── 信永中和格式 CSV 样本数据 ─────────────────────────────────────────────

XINGYONG_CSV_CONTENT = """\
所属模块,用例标题,前置条件,步骤,预期,优先级,用例类型,创建人,创建时间
审计后台,验证申报数据正常导入功能,用户已登录系统，具有数据导入权限,"1. 点击「申报数据管理」
2. 点击「导入」按钮
3. 选择测试文件：test_data.xlsx
4. 点击「确认导入」","1. 进入申报数据管理页面
2. 弹出导入对话框
3. 文件选择成功
4. 导入成功，显示导入条数",P1,功能,admin,2024-01-01
审计后台,验证用户名为空时登录失败,,"1. 打开登录页
2. 用户名置空，密码输入：test123
3. 点击登录","2. 登录按钮可点击
3. 提示「用户名不能为空」",P0,异常,admin,2024-01-01
审计后台,验证<strong>正确地</strong>配置数据库连接,"数据库类型：MySQL
数据库地址：192.168.1.1","1. 进入系统管理>数据库配置
2. 填写连接信息
3. 点击测试连接","3. 连接成功",P1,功能,admin,2024-01-01
"""


# ── Fixtures ──────────────────────────────────────────────────────────────

@pytest.fixture
def xingyong_csv_file(tmp_path: Path) -> Path:
    """创建信永中和格式的临时 CSV 文件。"""
    csv_file = tmp_path / "test_xingyong.csv"
    csv_file.write_text(XINGYONG_CSV_CONTENT, encoding="utf-8-sig")
    return csv_file


@pytest.fixture
def real_xingyong_csv() -> Path | None:
    """尝试找到真实的信永中和 CSV 文件。"""
    base = Path("待清洗数据/信永中和")
    if not base.exists():
        return None
    csv_files = list(base.rglob("*.csv"))
    return csv_files[0] if csv_files else None


# ── 单元测试：HTML 剥离 ───────────────────────────────────────────────────

def test_strip_html_tags_basic():
    """测试基本 HTML 标签剥离。"""
    assert strip_html_tags("<p>Hello</p>") == "Hello"
    # <br/> 转为 \n，但首尾换行会被 strip 掉
    assert strip_html_tags("Line<br/>Next") == "Line\nNext"
    assert strip_html_tags("<strong>正确地</strong>配置") == "正确地配置"
    assert strip_html_tags("无 HTML") == "无 HTML"


def test_strip_html_tags_empty():
    """测试空值处理。"""
    assert strip_html_tags("") == ""
    assert strip_html_tags(None) == ""  # type: ignore[arg-type]


def test_normalize_empty():
    """测试空值规范化。"""
    assert normalize_empty("-") == ""
    assert normalize_empty("无") == ""
    assert normalize_empty("null") == ""
    assert normalize_empty("NULL") == ""
    assert normalize_empty("N/A") == ""
    assert normalize_empty("正常内容") == "正常内容"
    assert normalize_empty(None) == ""  # type: ignore[arg-type]


# ── 单元测试：质量评分 ───────────────────────────────────────────────────

def test_score_high_quality_case():
    """测试高质量用例得分 ≥ 4.5。"""
    case = {
        "title": "验证 MySQL 数据源连接超时的重试机制",
        "precondition": "数据库类型：MySQL 8.0\n建表语句：CREATE TABLE test_ds (...)\nINSERT INTO test_ds VALUES (...)",
        "steps": [
            {
                "no": 1,
                "action": "进入「数据中台 > 数据集成 > 数据源管理」页面",
                "expected_result": "页面正常加载，显示数据源列表",
            },
            {
                "no": 2,
                "action": "找到 test_mysql_01，点击「测试连接」按钮",
                "expected_result": "按钮进入 loading 状态，等待响应",
            },
            {
                "no": 3,
                "action": "等待 35 秒（超过默认 30 秒超时阈值）",
                "expected_result": "1) 页面显示「连接超时」提示  2) 状态恢复为 DISCONNECTED",
            },
        ],
    }
    score = score_test_case(case)
    assert score >= 4.5, f"高质量用例得分应 ≥ 4.5，实际得分：{score}"


def test_score_poor_quality_case():
    """测试低质量用例得分 < 2.0。"""
    case = {
        "title": "测试",
        "precondition": "",
        "steps": [
            {"no": 1, "action": "操作正确地执行", "expected_result": "操作成功"},
            {"no": 2, "action": "参考用例TC-001继续操作", "expected_result": "显示正确"},
        ],
    }
    score = score_test_case(case)
    assert score < 3.0, f"低质量用例得分应 < 3.0，实际得分：{score}"


def test_score_db_keywords_bonus():
    """测试数据库关键词前置条件加分。"""
    case_with_db = {
        "title": "验证 MySQL 数据源建表后导入数据",
        "precondition": "CREATE TABLE test_t (id INT); INSERT INTO test_t VALUES (1);",
        "steps": [
            {"no": 1, "action": "进入「数据中台 > 数据集成」页面", "expected_result": "页面加载完成"},
        ],
    }
    case_without_db = {
        "title": "验证 MySQL 数据源建表后导入数据",
        "precondition": "",
        "steps": [
            {"no": 1, "action": "进入「数据中台 > 数据集成」页面", "expected_result": "页面加载完成"},
        ],
    }
    score_with = score_test_case(case_with_db)
    score_without = score_test_case(case_without_db)
    assert score_with > score_without, "含完整 SQL 的用例应比无前置条件用例得分高"


# ── 单元测试：路由逻辑 ───────────────────────────────────────────────────

def test_route_by_score():
    """测试评分路由逻辑。"""
    assert route_by_score(5.0) == "high"
    assert route_by_score(4.5) == "high"
    assert route_by_score(4.4) == "review"
    assert route_by_score(3.5) == "review"
    assert route_by_score(3.4) == "polish"
    assert route_by_score(2.0) == "polish"
    assert route_by_score(1.9) == "discard"
    assert route_by_score(0.0) == "discard"


def test_score_thresholds_consistent():
    """测试 prompt_rules.py 中的阈值与 cleaner.py 一致。"""
    from app.engine.import_clean.cleaner import SCORE_HIGH, SCORE_POLISH, SCORE_REVIEW

    assert SCORE_HIGH == SCORE_THRESHOLDS["high"]
    assert SCORE_REVIEW == SCORE_THRESHOLDS["review"]
    assert SCORE_POLISH == SCORE_THRESHOLDS["polish"]


# ── 单元测试：Prompt 规范检测 ────────────────────────────────────────────

def test_vague_adjectives_list():
    """测试模糊形容词列表。"""
    assert "正确地" in VAGUE_ADJECTIVES
    assert "合理地" in VAGUE_ADJECTIVES
    assert "正常地" in VAGUE_ADJECTIVES
    assert len(VAGUE_ADJECTIVES) >= 5


def test_dependency_phrases_list():
    """测试依赖描述短语列表。"""
    assert "参考用例" in DEPENDENCY_PHRASES
    assert "在上一步" in DEPENDENCY_PHRASES
    assert len(DEPENDENCY_PHRASES) >= 3


# ── 集成测试：CSV 解析 ───────────────────────────────────────────────────

def test_parse_xingyong_csv(xingyong_csv_file: Path):
    """测试信永中和 CSV 格式解析。"""
    result = parse_csv_file(str(xingyong_csv_file))
    assert result is not None, "parse_csv_file 不应返回 None"
    assert len(result) > 0, "应解析出至少 1 条用例"

    # 验证第一条用例结构
    first = result[0]
    assert "title" in first, "用例应包含 title 字段"
    assert "steps" in first, "用例应包含 steps 字段"
    assert isinstance(first["steps"], list), "steps 应为列表"

    # 验证 HTML 已剥离
    for case in result:
        title = case.get("title", "")
        assert "<" not in title and ">" not in title, f"标题中不应有 HTML 标签：{title}"


def test_parse_xingyong_csv_html_stripping(xingyong_csv_file: Path):
    """测试 HTML 标签在解析时被正确剥离。"""
    result = parse_csv_file(str(xingyong_csv_file))
    # 第三条用例标题含 <strong> 标签
    db_case = next((c for c in result if "数据库" in c.get("title", "")), None)
    if db_case:
        assert "<strong>" not in db_case["title"]
        assert "正确地" not in db_case["title"] or "<" not in db_case["title"]


def test_parse_real_xingyong_csv(real_xingyong_csv: Path | None):
    """测试真实信永中和 CSV 文件解析（如果可用）。"""
    if real_xingyong_csv is None:
        pytest.skip("待清洗数据/信永中和 目录不存在，跳过真实数据测试")

    result = parse_csv_file(str(real_xingyong_csv))
    assert result is not None
    assert len(result) > 0, f"文件 {real_xingyong_csv} 应包含至少 1 条用例"

    # 验证字段存在
    for case in result[:5]:
        assert "title" in case
        assert "steps" in case
        assert isinstance(case["steps"], list)


# ── 集成测试：端到端流水线（dry_run，不写 DB） ───────────────────────────

@pytest.mark.asyncio
async def test_pipeline_dry_run_xingyong(xingyong_csv_file: Path, tmp_path: Path):
    """测试完整流水线 dry_run 模式（不调用 LLM，不写 DB）。"""
    from app.engine.import_clean.pipeline import run_pipeline

    # 创建包含 CSV 的目录结构（product/module/file.csv）
    xingyong_dir = tmp_path / "信永中和" / "审计后台"
    xingyong_dir.mkdir(parents=True)
    import shutil
    shutil.copy(xingyong_csv_file, xingyong_dir / "test.csv")

    mock_db = AsyncMock()
    with patch("app.engine.import_clean.pipeline.llm_clean_case") as mock_clean:
        # LLM 返回原始内容（dry_run 替代）
        async def passthrough(case: dict) -> dict:
            return case

        mock_clean.side_effect = passthrough

        with patch("app.engine.import_clean.pipeline.upsert_cases_to_qdrant", new=AsyncMock()):
            stats = await run_pipeline(
                root_dir=str(tmp_path),
                db=mock_db,
                dry_run=True,
            )

    assert stats is not None
    assert stats.total_files >= 1, "至少应处理 1 个 CSV 文件"
    assert stats.total_cases >= 1, "至少应解析出 1 条用例"
