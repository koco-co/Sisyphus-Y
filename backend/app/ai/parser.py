"""AI 输出解析器 — 从 LLM 文本中提取结构化测试点和用例。"""

import json
import logging
import re

logger = logging.getLogger(__name__)

_FUZZY_KEYWORDS = (
    "例如",
    "比如",
    "类似",
    "合适的值",
    "有效值",
    "相关信息",
    "相关内容",
    "操作成功",
    "显示正常",
    "结果正确",
    "显示正确",
    "功能正常",
    "符合预期",
    "无报错",
    "加载正常",
    "页面正常显示",
    "系统提示成功",
    "适当数据",
    "合法值",
    "填写相关",
    "选择对应选项",
    "输入合理的",
    "选择一个",
)

_VALID_PRIORITIES = {"P0", "P1", "P2"}
_VALID_CASE_TYPES = {
    "functional",
    "exception",
    "boundary",
    "performance",
    "security",
    "compatibility",
}


# ── JSON extraction ─────────────────────────────────────────────────


def _strip_trailing_commas(text: str) -> str:
    """Remove trailing commas before ] or } to fix common LLM JSON errors."""
    return re.sub(r",\s*([}\]])", r"\1", text)


def _try_parse_json(text: str) -> list[dict] | dict | None:
    """Attempt JSON parse with trailing-comma repair."""
    for candidate in (text, _strip_trailing_commas(text)):
        try:
            result = json.loads(candidate.strip())
            if isinstance(result, (list, dict)):
                return result
        except json.JSONDecodeError:
            continue
    return None


def _try_repair_truncated_json(text: str) -> list[dict] | None:
    """Attempt to repair truncated JSON arrays by closing open brackets."""
    stripped = text.rstrip()
    if not stripped.startswith("["):
        return None

    # Count unclosed brackets
    open_braces = stripped.count("{") - stripped.count("}")
    open_brackets = stripped.count("[") - stripped.count("]")

    if open_braces <= 0 and open_brackets <= 0:
        return None

    # Remove potential trailing partial key-value pair
    repaired = re.sub(r',\s*"[^"]*"?\s*:?\s*"?[^"]*$', "", stripped)
    repaired = repaired.rstrip(", \t\n")
    repaired += "}" * max(0, open_braces) + "]" * max(0, open_brackets)
    repaired = _strip_trailing_commas(repaired)

    try:
        result = json.loads(repaired)
        if isinstance(result, list):
            logger.warning("Repaired truncated JSON: recovered %d items", len(result))
            return result
    except json.JSONDecodeError:
        pass
    return None


def _extract_json(text: str) -> list[dict] | dict | None:
    """Try to extract JSON from *text*, supporting ```json code blocks."""
    # 1. ```json ... ``` fenced blocks
    pattern = r"```(?:json)?\s*\n?(.*?)\n?\s*```"
    for match in re.findall(pattern, text, re.DOTALL):
        result = _try_parse_json(match.strip())
        if result is not None:
            return result

    # 2. Whole text as JSON
    result = _try_parse_json(text)
    if result is not None:
        return result

    # 3. Greedy search: first '[' to last ']' captures full outer array
    match_obj = re.search(r"\[.*\]", text, re.DOTALL)
    if match_obj:
        result = _try_parse_json(match_obj.group())
        if result is not None:
            return result

    # 4. Greedy search: first '{' to last '}'
    match_obj = re.search(r"\{.*\}", text, re.DOTALL)
    if match_obj:
        result = _try_parse_json(match_obj.group())
        if result is not None:
            return result

    # 5. Repair truncated JSON (LLM output cut off mid-stream)
    array_start = text.find("[")
    if array_start >= 0:
        result = _try_repair_truncated_json(text[array_start:])
        if result is not None:
            return result

    return None


# ── Test-point parsing ──────────────────────────────────────────────


def parse_test_points(text: str) -> list[dict]:
    """Parse AI output into test-point dicts.

    Returns a list of dicts with keys:
    ``group_name``, ``title``, ``description``, ``priority``, ``estimated_cases``
    """
    json_data = _extract_json(text)
    if isinstance(json_data, list):
        points: list[dict] = []
        for item in json_data:
            point = {
                "group_name": item.get("group_name")
                or item.get("group")
                or item.get("分组")
                or "未分组",
                "title": item.get("title") or item.get("标题") or "",
                "description": item.get("description") or item.get("描述") or "",
                "priority": item.get("priority") or item.get("优先级") or "P1",
                "estimated_cases": int(
                    item.get("estimated_cases") or item.get("预计用例数") or 3
                ),
            }
            if point["title"]:
                points.append(point)
        if points:
            return points

    return _parse_test_points_from_markdown(text)


