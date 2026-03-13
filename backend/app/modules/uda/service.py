from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.uda.models import ParsedDocument
from app.modules.uda.parsers import parse_document
from app.modules.uda.schemas import ParseStructureResponse, RequirementItem

logger = logging.getLogger(__name__)


class UdaService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def parse_upload(
        self,
        file: UploadFile,
        requirement_id: UUID | None = None,
    ) -> ParsedDocument:
        raw_bytes = await file.read()
        filename = file.filename or "unknown"
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

        doc = ParsedDocument(
            requirement_id=requirement_id,
            original_filename=filename,
            file_type=ext,
            file_size=len(raw_bytes),
            parse_status="parsing",
        )
        self.session.add(doc)
        await self.session.flush()

        try:
            full_text, content_ast = parse_document(filename, raw_bytes)
            doc.content_text = full_text
            doc.content_ast = content_ast
            doc.parse_status = "completed"
        except Exception as e:
            logger.exception("Failed to parse document: %s", filename)
            doc.parse_status = "failed"
            doc.error_message = str(e)

        await self.session.commit()
        await self.session.refresh(doc)
        return doc

    async def get_document(self, doc_id: UUID) -> ParsedDocument:
        doc = await self.session.get(ParsedDocument, doc_id)
        if not doc or doc.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        return doc

    async def list_by_requirement(self, requirement_id: UUID) -> list[ParsedDocument]:
        result = await self.session.execute(
            select(ParsedDocument).where(
                ParsedDocument.requirement_id == requirement_id,
                ParsedDocument.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def parse_structure(self, file: UploadFile) -> ParseStructureResponse:
        """解析文档并返回结构化需求条目列表（不入库）。"""
        raw_bytes = await file.read()
        filename = file.filename or "unknown"
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

        try:
            full_text, content_ast = parse_document(filename, raw_bytes)
        except Exception as exc:
            logger.exception("parse_structure: failed to parse document '%s'", filename)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"无法解析文件 '{filename}'，请确认文件格式正确。",
            ) from exc

        # Plain-text files or parse failures get lowest confidence
        if ext in ("txt", "text") or content_ast is None:
            sections: list[dict] = []
            confidence = 0.2
            confidence_reason = "纯文本文件缺少结构信息，自动拆分效果有限"
        else:
            sections = content_ast.get("sections") or []

        # Build items, skipping fully empty sections
        items: list[RequirementItem] = []
        for idx, section in enumerate(sections, start=1):
            heading: str = (section.get("heading") or "").strip()
            body: str = (section.get("body") or "").strip()
            if not heading and not body:
                continue
            items.append(
                RequirementItem(
                    temp_id=f"item-{idx}",
                    title=heading or "未命名章节",
                    content=body,
                    level=1,
                )
            )

        # Fallback: no sections → single item from raw_text
        if not items:
            items = [
                RequirementItem(
                    temp_id="item-1",
                    title="完整需求文档",
                    content=(full_text or "")[:5000],
                    level=1,
                )
            ]

        # Confidence scoring (only when not already set above)
        if ext not in ("txt", "text") and content_ast is not None:
            section_count = len(items)
            if section_count <= 1:
                confidence = 0.3
                confidence_reason = "文档缺少明确的章节结构，建议对照模板调整后重新上传"
            elif section_count <= 3:
                confidence = 0.65
                confidence_reason = "文档有基本章节结构，部分内容可能需要手动调整"
            else:
                confidence = 0.9
                confidence_reason = "文档结构清晰，自动拆分效果良好"

        return ParseStructureResponse(
            items=items,
            confidence=confidence,
            confidence_reason=confidence_reason,
            raw_text=full_text or "",
            file_type=ext,
            total_sections=len(items),
        )
