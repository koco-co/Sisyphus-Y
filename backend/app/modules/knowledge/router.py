import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.core.dependencies import AsyncSessionDep
from app.engine.rag.retriever import scroll_by_doc_id
from app.modules.knowledge.models import KnowledgeDocument
from app.modules.knowledge.schemas import (
    ChunkItem,
    ChunksResponse,
    KnowledgeDocCreate,
    KnowledgeDocumentDetailResponse,
    KnowledgeDocumentResponse,
    KnowledgeDocUpdate,
    KnowledgeListResponse,
    KnowledgeSearchRequest,
    KnowledgeSearchResultResponse,
    ManualEntryCreate,
)
from app.modules.knowledge.service import KnowledgeService

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


def _serialize_timestamp(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _serialize_document(doc: KnowledgeDocument) -> dict:
    return {
        "id": str(doc.id),
        "file_name": getattr(doc, "file_name", ""),
        "doc_type": getattr(doc, "doc_type", ""),
        "file_size": getattr(doc, "file_size", 0),
        "vector_status": getattr(doc, "vector_status", "pending"),
        "hit_count": getattr(doc, "hit_count", 0),
        "chunk_count": getattr(doc, "chunk_count", 0),
        "tags": list(getattr(doc, "tags", []) or []),
        "category": getattr(doc, "category", "business_rule"),
        "entry_type": getattr(doc, "entry_type", "file"),
        "is_active": getattr(doc, "is_active", True),
        "uploaded_at": _serialize_timestamp(getattr(doc, "created_at", None)),
        "updated_at": _serialize_timestamp(getattr(doc, "updated_at", None)),
    }


def _serialize_document_detail(doc: KnowledgeDocument) -> dict:
    payload = _serialize_document(doc)
    payload.update(
        {
            "title": getattr(doc, "title", ""),
            "content": getattr(doc, "content", None),
            "content_ast": getattr(doc, "content_ast", None),
            "source": getattr(doc, "source", None),
            "version": getattr(doc, "version", 1),
            "error_message": getattr(doc, "error_message", None),
        }
    )
    return payload


@router.get("/", response_model=KnowledgeListResponse)
async def list_documents(
    session: AsyncSessionDep,
    doc_type: str | None = None,
    vector_status: str | None = None,
    category: str | None = None,
    entry_type: str | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> KnowledgeListResponse:
    svc = KnowledgeService(session)
    docs, total = await svc.list_documents(
        doc_type,
        vector_status,
        q,
        page,
        page_size,
        category=category,
        entry_type=entry_type,
    )
    return KnowledgeListResponse(
        items=[KnowledgeDocumentResponse.model_validate(_serialize_document(doc)) for doc in docs],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/upload",
    response_model=KnowledgeDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    file: Annotated[UploadFile, File(...)],
    session: AsyncSessionDep,
) -> KnowledgeDocumentResponse:
    svc = KnowledgeService(session)
    doc = await svc.upload_document(file)
    return KnowledgeDocumentResponse.model_validate(_serialize_document(doc))


@router.post(
    "/search",
    response_model=list[KnowledgeSearchResultResponse],
)
async def search_documents(
    data: KnowledgeSearchRequest,
    session: AsyncSessionDep,
) -> list[KnowledgeSearchResultResponse]:
    svc = KnowledgeService(session)
    results = await svc.search(
        data.query,
        top_k=data.top_k,
        score_threshold=data.score_threshold,
        doc_id=data.doc_id,
    )
    return [KnowledgeSearchResultResponse.model_validate(item) for item in results]


@router.post(
    "/manual",
    response_model=KnowledgeDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_manual_entry(
    data: ManualEntryCreate,
    session: AsyncSessionDep,
) -> KnowledgeDocumentResponse:
    """创建手动知识条目，entry_type='manual'，立即向量化。"""
    svc = KnowledgeService(session)
    doc = await svc.create_manual_entry(data)
    return KnowledgeDocumentResponse.model_validate(_serialize_document(doc))


@router.post("/", response_model=KnowledgeDocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(data: KnowledgeDocCreate, session: AsyncSessionDep) -> KnowledgeDocumentResponse:
    svc = KnowledgeService(session)
    doc = await svc.create_document(
        title=data.title,
        file_name=data.file_name or data.title,
        doc_type=data.doc_type,
        file_size=data.file_size,
        content=data.content,
        content_ast=data.content_ast,
        tags=data.tags,
        source=data.source,
        vector_status=data.vector_status,
    )
    return KnowledgeDocumentResponse.model_validate(_serialize_document(doc))


@router.get("/{doc_id}/chunks", response_model=ChunksResponse)
async def get_document_chunks(
    doc_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
) -> ChunksResponse:
    """返回指定文档的分块列表（含序号、内容前500字符、token粗略估算）。

    文档不存在时返回空列表，不报 404。
    """
    chunks = await scroll_by_doc_id(str(doc_id), limit=limit, offset=offset)
    items: list[ChunkItem] = []
    for chunk in chunks:
        raw_content: str = chunk.get("content", "")
        truncated = raw_content[:500]
        token_count = len(truncated.split())
        items.append(
            ChunkItem(
                index=int(chunk.get("chunk_index", 0)),
                content=truncated,
                token_count=token_count,
            )
        )
    return ChunksResponse(items=items, total=len(items))


@router.post(
    "/{doc_id}/new-version",
    response_model=KnowledgeDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_new_version(
    doc_id: uuid.UUID,
    file: Annotated[UploadFile, File(...)],
    session: AsyncSessionDep,
) -> KnowledgeDocumentResponse:
    """上传文档新版本，触发版本限额管理（超过3版本时软删除最旧版本）。"""
    svc = KnowledgeService(session)
    doc = await svc.upload_new_version(doc_id, file)
    return KnowledgeDocumentResponse.model_validate(_serialize_document(doc))


@router.post("/{doc_id}/reindex", response_model=KnowledgeDocumentResponse)
async def reindex_document(
    doc_id: uuid.UUID,
    session: AsyncSessionDep,
) -> KnowledgeDocumentResponse:
    svc = KnowledgeService(session)
    doc = await svc.reindex_document(doc_id)
    return KnowledgeDocumentResponse.model_validate(_serialize_document(doc))


@router.get("/{doc_id}", response_model=KnowledgeDocumentDetailResponse)
async def get_document(doc_id: uuid.UUID, session: AsyncSessionDep) -> KnowledgeDocumentDetailResponse:
    svc = KnowledgeService(session)
    doc = await svc.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return KnowledgeDocumentDetailResponse.model_validate(_serialize_document_detail(doc))


@router.patch("/{doc_id}", response_model=KnowledgeDocumentDetailResponse)
async def update_document(
    doc_id: uuid.UUID,
    data: KnowledgeDocUpdate,
    session: AsyncSessionDep,
) -> KnowledgeDocumentDetailResponse:
    svc = KnowledgeService(session)
    doc = await svc.update_document(
        doc_id,
        title=data.title,
        content=data.content,
        content_ast=data.content_ast,
        tags=data.tags,
        vector_status=data.vector_status,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return KnowledgeDocumentDetailResponse.model_validate(_serialize_document_detail(doc))


@router.delete("/{doc_id}")
async def delete_document(doc_id: uuid.UUID, session: AsyncSessionDep) -> dict:
    svc = KnowledgeService(session)
    success = await svc.soft_delete(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"ok": True}


@router.post("/rebuild-vector-index")
async def rebuild_vector_index(
    payload: dict,
    session: AsyncSessionDep,
) -> dict:
    """重建 Qdrant 向量索引（向量维度变更时调用）。

    接受 {"dimensions": int, "collection": str} 参数。
    标记所有文档为 pending 重新向量化，并重建 Qdrant collection。
    """
    dimensions: int = int(payload.get("dimensions", 1024))
    collection: str = str(payload.get("collection", "knowledge_chunks"))

    svc = KnowledgeService(session)
    report = await svc.reset_all_vector_status(collection=collection, new_dimensions=dimensions)

    return {
        "ok": True,
        "collection": report["collection"],
        "dimensions": report["dimensions"],
        "docs_queued": report["docs_queued"],
        "deleted_points": report["deleted_points"],
        "collection_recreated": report["collection_recreated"],
        "message": report["summary"],
    }
