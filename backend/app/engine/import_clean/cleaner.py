"""LLM-powered test case cleaning engine.

Provides utilities for:
- HTML tag stripping
- Empty value normalization
- Quality scoring (0-5 scale) with routing logic
- LLM-based test case improvement with domain-specific rules
"""

from __future__ import annotations

import json
import logging
import re

from app.ai.llm_client import LLMResult, invoke_llm
from app.engine.import_clean.prompt_rules import (
    DEPENDENCY_PHRASES as _DEPENDENCY_PHRASE_LIST,
)
from app.engine.import_clean.prompt_rules import (
    SCORE_THRESHOLDS,
    SYSTEM_PROMPT_V2,
)
from app.engine.import_clean.prompt_rules import (
    VAGUE_ADJECTIVES as _VAGUE_ADJECTIVE_LIST,
)

logger = logging.getLogger(__name__)

# Quality score routing thresholds（从 prompt_rules 同步）
SCORE_HIGH = SCORE_THRESHOLDS["high"]      # ≥ 4.5: 直接入库
SCORE_REVIEW = SCORE_THRESHOLDS["review"]  # 3.5–4.49: 入库，标记 needs_review
SCORE_POLISH = SCORE_THRESHOLDS["polish"]  # 2.0–3.49: LLM 润色后再评分
# < 2.0: 丢弃

# Keywords that hint the precondition involves a database
_DB_KEYWORDS = re.compile(
    r"(数据库|表|sql|mysql|postgresql|oracle|hive|数据源|入库|建表|字段|schema)",
    re.IGNORECASE,
)

# Vague adjectives to detect in steps（从 prompt_rules 同步）
_VAGUE_ADJECTIVES = re.compile("|".join(re.escape(w) for w in _VAGUE_ADJECTIVE_LIST))

# Step dependency phrases（从 prompt_rules 同步）
_DEPENDENCY_PHRASES = re.compile("|".join(re.escape(w) for w in _DEPENDENCY_PHRASE_LIST))