def _parse_test_points_from_markdown(text: str) -> list[dict]:
    """Fallback: extract test points from markdown-formatted text."""
    points: list[dict] = []
    current_group = "未分组"

    for line in text.split("\n"):
        line = line.strip()

        # Group headers: ## or ### (optionally numbered)
        if line.startswith("##"):
            group_match = re.match(r"#{2,4}\s*(?:\d+[.)]\s*)?(.+)", line)
            if group_match:
                current_group = group_match.group(1).strip()
            continue

        # List items: - / * / 1.
        item_match = re.match(
            r"(?:[-*]\s+|\d+[.)]\s+)(?:\*\*)?(.+?)(?:\*\*)?(?:\s*[：:]\s*(.+))?$",
            line,
        )
        if not item_match:
            continue

        title = item_match.group(1).strip()
        description = (item_match.group(2) or "").strip()

        priority = "P1"
        priority_match = re.search(r"[（(](P[0-2])[）)]", line)
        if priority_match:
            priority = priority_match.group(1)

        cases_match = re.search(r"(?:预计|估计)\s*(\d+)\s*(?:条|个|用例)", line)
        estimated = int(cases_match.group(1)) if cases_match else 3

        if title and len(title) > 2:
            points.append(
                {
                    "group_name": current_group,
                    "title": title,
                    "description": description,
                    "priority": priority,
                    "estimated_cases": estimated,
                }
            )

    return points


# ── Test-case parsing ───────────────────────────────────────────────

_CASE_TYPE_MAP: dict[str, str] = {
    "正常": "functional",
    "功能": "functional",
    "正常用例": "functional",
    "功能用例": "functional",
    "normal": "functional",
    "异常": "exception",
    "异常用例": "exception",
    "错误": "exception",
    "边界": "boundary",
    "边界用例": "boundary",
    "边界值": "boundary",
    "性能": "performance",
    "性能用例": "performance",
    "安全": "security",
    "安全用例": "security",
    "兼容性": "compatibility",
    "兼容性用例": "compatibility",
    "并发": "performance",
    "concurrent": "performance",
    "权限": "security",
    "permission": "security",
}


def parse_test_cases(text: str) -> list[dict]:
    """Parse AI output into test-case dicts.

    Returns a list of dicts with keys:
    ``title``, ``priority``, ``case_type``, ``precondition``, ``steps``

    Each step dict contains: ``step_num``, ``action``, ``expected_result``
    """
    json_data = _extract_json(text)
    if isinstance(json_data, list):
        cases: list[dict] = []
        for item in json_data:
            case = _build_case_from_json(item)
            if _is_valid_test_case(case):
                cases.append(case)
        if cases:
            return cases
    elif isinstance(json_data, dict):
        cases = _parse_test_cases_from_object(json_data)
        if cases:
            return cases

    return _parse_test_cases_from_markdown(text)


def _parse_test_cases_from_object(payload: dict) -> list[dict]:
    """Support single-case objects and keyed case maps."""
    if any(key in payload for key in ("title", "标题", "用例标题", "steps", "步骤")):
        case = _build_case_from_json(payload)
        return [case] if _is_valid_test_case(case) else []

    cases: list[dict] = []
    for item in payload.values():
        if not isinstance(item, dict):
            continue
        case = _build_case_from_json(item)
        if _is_valid_test_case(case):
            cases.append(case)
    return cases


def _build_case_from_json(item: dict) -> dict:
    """Normalise a single JSON test-case object."""
    case_type = (
        item.get("case_type") or item.get("type") or item.get("类型") or "normal"
    )
    case_type = _CASE_TYPE_MAP.get(case_type, case_type)

    case: dict = {
        "title": item.get("title") or item.get("标题") or item.get("用例标题") or "",
        "priority": item.get("priority") or item.get("优先级") or "P1",
        "case_type": case_type,
        "precondition": item.get("precondition") or item.get("前置条件") or "",
        "test_point_title": item.get("test_point_title") or item.get("测试点标题") or "",
        "steps": [],
    }

    raw_steps = item.get("steps") or item.get("步骤") or []
    if isinstance(raw_steps, list):
        for i, step in enumerate(raw_steps):
            case["steps"].append(_normalise_step(step, i))

    return case


