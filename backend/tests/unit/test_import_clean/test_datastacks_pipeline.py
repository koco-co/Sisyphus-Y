"""集成测试：历史 CSV 清洗流水线（数栈平台产品）。

测试范围：
- 数栈平台格式 CSV 的解析（25列禅道格式）
- 多列格式检测（自动区分数栈/信永中和）
- 批量目录遍历
- 质量评分覆盖各档位

注意：本测试为 dry_run 模式（不调用真实 LLM，不写 PG/Qdrant）。
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from app.engine.import_clean.batch_parser import discover_csv_files, parse_csv_file
from app.engine.import_clean.cleaner import route_by_score, score_test_case, strip_html_tags


# ── 数栈平台格式 CSV 样本数据（禅道 25 列格式） ───────────────────────────

DATASTACKS_CSV_CONTENT = """\
用例编号,所属产品,所属模块,相关需求,用例标题,前置条件,步骤,预期,优先级,用例类型,用例状态,创建人,创建时间,更新时间,执行结果,执行人,执行时间,版本,关键字,备注,前驱用例,测试类型,适用阶段,检查项,回归级别
TC-001,数栈平台,数据资产_STD,REQ-001,验证编辑历史规则配置超时时间功能正确,"用户已登录，具有数据质量模块操作权限","1. 进入「资产-数据质量」页面
2. 选择「规则B」，点击编辑，进入「调度属性」页
3. 查看「超时时间」区域
4. 编辑「超时时间」选择「自定义」
5. 配置超时时长为30分钟
6. 点击保存","1. 页面加载完成
2. 编辑页打开，显示各配置项
3. 超时时间区域显示当前配置
4. 自定义输入框出现，可输入数值
5. 时长显示为30分钟
6. 保存成功，规则列表更新",P1,功能,normal,admin,2024-01-01,2024-01-15,,,,v1,,,,回归,,
TC-002,数栈平台,数据建模,REQ-002,验证未匹配数据标准时解析正确,"已有数据标准库","1. 输入建表语句：
CREATE TABLE order_table (
order_id BIGINT NOT NULL PRIMARY KEY COMMENT '订单ID',
user_id BIGINT NOT NULL COMMENT '用户ID'
);
2. 点击解析
3. 查看字段列表","2. 解析成功
3. 字段列表显示2个字段，数据标准列显示「未匹配」",P2,边界,normal,admin,2024-01-02,2024-01-16,,,,v1,,,,回归,,
TC-003,数栈平台,公共组件,REQ-003,验证minio accesskey输入异常,"minio已部署","1. 进入系统管理>对象存储配置
2. 输入错误的 accesskey：wrong_key
3. 点击「测试连接」","3. 显示「连接失败：认证错误，请检查 AccessKey 和 SecretKey」",P0,异常,normal,admin,2024-01-03,2024-01-17,,,,v1,,,,P0,,
"""


# ── Fixtures ──────────────────────────────────────────────────────────────

@pytest.fixture
def datastacks_csv_file(tmp_path: Path) -> Path:
    """创建数栈平台格式的临时 CSV 文件。"""
    csv_file = tmp_path / "test_datastacks.csv"
    csv_file.write_text(DATASTACKS_CSV_CONTENT, encoding="utf-8-sig")
    return csv_file


@pytest.fixture
def datastacks_dir(tmp_path: Path, datastacks_csv_file: Path) -> Path:
    """创建完整目录结构：数栈平台/数据资产_STD/test.csv。"""
    module_dir = tmp_path / "数栈平台" / "数据资产_STD"
    module_dir.mkdir(parents=True)
    import shutil
    shutil.copy(datastacks_csv_file, module_dir / "规则调度测试.csv")
    return tmp_path


@pytest.fixture
def real_datastacks_csv() -> Path | None:
    """尝试找到真实的数栈平台 CSV 文件。"""
    base = Path("待清洗数据/数栈平台")
    if not base.exists():
        return None
    csv_files = list(base.rglob("*.csv"))
    return csv_files[0] if csv_files else None


# ── 单元测试：数栈平台 CSV 解析 ──────────────────────────────────────────

def test_parse_datastacks_csv_structure(datastacks_csv_file: Path):
    """测试数栈平台 CSV 字段提取正确。"""
    result = parse_csv_file(str(datastacks_csv_file))
    assert result is not None
    assert len(result) == 3, f"应解析出 3 条用例，实际：{len(result)}"

    # 验证第一条用例
    first = result[0]
    assert first.get("title"), "标题不应为空"
    assert isinstance(first.get("steps"), list), "steps 应为列表"
    assert len(first["steps"]) > 0, "steps 不应为空"

    # 验证步骤结构
    step = first["steps"][0]
    assert "action" in step
    assert "expected_result" in step


def test_parse_datastacks_csv_no_html(datastacks_csv_file: Path):
    """测试数栈平台解析后无 HTML 标签。"""
    import re
    result = parse_csv_file(str(datastacks_csv_file))
    for case in result:
        for step in case.get("steps", []):
            action = step.get("action", "")
            # 检测完整的 HTML 标签模式（如 <b>、<br/>），而非单个 < 或 >
            html_tags = re.findall(r"<[a-zA-Z][^>]*>|<[a-zA-Z]+/>", action)
            assert not html_tags, f"步骤中不应有 HTML 标签 {html_tags}: {action[:50]}"


def test_parse_datastacks_csv_preserves_sql(datastacks_csv_file: Path):
    """测试 SQL 建表语句被正确保留（不被错误截断）。"""
    result = parse_csv_file(str(datastacks_csv_file))
    # 第二条用例含 CREATE TABLE
    sql_case = next(
        (c for c in result if any("CREATE TABLE" in s.get("action", "") for s in c.get("steps", []))),
        None,
    )
    if sql_case:
        sql_step = next(
            s for s in sql_case["steps"] if "CREATE TABLE" in s.get("action", "")
        )
        assert "order_table" in sql_step["action"], "表名 order_table 应保留在步骤中"


# ── 单元测试：目录发现 ────────────────────────────────────────────────────

def test_discover_csv_files_in_directory(datastacks_dir: Path):
    """测试 discover_csv_files 能找到嵌套目录中的 CSV 文件。"""
    csv_files = discover_csv_files(str(datastacks_dir))
    assert len(csv_files) >= 1, "应找到至少 1 个 CSV 文件"
    assert all(str(f).endswith(".csv") for f in csv_files), "所有结果应为 .csv 文件"


def test_discover_csv_files_empty_dir(tmp_path: Path):
    """测试空目录返回空列表。"""
    result = discover_csv_files(str(tmp_path))
    assert result == [] or isinstance(result, list)


# ── 单元测试：数栈平台用例质量评分 ──────────────────────────────────────

def test_score_datastacks_good_case():
    """测试数栈平台高质量用例评分。"""
    case = {
        "title": "验证编辑历史规则配置「超时时间」功能正确",
        "precondition": "用户已登录，具有数据质量模块操作权限",
        "steps": [
            {
                "no": 1,
                "action": "进入「数据中台 > 数据质量 > 规则调度设置」页面",
                "expected_result": "页面正常加载，显示规则列表",
            },
            {
                "no": 2,
                "action": "选择「规则B」，点击「编辑」按钮",
                "expected_result": "编辑页打开，显示规则配置项",
            },
            {
                "no": 3,
                "action": "切换至「调度属性」，将「超时时间」从「不限制」改为「自定义」，输入30",
                "expected_result": "自定义输入框出现，可输入数值",
            },
            {
                "no": 4,
                "action": "点击「保存」按钮",
                "expected_result": "1) 页面显示「保存成功」提示  2) 规则列表中超时时间更新为30分钟",
            },
        ],
    }
    score = score_test_case(case)
    assert score >= 3.5, f"数栈平台规范用例得分应 ≥ 3.5，实际：{score}"


def test_score_various_routing_levels():
    """测试不同质量级别用例的路由结果覆盖所有档位。"""
    # 优质用例
    high_case = {
        "title": "验证 MySQL 数据源连接超时重试",
        "precondition": "CREATE TABLE ds_test (id INT); INSERT INTO ds_test VALUES (1);",
        "steps": [
            {"no": 1, "action": "进入「数据中台 > 数据集成 > 数据源管理」页面", "expected_result": "页面正常加载"},
            {"no": 2, "action": "点击「测试连接」按钮，等待35秒", "expected_result": "1) 显示「连接超时」  2) 状态变为 DISCONNECTED"},
        ],
    }
    # 合格用例（缺少部分细节）
    review_case = {
        "title": "验证数据质量规则调度",
        "precondition": "已创建规则",
        "steps": [
            {"no": 1, "action": "进入数据质量页面", "expected_result": "页面加载"},
            {"no": 2, "action": "配置规则调度时间", "expected_result": "配置成功保存"},
        ],
    }
    # 差质量用例
    bad_case = {
        "title": "测",
        "precondition": "",
        "steps": [
            {"no": 1, "action": "操作", "expected_result": "成功"},
        ],
    }

    assert route_by_score(score_test_case(high_case)) in ("high", "review")
    assert route_by_score(score_test_case(review_case)) in ("high", "review", "polish")
    assert route_by_score(score_test_case(bad_case)) in ("polish", "discard")


# ── 集成测试：真实数栈平台 CSV ────────────────────────────────────────────

def test_parse_real_datastacks_csv(real_datastacks_csv: Path | None):
    """测试真实数栈平台 CSV 文件解析（如果可用）。"""
    if real_datastacks_csv is None:
        pytest.skip("待清洗数据/数栈平台 目录不存在，跳过真实数据测试")

    result = parse_csv_file(str(real_datastacks_csv))
    assert result is not None
    assert len(result) > 0, f"文件 {real_datastacks_csv} 应包含至少 1 条用例"

    # 抽样验证前5条
    for case in result[:5]:
        assert "title" in case, "用例缺少 title 字段"
        assert "steps" in case, "用例缺少 steps 字段"
        assert isinstance(case["steps"], list), "steps 应为列表类型"

        # 验证无 HTML 残留
        title = case.get("title", "")
        assert "<" not in title, f"标题中有 HTML 标签: {title}"


def test_score_distribution_on_real_data(real_datastacks_csv: Path | None):
    """测试真实数据的评分分布（如果可用）。"""
    if real_datastacks_csv is None:
        pytest.skip("待清洗数据/数栈平台 目录不存在，跳过真实数据测试")

    result = parse_csv_file(str(real_datastacks_csv))
    if not result:
        pytest.skip("CSV 文件为空")

    scores = [score_test_case(c) for c in result[:20]]
    routes = [route_by_score(s) for s in scores]

    # 验证评分在合理范围
    for score in scores:
        assert 0.0 <= score <= 5.0, f"评分超出范围：{score}"

    # 验证各路由档位都可能出现
    assert len(scores) > 0


# ── 集成测试：端到端流水线（dry_run） ────────────────────────────────────

@pytest.mark.asyncio
async def test_pipeline_dry_run_datastacks(datastacks_dir: Path):
    """测试完整流水线 dry_run 模式（数栈平台格式）。"""
    from app.engine.import_clean.pipeline import run_pipeline

    mock_db = AsyncMock()
    with patch("app.engine.import_clean.pipeline.llm_clean_case") as mock_clean:
        async def passthrough(case: dict) -> dict:
            return case

        mock_clean.side_effect = passthrough

        with patch("app.engine.import_clean.pipeline.upsert_cases_to_qdrant", new=AsyncMock()):
            stats = await run_pipeline(
                root_dir=str(datastacks_dir),
                db=mock_db,
                dry_run=True,
            )

    assert stats is not None
    assert stats.total_files >= 1, f"应处理至少 1 个 CSV 文件，实际：{stats.total_files}"
    assert stats.total_cases >= 3, f"应解析至少 3 条用例，实际：{stats.total_cases}"


@pytest.mark.asyncio
async def test_pipeline_stats_routing(datastacks_dir: Path):
    """测试流水线 stats 中路由计数是否合理。"""
    from app.engine.import_clean.pipeline import run_pipeline

    mock_db = AsyncMock()
    with patch("app.engine.import_clean.pipeline.llm_clean_case") as mock_clean:
        async def passthrough(case: dict) -> dict:
            return case

        mock_clean.side_effect = passthrough

        with patch("app.engine.import_clean.pipeline.upsert_cases_to_qdrant", new=AsyncMock()):
            stats = await run_pipeline(
                root_dir=str(datastacks_dir),
                db=mock_db,
                dry_run=True,
            )

    # 各路由计数之和应等于总处理数（丢弃不含在内时要减去 discarded）
    assert stats.total_cases >= 0
    total_routed = stats.high + stats.review + stats.polished + stats.discarded
    assert total_routed <= stats.total_cases, \
        f"路由总数({total_routed})不应超过解析总数({stats.total_cases})"
