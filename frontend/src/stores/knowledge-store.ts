import { create } from 'zustand';

export type VectorStatus = 'completed' | 'processing' | 'failed' | 'pending';

export interface KnowledgeDocument {
  id: string;
  file_name: string;
  doc_type: string;
  file_size: number;
  vector_status: VectorStatus;
  hit_count: number;
  chunk_count: number;
  tags: string[];
  uploaded_at: string;
  updated_at: string;
  /** 文档版本号（整数），手动条目为 1 */
  version?: number;
  /** 条目来源类型：upload=文件上传，manual=手动添加 */
  entry_type?: 'upload' | 'manual';
  /** 同一文档已存在的历史版本数量 */
  version_count?: number;
}

export interface RAGSearchResult {
  id: string;
  content: string;
  score: number;
  source_doc: string;
  chunk_index: number;
}

interface KnowledgeState {
  documents: KnowledgeDocument[];
  total: number;
  typeFilter: string;
  statusFilter: string;
  searchQuery: string;
  isUploading: boolean;
  uploadProgress: number;
  ragQuery: string;
  ragResults: RAGSearchResult[];
  ragSearching: boolean;

  setDocuments: (docs: KnowledgeDocument[], total: number) => void;
  setTypeFilter: (filter: string) => void;
  setStatusFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  setUploading: (uploading: boolean, progress?: number) => void;
  setUploadProgress: (progress: number) => void;
  setRagQuery: (query: string) => void;
  setRagResults: (results: RAGSearchResult[]) => void;
  setRagSearching: (searching: boolean) => void;
  removeDocument: (id: string) => void;
  updateDocumentStatus: (id: string, status: VectorStatus) => void;
}

export const useKnowledgeStore = create<KnowledgeState>((set) => ({
  documents: [],
  total: 0,
  typeFilter: '',
  statusFilter: '',
  searchQuery: '',
  isUploading: false,
  uploadProgress: 0,
  ragQuery: '',
  ragResults: [],
  ragSearching: false,

  setDocuments: (docs, total) => set({ documents: docs, total }),
  setTypeFilter: (filter) => set({ typeFilter: filter }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setUploading: (uploading, progress = 0) =>
    set({ isUploading: uploading, uploadProgress: progress }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setRagQuery: (query) => set({ ragQuery: query }),
  setRagResults: (results) => set({ ragResults: results }),
  setRagSearching: (searching) => set({ ragSearching: searching }),
  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      total: state.total - 1,
    })),
  updateDocumentStatus: (id, status) =>
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, vector_status: status } : d)),
    })),
}));
