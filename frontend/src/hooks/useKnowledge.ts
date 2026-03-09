import { useCallback, useEffect, useState } from 'react';
import { api, API_BASE } from '@/lib/api';
import {
  useKnowledgeStore,
  type KnowledgeDocument,
  type RAGSearchResult,
} from '@/stores/knowledge-store';

interface PaginatedDocs {
  items: KnowledgeDocument[];
  total: number;
}

export function useKnowledge() {
  const store = useKnowledgeStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (store.typeFilter) params.set('doc_type', store.typeFilter);
      if (store.statusFilter) params.set('vector_status', store.statusFilter);
      if (store.searchQuery) params.set('q', store.searchQuery);
      const data = await api.get<PaginatedDocs>(`/knowledge/?${params}`);
      store.setDocuments(data.items || [], data.total || 0);
    } catch (e) {
      console.error('Failed to fetch documents:', e);
      setError('加载文档列表失败');
    } finally {
      setLoading(false);
    }
  }, [store.typeFilter, store.statusFilter, store.searchQuery]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadFile = useCallback(
    async (file: File) => {
      store.setUploading(true, 0);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              store.setUploadProgress(Math.round((e.loaded / e.total) * 100));
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
      } catch (e) {
        console.error('Upload failed:', e);
        setError('文件上传失败');
      } finally {
        store.setUploading(false, 0);
      }
    },
    [fetchDocuments],
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/knowledge/${id}`);
        store.removeDocument(id);
      } catch (e) {
        console.error('Delete failed:', e);
        setError('删除文档失败');
      }
    },
    [],
  );

  const rebuildIndex = useCallback(
    async (id: string) => {
      try {
        store.updateDocumentStatus(id, 'processing');
        await api.post(`/knowledge/${id}/reindex`);
      } catch (e) {
        console.error('Reindex failed:', e);
        store.updateDocumentStatus(id, 'failed');
        setError('重建索引失败');
      }
    },
    [],
  );

  const searchRAG = useCallback(async (query: string) => {
    if (!query.trim()) return;
    store.setRagSearching(true);
    store.setRagResults([]);
    try {
      const results = await api.post<RAGSearchResult[]>('/knowledge/search', {
        query,
        top_k: 5,
      });
      store.setRagResults(results);
    } catch (e) {
      console.error('RAG search failed:', e);
      setError('检索失败');
    } finally {
      store.setRagSearching(false);
    }
  }, []);

  return {
    documents: store.documents,
    total: store.total,
    loading,
    error,
    typeFilter: store.typeFilter,
    statusFilter: store.statusFilter,
    searchQuery: store.searchQuery,
    isUploading: store.isUploading,
    uploadProgress: store.uploadProgress,
    ragQuery: store.ragQuery,
    ragResults: store.ragResults,
    ragSearching: store.ragSearching,
    setTypeFilter: store.setTypeFilter,
    setStatusFilter: store.setStatusFilter,
    setSearchQuery: store.setSearchQuery,
    setRagQuery: store.setRagQuery,
    fetchDocuments,
    uploadFile,
    deleteDocument,
    rebuildIndex,
    searchRAG,
  };
}