def strip_html_tags(text: str) -> str:
    """Remove HTML tags while preserving text content and meaningful whitespace."""
    if not text:
        return ""
    cleaned = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    cleaned = re.sub(r"<p[^>]*>", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"</p>", "\n", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"<[^>]+>", "", cleaned)
    cleaned = re.sub(r"&nbsp;", " ", cleaned)
    cleaned = re.sub(r"&lt;", "<", cleaned)
    cleaned = re.sub(r"&gt;", ">", cleaned)
    cleaned = re.sub(r"&amp;", "&", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def normalize_empty_values(value: str) -> str:
    """Normalize empty/placeholder values to empty string."""
    if not value:
        return ""
    stripped = value.strip()
    empty_markers = {
        "无", "无。", "N/A", "n/a", "NA", "na", "-", "--", "——",
        "/", "null", "NULL", "None", "none", "空",
    }
    if stripped in empty_markers:
        return ""
    return stripped


def score_test_case(case: dict) -> float:
    """Score a cleaned test case on quality (0–5 scale).

    Scoring criteria:
    - Title descriptive and specific       (0–1.0)
    - Steps: all have action + expected    (0–1.5)
    - Steps: first step is entry action    (0–0.5)
    - Steps: no dependency phrases         (0–0.5)
    - Steps: no vague adjectives           (0–0.3)
    - Precondition present and specific    (0–0.5)
    - No HTML remnants                     (0–0.3)
    - Expected result coverage             (0–0.4)
    """
    score = 0.0

    title = case.get("title", "")
    steps: list[dict] = case.get("steps", [])
    precondition = case.get("precondition", "")

    # Title (0–1.0)
    if title:
        score += 0.4
        if len(title) >= 10:
            score += 0.3
        if len(title) >= 20:
            score += 0.3

    # Steps completeness (0–1.5)
    if steps:
        steps_with_action = sum(1 for s in steps if s.get("action"))
        steps_with_expected = sum(1 for s in steps if s.get("expected_result"))
        n = len(steps)
        score += 0.75 * (steps_with_action / n)
        score += 0.75 * (steps_with_expected / n)

    # First step is an entry action (0–0.5)
    if steps and steps[0].get("action", "").startswith("进入"):
        score += 0.5

    # No cross-case dependencies (0–0.5)
    all_actions = " ".join(s.get("action", "") for s in steps)
    if not _DEPENDENCY_PHRASES.search(all_actions):
        score += 0.5

    # No vague adjectives (0–0.3)
    all_text = f"{title} {precondition} {all_actions}"
    if not _VAGUE_ADJECTIVES.search(all_text):
        score += 0.3

    # Precondition present (0–0.5)
    if precondition and len(precondition) >= 5:
        score += 0.3
        # Bonus: contains SQL for DB-related cases
        if _DB_KEYWORDS.search(f"{title} {precondition}") and (
            "CREATE" in precondition.upper() or "INSERT" in precondition.upper()
        ):
            score += 0.2

    # No HTML remnants (0–0.3)
    if not re.search(r"<[^>]+>", all_text):
        score += 0.3

    # Expected result per-step coverage (0–0.4)
    if steps:
        covered = sum(1 for s in steps if s.get("expected_result"))
        score += 0.4 * (covered / len(steps))

    return round(min(score, 5.0), 2)


def route_by_score(score: float) -> str:
    """Map quality score to clean_status label.

    Returns:
        'high'      — score >= 4.5, direct import
        'review'    — score >= 3.5, import with needs_review flag
        'polish'    — score >= 2.0, send to LLM polish then re-score
        'discard'   — score <  2.0, drop and record reason
    """
    if score >= SCORE_HIGH:
        return "high"
    if score >= SCORE_REVIEW:
        return "review"
    if score >= SCORE_POLISH:
        return "polish"
    return "discard"


# ---------------------------------------------------------------------------
# LLM cleaning prompt
# ---------------------------------------------------------------------------
# SYSTEM_PROMPT_V2 已在 prompt_rules.py 中定义并通过导入引入


def _build_clean_prompt(case: dict) -> str:
    title = strip_html_tags(case.get("title", ""))
    precondition = strip_html_tags(case.get("precondition", "") or "无")
    steps: list[dict] = case.get("steps", [])
    module_path = case.get("module_path", "")

    steps_text = "\n".join(
        f"{s.get('no', i + 1)}. 操作：{strip_html_tags(s.get('action', ''))} "
        f"| 预期：{strip_html_tags(s.get('expected_result', ''))}"
        for i, s in enumerate(steps)
    ) or "（无步骤）"

    return (
        f"## 待清洗用例\n"
        f"所属模块：{module_path}\n"
        f"标题：{title}\n"
        f"前置条件：{precondition}\n"
        f"步骤：\n{steps_text}"
    )


def _safe_json_extract(content: str, fallback: dict) -> dict:
    """Safely extract the first JSON object from LLM response."""
    match = re.search(r"\{.*\}", content, re.DOTALL)
    if not match:
        logger.warning("LLM 返回格式异常，无法提取 JSON: %s", content[:200])
        return fallback
    try:
        return json.loads(match.group())
    except json.JSONDecodeError as exc:
        logger.warning("LLM JSON 解析失败 (%s): %s", exc, content[:200])
        return fallback


def _normalize_cleaned(cleaned: dict, original: dict) -> dict:
    """Ensure cleaned dict has all required fields and step structure."""
    steps = cleaned.get("steps", [])
    if not isinstance(steps, list):
        steps = []
    normalized_steps = []
    for i, step in enumerate(steps):
        if not isinstance(step, dict):
            continue
        normalized_steps.append(
            {
                "no": step.get("no", i + 1),
                "action": str(step.get("action", "")).strip(),
                "expected_result": str(step.get("expected_result", "")).strip(),
            }
        )

    return {
        "title": cleaned.get("title", original.get("title", "")),
        "precondition": cleaned.get("precondition", original.get("precondition", "")),
        "steps": normalized_steps,
    }


async def llm_clean_case(case: dict) -> dict:
    """Use LLM to clean and improve a single test case with domain-specific rules.

    Args:
        case: Normalized case dict with title, precondition, steps, module_path.

    Returns:
        Cleaned case dict with title, precondition, steps.
    """
    user_prompt = _build_clean_prompt(case)
    fallback = {
        "title": strip_html_tags(case.get("title", "")),
        "precondition": strip_html_tags(case.get("precondition", "")),
        "steps": [
            {
                "no": s.get("no", i + 1),
                "action": strip_html_tags(s.get("action", "")),
                "expected_result": strip_html_tags(s.get("expected_result", "")),
            }
            for i, s in enumerate(case.get("steps", []))
        ],
    }

    result: LLMResult = await invoke_llm(
        [
            {"role": "system", "content": SYSTEM_PROMPT_V2},
            {"role": "user", "content": user_prompt},
        ]
    )

    raw = _safe_json_extract(result.content, fallback)
    return _normalize_cleaned(raw, case)
