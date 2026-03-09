"""OCR-based document parser for scanned PDFs and images.

Strategy:
1. Try PaddleOCR (best for Chinese + English mixed documents).
2. Fall back to PyMuPDF text extraction (for regular PDFs).
3. Last resort: return empty text with an error note.
"""

import io
import logging

logger = logging.getLogger(__name__)


def _try_paddleocr(raw_bytes: bytes, file_ext: str) -> str | None:
    """Attempt OCR via PaddleOCR. Returns extracted text or None on failure."""
    try:
        from paddleocr import PaddleOCR  # type: ignore[import-untyped]
    except ImportError:
        logger.debug("PaddleOCR not installed, skipping OCR")
        return None

    try:
        ocr = PaddleOCR(use_angle_cls=True, lang="ch", show_log=False)

        if file_ext == "pdf":
            import tempfile

            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as tmp:
                tmp.write(raw_bytes)
                tmp.flush()
                result = ocr.ocr(tmp.name, cls=True)
        else:
            # Image file
            import tempfile

            suffix = f".{file_ext}" if file_ext else ".png"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
                tmp.write(raw_bytes)
                tmp.flush()
                result = ocr.ocr(tmp.name, cls=True)

        if not result:
            return None

        lines: list[str] = []
        for page in result:
            if page is None:
                continue
            for line_info in page:
                if line_info and len(line_info) >= 2:
                    text_info = line_info[1]
                    if isinstance(text_info, tuple) and len(text_info) >= 1:
                        lines.append(str(text_info[0]))
                    elif isinstance(text_info, str):
                        lines.append(text_info)

        text = "\n".join(lines)
        return text if text.strip() else None

    except Exception:
        logger.warning("PaddleOCR failed", exc_info=True)
        return None


def _try_pymupdf(raw_bytes: bytes) -> str | None:
    """Extract text from PDF using PyMuPDF (fitz). Returns text or None."""
    try:
        import fitz  # type: ignore[import-untyped]
    except ImportError:
        logger.debug("PyMuPDF not installed, skipping fitz extraction")
        return None

    try:
        doc = fitz.open(stream=raw_bytes, filetype="pdf")
        pages_text: list[str] = []
        for page in doc:
            text = page.get_text()
            if text and text.strip():
                pages_text.append(text.strip())
        doc.close()

        full_text = "\n\n".join(pages_text)
        return full_text if full_text.strip() else None
    except Exception:
        logger.warning("PyMuPDF extraction failed", exc_info=True)
        return None


def _try_pypdf(raw_bytes: bytes) -> str | None:
    """Extract text from PDF using pypdf. Returns text or None."""
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(raw_bytes))
        pages_text: list[str] = []
        for page in reader.pages:
            text = page.extract_text() or ""
            if text.strip():
                pages_text.append(text.strip())

        full_text = "\n\n".join(pages_text)
        return full_text if full_text.strip() else None
    except Exception:
        logger.warning("pypdf extraction failed", exc_info=True)
        return None


def ocr_parse(raw_bytes: bytes, file_ext: str = "pdf") -> tuple[str, dict]:
    """Parse a scanned PDF or image with OCR fallback chain.

    Returns:
        (full_text, content_ast) — same shape as other parsers.
    """
    text: str | None = None
    method_used = "none"

    # 1. PaddleOCR
    text = _try_paddleocr(raw_bytes, file_ext)
    if text:
        method_used = "paddleocr"

    # 2. PyMuPDF text extraction (PDF only)
    if not text and file_ext == "pdf":
        text = _try_pymupdf(raw_bytes)
        if text:
            method_used = "pymupdf"

    # 3. pypdf fallback (PDF only)
    if not text and file_ext == "pdf":
        text = _try_pypdf(raw_bytes)
        if text:
            method_used = "pypdf"

    if not text:
        text = f"[OCR extraction failed for .{file_ext} file]"
        method_used = "failed"

    # Build simple AST
    sections: list[dict[str, str]] = []
    current_heading = ""
    current_body_lines: list[str] = []

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if len(stripped) < 80 and (stripped[0].isdigit() or stripped.isupper()):
            if current_heading or current_body_lines:
                sections.append({"heading": current_heading, "body": "\n".join(current_body_lines).strip()})
            current_heading = stripped
            current_body_lines = []
        else:
            current_body_lines.append(stripped)

    if current_heading or current_body_lines:
        sections.append({"heading": current_heading, "body": "\n".join(current_body_lines).strip()})

    content_ast: dict = {
        "raw_text": text,
        "sections": sections,
        "ocr_method": method_used,
    }

    return text, content_ast