def _normalise_step(step: dict | str, index: int) -> dict:
    """Convert a raw step value into a normalised step dict."""
    if isinstance(step, dict):
        raw_step_num = step.get("step_num") or step.get("序号")
        raw_step_text = step.get("step")
        step_num = raw_step_num if isinstance(raw_step_num, int) else index + 1
        action = step.get("action") or step.get("操作") or step.get("步骤") or ""
        if not action and isinstance(raw_step_text, str):
            action = raw_step_text
        return {
            "step_num": step_num,
            "action": action,
            "expected_result": step.get("expected_result")
            or step.get("预期结果")
            or step.get("expected")
            or step.get("expect")
            or "",
        }
    return {
        "step_num": index + 1,
        "action": str(step),
        "expected_result": "",
    }


def _contains_fuzzy_text(value: str) -> bool:
    return any(keyword in value for keyword in _FUZZY_KEYWORDS)


def _has_multiple_negative_conditions(case: dict) -> bool:
    if case.get("case_type") != "exception":
        return False

    title = str(case.get("title", ""))
    if "或" in title:
        return True

    for step in case.get("steps", []):
        action = str(step.get("action", ""))
        if "或" in action:
            return True

    return False


def _is_valid_test_case(case: dict) -> bool:
    title = str(case.get("title", "")).strip()
    if not title or len(title) < 4:
        return False

    # Auto-repair priority: accept p0/p1/p2 and normalise
    priority = str(case.get("priority", "P1")).strip().upper()
    if priority not in _VALID_PRIORITIES:
        # Try to extract P-level from string like "高/P0"
        p_match = re.search(r"(P[0-2])", priority)
        if p_match:
            case["priority"] = p_match.group(1)
        else:
            return False

    # Auto-repair case_type through map
    case_type = str(case.get("case_type", "normal")).strip()
    if case_type not in _VALID_CASE_TYPES:
        mapped = _CASE_TYPE_MAP.get(case_type)
        if mapped:
            case["case_type"] = mapped
        else:
            return False

    precondition = str(case.get("precondition", "")).strip()
    if precondition and _contains_fuzzy_text(precondition):
        logger.warning("Filtered case '%s': fuzzy precondition", title[:30])
        return False

    steps = case.get("steps", [])
    if not isinstance(steps, list) or len(steps) < 1:
        return False

    for step in steps:
        action = str(step.get("action", "")).strip()
        expected_result = str(step.get("expected_result", "")).strip()
        if not action or not expected_result:
            return False
        if _contains_fuzzy_text(action) or _contains_fuzzy_text(expected_result):
            logger.warning("Filtered case '%s': fuzzy step text", title[:30])
            return False

    return not _has_multiple_negative_conditions(case)


# ── Markdown fallback for test cases ────────────────────────────────


def _parse_test_cases_from_markdown(text: str) -> list[dict]:
    """Fallback: extract test cases from markdown-formatted text."""
    cases: list[dict] = []
    current_case: dict | None = None
    step_num = 0
    in_steps = False

    for line in text.split("\n"):
        line = line.strip()

        # Case title (### 用例 1：xxx)
        title_match = re.match(r"#{2,4}\s*(?:用例\s*\d*[：:\s]*)?(.+)", line)
        if title_match and ("用例" in line or "TC" in line.upper()):
            if current_case and current_case["title"]:
                cases.append(current_case)
            current_case = {
                "title": title_match.group(1).strip(),
                "priority": "P1",
                "case_type": "normal",
                "precondition": "",
                "steps": [],
            }
            step_num = 0
            in_steps = False
            continue

        if not current_case:
            continue

        # Priority
        if "优先级" in line:
            pm = re.search(r"(P[0-2])", line)
            if pm:
                current_case["priority"] = pm.group(1)

        # Precondition
        if "前置条件" in line:
            pre = line.split("：", 1)[-1] if "：" in line else line.split(":", 1)[-1]
            current_case["precondition"] = pre.strip()

        # Steps section header
        if "步骤" in line or "操作" in line:
            in_steps = True
            continue

        # Individual steps
        if in_steps:
            step_match = re.match(r"(?:\d+[.)]\s*|[-*]\s+)(.+)", line)
            if step_match:
                step_num += 1
                step_text = step_match.group(1)
                parts = re.split(r"[→=>]\s*(?:预期|期望|验证)", step_text)
                action = parts[0].strip()
                expected = parts[1].strip() if len(parts) > 1 else ""
                current_case["steps"].append(
                    {
                        "step_num": step_num,
                        "action": action,
                        "expected_result": expected,
                    }
                )

    if current_case and current_case["title"]:
        cases.append(current_case)

    return cases
