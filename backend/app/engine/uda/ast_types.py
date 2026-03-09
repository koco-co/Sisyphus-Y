"""DocumentAST 统一数据结构 — 文档解析的中间表示层"""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel


class NodeType(StrEnum):
    HEADING = "heading"
    PARAGRAPH = "paragraph"
    LIST = "list"
    LIST_ITEM = "list_item"
    TABLE = "table"
    TABLE_ROW = "table_row"
    TABLE_CELL = "table_cell"
    CODE_BLOCK = "code_block"
    IMAGE = "image"
    BLOCKQUOTE = "blockquote"
    HORIZONTAL_RULE = "hr"


class ASTNode(BaseModel):
    type: NodeType
    content: str = ""
    level: int | None = None  # for headings
    language: str | None = None  # for code blocks
    url: str | None = None  # for images
    alt: str | None = None  # for images
    children: list[ASTNode] = []


class DocumentAST(BaseModel):
    title: str = ""
    source_type: str = ""  # md/docx/pdf/txt
    nodes: list[ASTNode] = []
    metadata: dict = {}

    def to_markdown(self) -> str:
        """将 AST 转换回 Markdown"""
        lines = []
        for node in self.nodes:
            lines.append(_node_to_md(node))
        return "\n\n".join(lines)


def _node_to_md(node: ASTNode) -> str:
    """将单个 ASTNode 递归转换为 Markdown 文本"""
    if node.type == NodeType.HEADING:
        return f"{'#' * (node.level or 1)} {node.content}"
    elif node.type == NodeType.PARAGRAPH:
        return node.content
    elif node.type == NodeType.LIST:
        return "\n".join(_node_to_md(c) for c in node.children)
    elif node.type == NodeType.LIST_ITEM:
        return f"- {node.content}"
    elif node.type == NodeType.CODE_BLOCK:
        lang = node.language or ""
        return f"```{lang}\n{node.content}\n```"
    elif node.type == NodeType.IMAGE:
        return f"![{node.alt or ''}]({node.url or ''})"
    elif node.type == NodeType.BLOCKQUOTE:
        return "> " + node.content
    elif node.type == NodeType.TABLE:
        rows = [_node_to_md(c) for c in node.children]
        if rows:
            header = rows[0]
            separator = "| " + " | ".join(["---"] * header.count("|")) + " |"
            return "\n".join([header, separator, *rows[1:]])
        return ""
    elif node.type == NodeType.TABLE_ROW:
        cells = " | ".join(c.content for c in node.children)
        return f"| {cells} |"
    elif node.type == NodeType.HORIZONTAL_RULE:
        return "---"
    return node.content
