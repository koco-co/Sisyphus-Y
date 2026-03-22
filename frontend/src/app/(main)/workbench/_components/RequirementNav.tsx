'use client';

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Filter,
  FolderOpen,
  FolderX,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FolderDialog } from '@/components/ui/FolderDialog';
import { FolderItem } from '@/components/folders/FolderItem';
import { useDebounce } from '@/hooks/useDebounce';
import { useRequirementTree } from '@/hooks/useRequirementTree';
import type { Folder, Requirement } from '@/lib/api';
import type { GenSession } from '@/stores/workspace-store';

interface RequirementNavProps {
  sessions: GenSession[];
  activeSessionId: string | null;
  selectedReqId: string | null;
  onSelectRequirement: (req: Requirement) => void;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
}

function statusDot(status: string) {
  if (status === 'generated') return 'bg-sy-accent';
  if (status === 'partial') return 'bg-sy-warn';
  return 'bg-text3/40';
}

/**
 * Highlights matching text in a string with a mark element.
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <>
      {before}
      <mark className="bg-sy-accent/30 text-inherit rounded px-0.5">{match}</mark>
      {after}
    </>
  );
}

export function RequirementNav({
  sessions,
  activeSessionId,
  selectedReqId,
  onSelectRequirement,
  onSelectSession,
  onCreateSession,
}: RequirementNavProps) {
  const {
    products,
    productsLoading,
    expandedProducts,
    iterations,
    iterationsLoading,
    expandedIterations,
    requirements,
    requirementsLoading,
    folders,
    foldersLoading,
    expandedFolders,
    toggleProduct,
    toggleIteration,
    toggleFolder,
    createFolder,
    updateFolder,
    deleteFolder,
  } = useRequirementTree();
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [hideEmptyIterations, setHideEmptyIterations] = useState(false);
  const [loading, setLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    folderId: string;
    iterationId: string;
    productId: string;
  }>({ open: false, folderId: '', iterationId: '', productId: '' });

  const [folderDialog, setFolderDialog] = useState<{
    open: boolean;
    mode: 'create' | 'rename';
    parentId: string | null;
    folderId?: string;
    initialValue?: string;
    iterationId?: string;
    productId?: string;
  }>({ open: false, mode: 'create', parentId: null });

  // Debounce search input by 300ms
  const debouncedSearch = useDebounce(searchInput, 300);

  // Check if a requirement matches the search query
  const matchesSearch = useCallback(
    (req: Requirement): boolean => {
      if (!debouncedSearch) return true;
      const query = debouncedSearch.toLowerCase();
      return (
        req.title.toLowerCase().includes(query) ||
        (req.req_id?.toLowerCase().includes(query) ?? false)
      );
    },
    [debouncedSearch],
  );

  // Filter and compute visibility for products/iterations
  const filteredTree = useMemo(() => {
    return products
      .map((product) => {
        const productIterations = iterations[product.id] ?? [];
        const filteredIterations = productIterations
          .map((iter) => {
            const iterReqs = requirements[iter.id] ?? [];
            const filteredReqs = iterReqs.filter(matchesSearch);
            const isEmpty = iterReqs.length === 0;

            return {
              ...iter,
              requirements: iterReqs,
              filteredRequirements: filteredReqs,
              isEmpty,
              shouldHide:
                (hideEmptyIterations && isEmpty) || (debouncedSearch && filteredReqs.length === 0),
            };
          })
          .filter((iter) => !iter.shouldHide);

        return {
          ...product,
          iterations: filteredIterations,
          hasVisibleIterations: filteredIterations.length > 0,
        };
      })
      .filter((product) => product.hasVisibleIterations || !debouncedSearch);
  }, [
    products,
    iterations,
    requirements,
    matchesSearch,
    hideEmptyIterations,
    debouncedSearch,
  ]);

  const hasActiveFilters = hideEmptyIterations || !!debouncedSearch;

  // Folder operation handlers
  const handleCreateFolder = useCallback(
    (parentId: string | null, iterationId: string, productId: string) => {
      setFolderDialog({
        open: true,
        mode: 'create',
        parentId,
        iterationId,
        productId,
      });
    },
    [],
  );

  const handleRenameFolder = useCallback(
    (folderId: string, currentName: string, iterationId: string, productId: string) => {
      setFolderDialog({
        open: true,
        mode: 'rename',
        folderId,
        initialValue: currentName,
        iterationId,
        productId,
        parentId: null,
      });
    },
    [],
  );

  const handleDeleteFolder = useCallback(
    (folderId: string, iterationId: string, productId: string) => {
      setDeleteConfirm({ open: true, folderId, iterationId, productId });
    },
    [],
  );

  const handleDeleteConfirm = useCallback(async () => {
    const { folderId, iterationId, productId } = deleteConfirm;
    setDeleteConfirm((prev) => ({ ...prev, open: false }));
    try {
      setLoading(true);
      await deleteFolder(productId, iterationId, folderId);
    } catch (error) {
      console.error('Failed to delete folder:', error);
    } finally {
      setLoading(false);
    }
  }, [deleteConfirm, deleteFolder]);

  const handleFolderSubmit = useCallback(
    async (name: string) => {
      const { mode, parentId, folderId, iterationId, productId } = folderDialog;
      if (!iterationId || !productId) return;

      try {
        setLoading(true);
        if (mode === 'create') {
          await createFolder(productId, iterationId, { name, parentId });
        } else if (mode === 'rename' && folderId) {
          await updateFolder(productId, iterationId, folderId, { name });
        }
        setFolderDialog({ open: false, mode: 'create', parentId: null });
      } catch (error) {
        console.error('Failed to save folder:', error);
      } finally {
        setLoading(false);
      }
    },
    [folderDialog, createFolder, updateFolder],
  );

  // Render requirement item
  const renderRequirementItem = useCallback(
    (req: Requirement, iterationId: string) => {
      const isSelected = req.id === selectedReqId;

      return (
        <button
          type="button"
          key={req.id}
          onClick={() => onSelectRequirement(req)}
          className={`w-full flex items-center gap-1.5 pl-8 pr-2.5 py-1.5 rounded-md text-[12px] transition-colors ${
            isSelected
              ? 'bg-sy-accent/10 text-sy-accent'
              : 'text-text2 hover:bg-bg2'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(req.status ?? '')}`}
          />
          <FileText className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {highlightMatch(req.title || (req.req_id ?? ''), debouncedSearch)}
          </span>
        </button>
      );
    },
    [selectedReqId, onSelectRequirement, debouncedSearch],
  );

  // Render folder tree recursively
  const renderFolder = useCallback(
    (folder: Folder, level: number, iterationId: string, productId: string): React.ReactNode => {
      const isExpanded = expandedFolders.has(folder.id);
      const iterReqs = requirements[iterationId] ?? [];
      const folderReqs = iterReqs.filter(
        (r) => (r as Requirement & { folder_id?: string }).folder_id === folder.id,
      );
      const filteredFolderReqs = folderReqs.filter(matchesSearch);
      const hasContent = folder.children.length > 0 || folderReqs.length > 0;

      return (
        <FolderItem
          key={folder.id}
          folder={folder}
          level={level}
          expanded={isExpanded}
          onToggle={() => toggleFolder(folder.id)}
          onCreateChild={(parentId) => handleCreateFolder(parentId, iterationId, productId)}
          onRename={(fid, name) => handleRenameFolder(fid, name, iterationId, productId)}
          onDelete={(fid) => handleDeleteFolder(fid, iterationId, productId)}
        >
          {/* Recursively render child folders */}
          {folder.children.map((child) => renderFolder(child, level + 1, iterationId, productId))}
          {/* Render requirements in this folder */}
          {isExpanded && filteredFolderReqs.map((req) => renderRequirementItem(req, iterationId))}
          {/* Empty folder hint */}
          {isExpanded && !hasContent && (
            <div
              className="flex items-center gap-1.5 py-2 text-text3"
              style={{ paddingLeft: `${20 + (level + 1) * 12}px` }}
            >
              <FolderX className="w-3 h-3" />
              <span className="text-[11px]">暂无内容</span>
            </div>
          )}
        </FolderItem>
      );
    },
    [
      expandedFolders,
      requirements,
      toggleFolder,
      handleCreateFolder,
      handleRenameFolder,
      handleDeleteFolder,
      matchesSearch,
      renderRequirementItem,
    ],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-sy-accent" />
        <h3 className="text-[13px] font-semibold text-text">生成工作台</h3>
      </div>

      {/* Search and Filter */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-bg2 border border-border">
          <Search className="w-3.5 h-3.5 text-text3 flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索需求..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 bg-transparent text-[12px] text-text placeholder:text-text3 outline-none min-w-0"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="text-text3 hover:text-text2 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`p-0.5 rounded transition-colors ${hasActiveFilters ? 'text-sy-accent' : 'text-text3 hover:text-text2'}`}
            title="筛选"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Filter options */}
        {showFilters && (
          <div className="mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideEmptyIterations}
                onChange={(e) => setHideEmptyIterations(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border text-sy-accent focus:ring-sy-accent/50"
              />
              <span className="text-[11px] text-text2">仅显示有需求的迭代</span>
            </label>
          </div>
        )}
      </div>

      {/* Requirement tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {productsLoading ? (
          <div className="text-center py-4 text-[12px] text-text3">加载中...</div>
        ) : filteredTree.length === 0 ? (
          <div className="text-center py-8 text-[12px] text-text3">
            {debouncedSearch ? '未找到匹配的需求' : '暂无子产品数据'}
          </div>
        ) : (
          filteredTree.map((product) => (
            <div key={product.id}>
              <button
                type="button"
                onClick={() => toggleProduct(product.id)}
                className="w-full flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[13px] text-text hover:bg-bg2 transition-colors"
              >
                {expandedProducts.has(product.id) ? (
                  <ChevronDown className="w-3.5 h-3.5 text-text3 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-text3 shrink-0" />
                )}
                <FolderOpen className="w-3.5 h-3.5 text-sy-accent shrink-0" />
                <span className="truncate">{product.name}</span>
              </button>

              {expandedProducts.has(product.id) &&
                (iterationsLoading[product.id] ? (
                  <div className="pl-8 py-1 text-[11px] text-text3">迭代加载中...</div>
                ) : (
                  product.iterations.map((iter) => {
                    const iterFolders = folders[iter.id] ?? [];
                    const iterReqs = requirements[iter.id] ?? [];
                    const isFolderLoading = foldersLoading[iter.id];
                    const isReqLoading = requirementsLoading[iter.id];
                    const unclassifiedReqs = iterReqs.filter(
                      (r) => !(r as Requirement & { folder_id?: string }).folder_id,
                    );
                    const filteredUnclassifiedReqs = unclassifiedReqs.filter(matchesSearch);

                    return (
                      <div key={iter.id} className="pl-4">
                        {/* Iteration header with create folder button */}
                        <div className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] text-text2 hover:bg-bg2 transition-colors group">
                          <button
                            type="button"
                            onClick={() => toggleIteration(product.id, iter.id)}
                            className="flex items-center gap-1.5 flex-1 min-w-0"
                          >
                            {expandedIterations.has(iter.id) ? (
                              <ChevronDown className="w-3 h-3 text-text3 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-text3 shrink-0" />
                            )}
                            <RefreshCw className="w-3 h-3 shrink-0" />
                            <span className="truncate flex-1 text-left">
                              {highlightMatch(iter.name, debouncedSearch)}
                            </span>
                            {!iter.isEmpty && (
                              <span className="text-[10px] text-text3 font-mono flex-shrink-0">
                                {iter.requirements.length}
                              </span>
                            )}
                          </button>
                          {expandedIterations.has(iter.id) && (
                            <button
                              type="button"
                              onClick={() => handleCreateFolder(null, iter.id, product.id)}
                              className="p-0.5 text-text3 hover:text-sy-accent opacity-0 group-hover:opacity-100 transition-all"
                              title="新建文件夹"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Folders and Requirements */}
                        {expandedIterations.has(iter.id) && (
                          <div>
                            {(isReqLoading || isFolderLoading) ? (
                              <div className="pl-4 py-1 text-[11px] text-text3">加载中...</div>
                            ) : (
                              <>
                                {/* Render folder tree */}
                                {iterFolders.map((folder) =>
                                  renderFolder(folder, 0, iter.id, product.id),
                                )}
                                {/* 未分类需求 */}
                                {filteredUnclassifiedReqs.length > 0 && (
                                  <div className={iterFolders.length > 0 ? 'border-t border-sy-border/50 mt-1' : ''}>
                                    {iterFolders.length > 0 && (
                                      <div className="flex items-center gap-1.5 pl-8 pr-2 py-1">
                                        <FolderX className="w-3 h-3 text-text3" />
                                        <span className="text-[10px] text-text3 uppercase tracking-wider">
                                          未分类
                                        </span>
                                      </div>
                                    )}
                                    {filteredUnclassifiedReqs.map((req) =>
                                      renderRequirementItem(req, iter.id),
                                    )}
                                  </div>
                                )}
                                {/* Show empty state if no folders and no unclassified requirements */}
                                {iterFolders.length === 0 && filteredUnclassifiedReqs.length === 0 && (
                                  <div className="pl-8 py-1 text-[11px] text-text3">当前迭代暂无需求</div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ))}
            </div>
          ))
        )}
      </div>

      {/* Session list */}
      {selectedReqId && (
        <div className="border-t border-border max-h-[35%] overflow-y-auto p-2">
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-[11px] font-semibold text-text2 uppercase tracking-wider">
              会话列表
            </span>
            <button
              type="button"
              onClick={onCreateSession}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-sy-accent hover:bg-sy-accent/10 transition-colors"
            >
              <Plus className="w-3 h-3" />
              新建
            </button>
          </div>
          {sessions.map((session) => (
            <button
              type="button"
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`w-full flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[12px] mb-0.5 transition-colors ${
                activeSessionId === session.id
                  ? 'bg-sy-accent/10 text-sy-accent'
                  : 'text-text2 hover:bg-bg2'
              }`}
            >
              <MessageSquare className="w-3 h-3 shrink-0" />
              <span className="truncate flex-1 text-left">
                {session.mode === 'test_point_driven'
                  ? '测试点驱动'
                  : session.mode === 'document_driven'
                    ? '文档驱动'
                    : session.mode === 'dialogue'
                      ? '对话引导'
                      : session.mode === 'template'
                        ? '模板填充'
                        : session.mode}
              </span>
              <span className="text-[10px] text-text3 font-mono shrink-0">
                {session.created_at?.slice(5, 16)}
              </span>
            </button>
          ))}
          {sessions.length === 0 && (
            <div className="text-center py-4 text-[11px] text-text3">无会话，点击新建</div>
          )}
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="删除文件夹"
        description="确定要删除此文件夹吗？文件夹内的需求将被移至「未分类」。"
        confirmText="删除"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm((prev) => ({ ...prev, open: false }))}
      />

      {/* Folder Dialog */}
      <FolderDialog
        open={folderDialog.open}
        onClose={() => setFolderDialog({ open: false, mode: 'create', parentId: null })}
        onSubmit={handleFolderSubmit}
        initialValue={folderDialog.initialValue ?? ''}
        title={folderDialog.mode === 'create' ? '新建文件夹' : '重命名文件夹'}
        loading={loading}
      />
    </div>
  );
}
