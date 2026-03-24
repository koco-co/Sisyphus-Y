import { useCallback, useEffect, useState } from 'react';
import { API_BASE, api } from '@/lib/api';
import {
  type KnowledgeDocument,
  type RAGSearchResult,
  useKnowledgeStore,
} from '@/stores/knowledge-store';

interface PaginatedDocs {
  items: KnowledgeDocument[];
  total: number;
}

export function useKnowledge() {
  const store = useKnowledgeStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    documents,
    total,
    typeFilter,
    statusFilter,
    searchQuery,
    isUploading,
    uploadProgress,
    ragQuery,
    ragResults,
    ragSearching,
    setDocuments,
    setUploading,
    setUploadProgress,
    removeDocument,
    updateDocumentStatus,
    setRagSearching,
    setRagResults,
    setTypeFilter,
    setStatusFilter,
    setSearchQuery,
    setRagQuery,
  } = store;

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('doc_type', typeFilter);
      if (statusFilter) params.set('vector_status', statusFilter);
      if (searchQuery) params.set('q', searchQuery);
      const data = await api.get<PaginatedDocs>(`/knowledge/?${params}`);
      setDocuments(data.items || [], data.total || 0);
    } catch (_e) {
      setError('加载文档列表失败');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, searchQuery, setDocuments]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true, 0);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          });
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed: ${xhr.status}`));
          });
          xhr.addEventListener('error', () => reject(new Error('Upload failed')));
          xhr.open('POST', `${API_BASE}/knowledge/upload`);
          xhr.send(formData);
        });

        await fetchDocuments();
        return true;
      } catch (_e) {
        setError('文件上传失败');
        return false;
      } finally {
        setUploading(false, 0);
      }
    },
    [fetchDocuments, setUploadProgress, setUploading],
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await api.delete(`/knowledge/${id}`);
        removeDocument(id);
      } catch (_e) {
        setError('删除文档失败');
      }
    },
    [removeDocument],
  );

  const rebuildIndex = useCallback(
    async (id: string) => {
      setError(null);
      try {
        updateDocumentStatus(id, 'processing');
        await api.post(`/knowledge/${id}/reindex`);
        await fetchDocuments();
      } catch (_e) {
        updateDocumentStatus(id, 'failed');
        setError('重建索引失败');
      }
    },
    [fetchDocuments, updateDocumentStatus],
  );

  const searchRAG = useCallback(
    async (query: string) => {
      if (!query.trim()) return;
      setError(null);
      setRagSearching(true);
      setRagResults([]);
      try {
        const results = await api.post<RAGSearchResult[]>('/knowledge/search', {
          query,
          top_k: 5,
        });
        setRagResults(results);
      } catch (_e) {
        setError('检索失败');
      } finally {
        setRagSearching(false);
      }
    },
    [setRagResults, setRagSearching],
  );

  return {
    documents,
    total,
    loading,
    error,
    typeFilter,
    statusFilter,
    searchQuery,
    isUploading,
    uploadProgress,
    ragQuery,
    ragResults,
    ragSearching,
    setTypeFilter,
    setStatusFilter,
    setSearchQuery,
    setRagQuery,
    fetchDocuments,
    uploadFile,
    deleteDocument,
    rebuildIndex,
    searchRAG,
  };
}
