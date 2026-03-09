"""深度追问链 — 苏格拉底式追问，深入挖掘需求盲区。

追问策略：
  1. 从扫描发现的风险点中选择最高优先级的问题
  2. 逐层追问：表面描述 → 实现细节 → 边界条件 → 异常处理
  3. 最多追问 3 轮，之后给出总结
"""

import logging

from app.ai.llm_client import invoke_llm
from app.ai.prompts import assemble_prompt

logger = logging.getLogger(__name__)

MAX_FOLLOWUP_ROUNDS = 3

QUESTION_GENERATION_TASK = """基于以下扫描发现的风险点，生成一个针对性的追问问题。

## 风险摘要
{risk_summary}

## 历史对话
{history_summary}

## 规则
- 只生成 1 个问题
- 问题必须具体、可回答
- 追问方向：从表面描述 → 实现细节 → 边界条件 → 异常处理
- 如果已经追问了 {round_num} 轮，且信息足够，以"**📋 追问总结**"开头给出确认清单

直接输出问题内容，不需要其他格式。"""


async def generate_followup_question(
    risk_summary: str,
    history: list[dict],
    round_num: int = 1,
) -> str:
    """基于风险摘要和对话历史生成下一个追问问题。

    Args:
        risk_summary: 扫描阶段发现的风险点摘要
        history: 历史对话记录 [{"role": "...", "content": "..."}]
        round_num: 当前追问轮次

    Returns:
        str: 追问问题或追问总结
    """
    history_text = ""
    if history:
        history_text = "\n".join(f"[{m['role']}]: {m['content'][:200]}" for m in history[-6:])

    task = QUESTION_GENERATION_TASK.format(
        risk_summary=risk_summary,
        history_summary=history_text or "（无历史对话）",
        round_num=round_num,
    )

    system = assemble_prompt("diagnosis_followup", task)
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": f"请基于以上风险分析生成追问（第 {round_num} 轮）"},
    ]

    result = await invoke_llm(messages)

    logger.info("深度追问第 %d 轮问题已生成", round_num)
    return result.content


def should_continue_questioning(round_num: int, last_response: str) -> bool:
    """判断是否应继续追问。

    终止条件：
      - 已达最大追问轮次
      - AI 已给出追问总结（包含"📋 追问总结"标记）
    """
    if round_num >= MAX_FOLLOWUP_ROUNDS:
        return False
    return "📋 追问总结" not in last_response


def build_risk_summary(risks: list[dict]) -> str:
    """将风险项列表转换为文本摘要，用于追问 Prompt。"""
    if not risks:
        return "暂未发现明确风险点"

    lines: list[str] = []
    for r in risks:
        level = r.get("risk_level") or r.get("level", "medium")
        title = r.get("title", "未知")
        desc = r.get("description", "")
        lines.append(f"- [{level.upper()}] {title}: {desc[:100]}")

    return "\n".join(lines)
