"""文档智能分块器。

支持按 Markdown 标题层级分块，保留章节路径元数据，
超长段落按段落边界二次切分并支持重叠窗口。
"""

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class Chunk:
    """一个文档分块，携带内容和来源元数据。"""

    content: str
    metadata: dict = field(default_factory=dict)
    index: int = 0

    @property
    def token_estimate(self) -> int:
        """粗估 token 数（中文约 1 字 ≈ 2 token）。"""
        return len(self.content) // 2


# ═══════════════════════════════════════════════════════════════════
# 按标题分块
# ═══════════════════════════════════════════════════════════════════


def chunk_by_headers(
    text: str,
    max_chunk_size: int = 500,
    overlap: int = 50,
    source_id: str = "",
) -> list[Chunk]:
    """按 Markdown 标题层级分块，保留章节路径上下文。

    Args:
        text: 原始文本（Markdown 格式最佳）。
        max_chunk_size: 单个 chunk 的最大字符数。
        overlap: 相邻 chunk 之间的重叠字符数。
        source_id: 来源文档 ID（写入元数据）。

    Returns:
        分块列表，每个 Chunk 包含 content + metadata。
    """
    if not text or not text.strip():
        return []

    sections = re.split(r"\n(?=#{1,4}\s)", text)
    chunks: list[Chunk] = []
    current_headers: list[str] = []

    for section in sections:
        lines = section.strip().split("\n")
        if not lines or not section.strip():
            continue

        header_match = re.match(r"^(#{1,4})\s+(.+)", lines[0])
        if header_match:
            level = len(header_match.group(1))
            title = header_match.group(2).strip()
            current_headers = current_headers[: level - 1] + [title]

        content = section.strip()

        if len(content) > max_chunk_size:
            _split_long_section(
                content,
                max_chunk_size,
                overlap,
                source_id,
                current_headers,
                chunks,
            )
        else:
            chunks.append(
                Chunk(
                    content=content,
                    metadata=_make_metadata(source_id, current_headers),
                    index=len(chunks),
                )
            )

    logger.info("分块完成: %d chunks from source=%s", len(chunks), source_id)
    return chunks


# ═══════════════════════════════════════════════════════════════════
# 按段落分块（纯文本 fallback）
# ═══════════════════════════════════════════════════════════════════


def chunk_by_paragraphs(
    text: str,
    max_chunk_size: int = 500,
    overlap: int = 50,
    source_id: str = "",
) -> list[Chunk]:
    """按空行分段后合并到 max_chunk_size 以内，段间重叠。

    适用于没有 Markdown 标题的纯文本。
    """
    if not text or not text.strip():
        return []

    paragraphs = re.split(r"\n{2,}", text.strip())
    chunks: list[Chunk] = []
    buffer = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if buffer and len(buffer) + len(para) + 2 > max_chunk_size:
            chunks.append(
                Chunk(
                    content=buffer,
                    metadata={"source_id": source_id},
                    index=len(chunks),
                )
            )
            buffer = buffer[-overlap:] + "\n\n" + para if overlap else para
        else:
            buffer = f"{buffer}\n\n{para}" if buffer else para

    if buffer.strip():
        chunks.append(
            Chunk(
                content=buffer.strip(),
                metadata={"source_id": source_id},
                index=len(chunks),
            )
        )

    logger.info("段落分块完成: %d chunks from source=%s", len(chunks), source_id)
    return chunks


# ═══════════════════════════════════════════════════════════════════
# 内部工具
# ═══════════════════════════════════════════════════════════════════


def _make_metadata(source_id: str, headers: list[str]) -> dict:
    return {
        "source_id": source_id,
        "headers": list(headers),
        "section_path": " > ".join(headers),
    }


def _split_long_section(
    content: str,
    max_chunk_size: int,
    overlap: int,
    source_id: str,
    headers: list[str],
    chunks: list[Chunk],
) -> None:
    """将超长段落按 ``\\n\\n`` 边界二次拆分。"""
    paragraphs = content.split("\n\n")
    buffer = ""

    for para in paragraphs:
        if buffer and len(buffer) + len(para) + 2 > max_chunk_size:
            chunks.append(
                Chunk(
                    content=buffer.strip(),
                    metadata=_make_metadata(source_id, headers),
                    index=len(chunks),
                )
            )
            buffer = buffer[-overlap:] + "\n\n" + para if overlap else para
        else:
            buffer = f"{buffer}\n\n{para}" if buffer else para

    if buffer.strip():
        chunks.append(
            Chunk(
                content=buffer.strip(),
                metadata=_make_metadata(source_id, headers),
                index=len(chunks),
            )
        )
