"""敏感字段脱敏工具 — 手机号 / 邮箱 / 身份证 / 日志自动脱敏"""

from __future__ import annotations

import logging
import re
from typing import Any

# ── 脱敏函数 ──────────────────────────────────────────────────────

_PHONE_PATTERN = re.compile(r"1[3-9]\d{9}")
_EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
_ID_CARD_PATTERN = re.compile(r"\d{17}[\dXx]")


def mask_phone(phone: str) -> str:
    """手机号脱敏：138****1234"""
    if len(phone) == 11 and phone.isdigit():
        return f"{phone[:3]}****{phone[7:]}"
    return phone


def mask_email(email: str) -> str:
    """邮箱脱敏：u***r@example.com"""
    parts = email.split("@")
    if len(parts) != 2:
        return email
    local = parts[0]
    masked = local[0] + "***" if len(local) <= 2 else local[0] + "***" + local[-1]
    return f"{masked}@{parts[1]}"


def mask_id_card(id_card: str) -> str:
    """身份证脱敏：110***********1234"""
    if len(id_card) == 18:
        return f"{id_card[:3]}***********{id_card[14:]}"
    return id_card


def sanitize_text(text: str) -> str:
    """对文本中出现的手机号、邮箱、身份证进行脱敏。"""
    result = _PHONE_PATTERN.sub(lambda m: mask_phone(m.group()), text)
    result = _EMAIL_PATTERN.sub(lambda m: mask_email(m.group()), result)
    result = _ID_CARD_PATTERN.sub(lambda m: mask_id_card(m.group()), result)
    return result


def sanitize_dict(data: dict[str, Any], sensitive_keys: set[str] | None = None) -> dict[str, Any]:
    """对字典中的敏感字段值进行脱敏。

    Args:
        data: 原始字典
        sensitive_keys: 需要脱敏的字段名集合，默认常见敏感字段
    """
    if sensitive_keys is None:
        sensitive_keys = {"phone", "mobile", "email", "id_card", "identity", "password", "token", "secret"}

    sanitized = {}
    for key, value in data.items():
        if key.lower() in sensitive_keys:
            if isinstance(value, str):
                sanitized[key] = sanitize_text(value)
            else:
                sanitized[key] = "***"
        elif isinstance(value, dict):
            sanitized[key] = sanitize_dict(value, sensitive_keys)
        elif isinstance(value, str):
            sanitized[key] = sanitize_text(value)
        else:
            sanitized[key] = value
    return sanitized


# ── 日志自动脱敏过滤器 ────────────────────────────────────────────


class SanitizingFilter(logging.Filter):
    """日志过滤器：自动对日志消息中的敏感信息脱敏。

    Usage::

        import logging
        from app.core.sanitizer import SanitizingFilter

        logger = logging.getLogger("app")
        logger.addFilter(SanitizingFilter())
    """

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = sanitize_text(record.msg)
        if record.args:
            if isinstance(record.args, dict):
                record.args = {k: sanitize_text(str(v)) if isinstance(v, str) else v for k, v in record.args.items()}
            elif isinstance(record.args, tuple):
                record.args = tuple(sanitize_text(str(a)) if isinstance(a, str) else a for a in record.args)
        return True
