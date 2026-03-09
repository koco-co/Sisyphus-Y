"""Markdown 历史文档用例导入解析器。

支持两种格式：
1. 表格格式 — `| 标题 | 步骤 | 预期 |` 形式的 Markdown 表格
2. 标题+列表格式 — `## 用例标题` 后跟 `- 步骤描述` 的层级结构
"""

from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)


def parse_markdown(content: str) -> list[dict]:
    """解析 Markdown 内容，自动识别表格或标题列表格式。"""
    rows = _try_parse_table(content)
    if rows:
        logger.info("Markdown 表格解析完成，共 %d 行", len(rows))
        return rows

    rows = _try_parse_heading_list(content)
    logger.info("Markdown 标题列表解析完成，共 %d 行", len(rows))
    return rows


def parse_markdown_bytes(data: bytes, *, encoding: str = "utf-8") -> list[dict]:
    """从字节流解析 Markdown。"""
    if data[:3] == b"\xef\xbb\xbf":
        encoding = "utf-8-sig"
    return parse_markdown(data.decode(encoding))


def _try_parse_table(content: str) -> list[dict]:
    """尝试解析 Markdown 表格。"""
    lines = [ln.strip() for ln in content.splitlines() if ln.strip()]

    table_start = None
    for i, line in enumerate(lines):
        if "|" in line and not line.startswith("#"):
            table_start = i
            break

    if table_start is None:
        return []

    header_line = lines[table_start]
    headers = [h.strip() for h in header_line.strip("|").split("|")]
    headers = [h for h in headers if h]

    if not headers:
        return []

    rows: list[dict] = []
    row_num = 0
    for line in lines[table_start + 1 :]:
        if re.match(r"^[\s|:-]+$", line):
            continue
        if "|" not in line:
            break

        cells = [c.strip() for c in line.strip("|").split("|")]
        record: dict = {"_row_number": row_num + 1}
        for col, val in zip(headers, cells, strict=False):
            record[col] = val
        rows.append(record)
        row_num += 1

    return rows


def _try_parse_heading_list(content: str) -> list[dict]:
    """解析 ## 标题 + 列表项格式。"""
    cases: list[dict] = []
    current_title = ""
    current_steps: list[str] = []
    row_num = 0

    for line in content.splitlines():
        stripped = line.strip()
        heading_match = re.match(r"^#{1,4}\s+(.+)$", stripped)

        if heading_match:
            if current_title:
                row_num += 1
                cases.append(
                    {
                        "_row_number": row_num,
                        "title": current_title,
                        "steps": "\n".join(current_steps),
                    }
                )
            current_title = heading_match.group(1).strip()
            current_steps = []
        elif stripped.startswith(("- ", "* ", "1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9.")):
            step_text = re.sub(r"^[-*\d.]+\s*", "", stripped)
            current_steps.append(step_text)

    if current_title:
        row_num += 1
        cases.append(
            {
                "_row_number": row_num,
                "title": current_title,
                "steps": "\n".join(current_steps),
            }
        )

    return cases
