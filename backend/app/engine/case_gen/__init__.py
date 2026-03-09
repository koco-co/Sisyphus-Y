"""用例生成引擎 — 3 种生成模式。

- doc_driven: 文档驱动，直接从需求文档生成用例
- chat_driven: 对话引导，通过多轮对话明确测试范围
- template_driven: 模板填充，基于已有模板批量生成
"""

from app.engine.case_gen.chat_driven import (
    chat_driven_generate,
    chat_driven_stream,
)
from app.engine.case_gen.doc_driven import (
    doc_driven_generate,
    doc_driven_stream,
)
from app.engine.case_gen.template_driven import (
    template_driven_generate,
    template_driven_generate_batch,
)

__all__ = [
    "chat_driven_generate",
    "chat_driven_stream",
    "doc_driven_generate",
    "doc_driven_stream",
    "template_driven_generate",
    "template_driven_generate_batch",
]
