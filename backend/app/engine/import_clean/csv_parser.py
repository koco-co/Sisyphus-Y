"""CSV 用例导入解析器。"""

from __future__ import annotations

import csv
import io
import logging

logger = logging.getLogger(__name__)


def parse_csv(content: str, *, encoding: str = "utf-8") -> list[dict]:
    """解析 CSV 内容，返回统一 list[dict] 格式。

    每行转为 dict，key 为列名（strip 后），value 为字符串值。
    """
    reader = csv.DictReader(io.StringIO(content))
    rows: list[dict] = []
    for i, row in enumerate(reader, 1):
        cleaned = {k.strip(): (v.strip() if v else "") for k, v in row.items() if k}
        cleaned["_row_number"] = i
        rows.append(cleaned)

    logger.info("CSV 解析完成，共 %d 行", len(rows))
    return rows


def parse_csv_bytes(data: bytes, *, encoding: str = "utf-8") -> list[dict]:
    """从字节流解析 CSV。自动检测 BOM。"""
    if data[:3] == b"\xef\xbb\xbf":
        encoding = "utf-8-sig"
    content = data.decode(encoding)
    return parse_csv(content, encoding=encoding)
