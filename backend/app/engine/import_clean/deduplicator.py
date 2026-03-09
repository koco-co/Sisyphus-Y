"""重复检测器 — 基于 difflib.SequenceMatcher 的标题相似度检测。"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)

DEFAULT_THRESHOLD = 0.85


@dataclass
class DuplicateMatch:
    """重复匹配结果。"""

    source_index: int
    target_index: int
    score: float
    source_title: str
    target_title: str


def detect_duplicates(
    records: list[dict],
    *,
    title_key: str = "title",
    threshold: float = DEFAULT_THRESHOLD,
) -> list[DuplicateMatch]:
    """在记录列表内部检测重复项。

    Args:
        records: 待检测的记录列表，每项需包含 title_key 字段
        title_key: 标题字段名
        threshold: 相似度阈值，默认 0.85

    Returns:
        重复匹配列表
    """
    matches: list[DuplicateMatch] = []
    titles = [(i, r.get(title_key, "")) for i, r in enumerate(records) if r.get(title_key)]

    for i in range(len(titles)):
        idx_a, title_a = titles[i]
        for j in range(i + 1, len(titles)):
            idx_b, title_b = titles[j]
            score = _similarity(title_a, title_b)
            if score >= threshold:
                matches.append(
                    DuplicateMatch(
                        source_index=idx_a,
                        target_index=idx_b,
                        score=score,
                        source_title=title_a,
                        target_title=title_b,
                    )
                )

    logger.info("重复检测完成，%d 条记录中发现 %d 对重复", len(records), len(matches))
    return matches


def detect_duplicates_against_existing(
    new_records: list[dict],
    existing_titles: list[str],
    *,
    title_key: str = "title",
    threshold: float = DEFAULT_THRESHOLD,
) -> dict[int, tuple[str, float]]:
    """与已有用例标题列表比对，检测重复。

    Args:
        new_records: 新导入的记录列表
        existing_titles: 系统中已有的用例标题列表
        title_key: 标题字段名
        threshold: 相似度阈值

    Returns:
        dict: {新记录索引: (匹配到的已有标题, 相似度分数)}
    """
    result: dict[int, tuple[str, float]] = {}

    for i, record in enumerate(new_records):
        new_title = record.get(title_key, "")
        if not new_title:
            continue

        best_score = 0.0
        best_match = ""
        for existing in existing_titles:
            score = _similarity(new_title, existing)
            if score > best_score:
                best_score = score
                best_match = existing

        if best_score >= threshold:
            result[i] = (best_match, best_score)

    logger.info("与已有用例比对完成，%d 条中发现 %d 条疑似重复", len(new_records), len(result))
    return result


def _similarity(a: str, b: str) -> float:
    """计算两个字符串的相似度（0~1）。"""
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()
