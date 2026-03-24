'use client';

import { closestCenter, DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Filter,
  FolderOpen,
  FolderX,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadRequirementDialog } from '@/app/(main)/requirements/_components/UploadRequirementDialog';
import { DraggableFolderItem } from '@/components/folders/DraggableFolderItem';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FolderDialog } from '@/components/ui/FolderDialog';
import { MoveFolderDialog } from '@/components/ui/MoveFolderDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useFolderDnd } from '@/hooks/useFolderDnd';
import { useRequirementTree } from '@/hooks/useRequirementTree';
import type { Folder, Requirement } from '@/lib/api';

const PRIORITY_OPTIONS = ['P0', 'P1', 'P2', 'P3'] as const;
const STATUS_OPTIONS = [
  { value: 'completed', label: '已完成' },
  { value: 'processing', label: '分析中' },
  { value: 'pending', label: '未分析' },
] as const;

interface AnalysisLeftPanelProps {
  selectedReqId: string | null;
  onSelectRequirement: (reqId: string) => void;
}

interface ReqContextMenu {
  open: boolean;
  x: number;
  y: number;
  req: Requirement | null;
  iterationId: string;
  productId: string;
}

export function AnalysisLeftPanel({ selectedReqId, onSelectRequirement }: AnalysisLeftPanelProps) {
  const [panelWidth, setPanelWidth] = useState(260);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

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

  const [moveFolderDialog, setMoveFolderDialog] = useState<{
    open: boolean;
    req: Requirement | null;
    iterationId: string;
    productId: string;
  }>({ open: false, req: null, iterationId: '', productId: '' });

  const [reqContextMenu, setReqContextMenu] = useState<ReqContextMenu>({
    open: false,
    x: 0,
    y: 0,
    req: null,
    iterationId: '',
    productId: '',
  });

  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const hasActiveFilters = priorityFilter.size > 0 || statusFilter.size > 0;

  const togglePriority = useCallback((p: string) => {
    setPriorityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }, []);

  const toggleStatus = useCallback((s: string) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }, []);

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
    reorderFolders,
    moveRequirementToFolder,
  } = useRequirementTree();

  // 当前选中迭代的文件夹（用于拖拽）
  const [currentIterationId, setCurrentIterationId] = useState<string | null>(null);
  const currentFolders = currentIterationId ? (folders[currentIterationId] ?? []) : [];

  const folderDnd = useFolderDnd({
    folders: currentFolders,
    onReorder: async (items) => {
      let productId = '';
      for (const [pid, iters] of Object.entries(iterations)) {
        if (iters.some((iter) => iter.id === currentIterationId)) {
          productId = pid;
          break;
        }
      }
      if (productId && currentIterationId) {
        await reorderFolders(productId, currentIterationId, items);
      }
    },
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = panelWidth;
    },
    [panelWidth],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(320, Math.max(200, startWidth.current + delta));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 关闭需求右键菜单
  useEffect(() => {
    if (!reqContextMenu.open) return;
    const close = () => setReqContextMenu((prev) => ({ ...prev, open: false }));
    window.addEventListener('click', close);
    window.addEventListener('keydown', (e) => e.key === 'Escape' && close());
    return () => window.removeEventListener('click', close);
  }, [reqContextMenu.open]);

  const matchesSearch = useCallback(
    (req: Requirement) => {
      if (searchQuery && !req.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (priorityFilter.size > 0) {
        const priority = (req as Requirement & { priority?: string }).priority ?? '';
        if (!priorityFilter.has(priority)) return false;
      }
      if (statusFilter.size > 0) {
        const status =
          (req as Requirement & { analysis_status?: string }).analysis_status ?? 'pending';
        if (!statusFilter.has(status)) return false;
      }
      return true;
    },
    [searchQuery, priorityFilter, statusFilter],
  );

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
    } catch (_error) {
      // silently ignore
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
      } catch (_error) {
        // silently ignore
      } finally {
        setLoading(false);
      }
    },
    [folderDialog, createFolder, updateFolder],
  );

  const handleMoveToFolder = useCallback(
    async (folderId: string | null) => {
      const { req, iterationId, productId } = moveFolderDialog;
      if (!req) return;
      setMoveFolderDialog((prev) => ({ ...prev, open: false }));
      try {
        setLoading(true);
        await moveRequirementToFolder(req.id, folderId, productId, iterationId);
      } catch (_error) {
        // silently ignore
      } finally {
        setLoading(false);
      }
    },
    [moveFolderDialog, moveRequirementToFolder],
  );

  // Render requirement item
  const renderRequirementItem = useCallback(
    (req: Requirement, iterationId: string, productId: string) => {
      const isSelected = req.id === selectedReqId;
      const status =
        (req as Requirement & { analysis_status?: string }).analysis_status ?? 'pending';
      const highRiskCount =
        (req as Requirement & { unconfirmed_high_risk_count?: number })
          .unconfirmed_high_risk_count ?? 0;
      const dotClass =
        status === 'completed'
          ? 'bg-sy-accent'
          : status === 'processing'
            ? 'bg-sy-warn'
            : 'bg-sy-text-3/50';

      return (
        <button
          key={req.id}
          type="button"
          onClick={() => onSelectRequirement(req.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const panelEl = e.currentTarget.closest('[data-panel]') as HTMLElement | null;
            const panelRight = panelEl ? panelEl.getBoundingClientRect().right : window.innerWidth;
            const menuWidth = 140;
            const x = Math.min(e.clientX, panelRight - menuWidth - 4);
            setReqContextMenu({
              open: true,
              x,
              y: e.clientY,
              req,
              iterationId,
              productId,
            });
          }}
          className={`w-full flex items-center gap-2 pl-10 pr-3 py-1.5 text-left transition-colors ${
            isSelected ? 'bg-sy-bg-2 border-r-2 border-sy-accent' : 'hover:bg-sy-bg-2/60'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
          <span className="flex-1 text-[11.5px] text-sy-text truncate min-w-0">{req.title}</span>
          {highRiskCount > 0 && (
            <span className="bg-sy-danger text-white text-[10px] font-mono rounded-full px-1.5 py-0.5 leading-none flex-shrink-0">
              {highRiskCount}
            </span>
          )}
        </button>
      );
    },
    [selectedReqId, onSelectRequirement],
  );

  // Render folder tree recursively
  const renderFolder = useCallback(
    (folder: Folder, level: number, iterationId: string, productId: string): React.ReactNode => {
      const isExpanded = expandedFolders.has(folder.id);
      const iterReqs = requirements[iterationId] ?? [];
      const folderReqs = iterReqs.filter(
        (r) => (r as Requirement & { folder_id?: string }).folder_id === folder.id,
      );
      const hasContent = folder.children.length > 0 || folderReqs.length > 0;

      return (
        <DraggableFolderItem
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
          {isExpanded &&
            folderReqs
              .filter(matchesSearch)
              .map((req) => renderRequirementItem(req, iterationId, productId))}
          {/* Empty folder hint */}
          {isExpanded && !hasContent && (
            <div
              className="flex items-center gap-1.5 py-1.5 text-sy-text-3"
              style={{ paddingLeft: `${36 + (level + 1) * 12}px` }}
            >
              <FolderX className="w-3 h-3" />
              <span className="text-[11px]">暂无内容，可将需求右键移入</span>
            </div>
          )}
        </DraggableFolderItem>
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
    <div
      data-panel
      className="relative flex-shrink-0 flex flex-col bg-sy-bg-1 border-r border-sy-border overflow-hidden"
      style={{ width: panelWidth, height: '100%' }}
    >
      {/* Search header */}
      <div className="flex-shrink-0 px-3 py-2.5 border-b border-sy-border">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-sy-bg-2 border border-sy-border">
          <Search className="w-3.5 h-3.5 text-sy-text-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索需求..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-[12px] text-sy-text placeholder:text-sy-text-3 outline-none min-w-0"
          />
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`p-0.5 rounded transition-colors ${hasActiveFilters ? 'text-sy-accent' : 'text-sy-text-3 hover:text-sy-text-2'}`}
            title="筛选"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setUploadDialogOpen(true)}
            className="p-0.5 rounded transition-colors text-sy-text-3 hover:text-sy-accent"
            title="新建需求"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {showFilters && (
          <div className="mt-2 space-y-1.5">
            <div className="flex flex-wrap gap-1">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePriority(p)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono transition-colors ${
                    priorityFilter.has(p)
                      ? 'bg-sy-accent/15 text-sy-accent border border-sy-accent/40'
                      : 'bg-sy-bg-3 text-sy-text-3 border border-sy-border hover:border-sy-border-2'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleStatus(s.value)}
                  className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                    statusFilter.has(s.value)
                      ? 'bg-sy-accent/15 text-sy-accent border border-sy-accent/40'
                      : 'bg-sy-bg-3 text-sy-text-3 border border-sy-border hover:border-sy-border-2'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tree list */}
      <div className="flex-1 overflow-y-auto">
        {productsLoading ? (
          <TableSkeleton rows={5} cols={2} />
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <FileText className="w-12 h-12 text-sy-text-3 opacity-30 mb-3" />
            <p className="text-[12px] text-sy-text-3 mb-1">还没有需求</p>
            <p className="text-[11px] text-sy-text-3 opacity-70 mb-3">
              从录入或上传文档开始，AI 将自动分析潜在风险
            </p>
            <button
              type="button"
              onClick={() => setUploadDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-medium bg-sy-accent/10 border border-sy-accent/30 text-sy-accent hover:bg-sy-accent/20 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              上传需求文档
            </button>
          </div>
        ) : (
          products.map((product) => {
            const isProductExpanded = expandedProducts.has(product.id);
            const productIterations = iterations[product.id] ?? [];
            const isIterLoading = iterationsLoading[product.id];

            return (
              <div key={product.id}>
                {/* Product header */}
                <button
                  type="button"
                  onClick={() => toggleProduct(product.id)}
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-left hover:bg-sy-bg-2 transition-colors"
                >
                  {isProductExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-sy-text-3 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-sy-text-3 flex-shrink-0" />
                  )}
                  <span className="text-[12px] font-semibold text-sy-text-2 truncate">
                    {product.name}
                  </span>
                </button>

                {/* Iterations */}
                {isProductExpanded && (
                  <div>
                    {isIterLoading ? (
                      <div className="px-2">
                        <TableSkeleton rows={3} cols={2} />
                      </div>
                    ) : (
                      productIterations.map((iteration) => {
                        const isIterExpanded = expandedIterations.has(iteration.id);
                        const iterReqs = requirements[iteration.id] ?? [];
                        const isReqLoading = requirementsLoading[iteration.id];
                        const isFolderLoading = foldersLoading[iteration.id];
                        const iterFolders = folders[iteration.id] ?? [];
                        const unclassifiedReqs = iterReqs.filter(
                          (r) => !(r as Requirement & { folder_id?: string }).folder_id,
                        );
                        const filteredUnclassifiedReqs = unclassifiedReqs.filter(matchesSearch);
                        const filteredReqs = iterReqs.filter(matchesSearch);

                        if (searchQuery && filteredReqs.length === 0) return null;

                        return (
                          <div key={iteration.id}>
                            {/* Iteration header */}
                            <div className="w-full flex items-center gap-1.5 pl-6 pr-3 py-1.5 hover:bg-sy-bg-2 transition-colors group">
                              <button
                                type="button"
                                onClick={() => toggleIteration(product.id, iteration.id)}
                                className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                              >
                                {isIterExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-sy-text-3 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-sy-text-3 flex-shrink-0" />
                                )}
                                <span className="text-[11.5px] text-sy-text-2 truncate flex-1">
                                  {iteration.name}
                                </span>
                                {iterReqs.length > 0 && (
                                  <span className="text-[10px] text-sy-text-3 font-mono flex-shrink-0">
                                    {iterReqs.length}
                                  </span>
                                )}
                              </button>
                              {isIterExpanded && (
                                <button
                                  type="button"
                                  onClick={() => handleCreateFolder(null, iteration.id, product.id)}
                                  className="p-0.5 text-sy-text-3 hover:text-sy-accent opacity-0 group-hover:opacity-100 transition-all"
                                  title="新建文件夹"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Folders and Requirements */}
                            {isIterExpanded && (
                              <div>
                                {isReqLoading || isFolderLoading ? (
                                  <div className="px-2">
                                    <TableSkeleton rows={4} cols={2} />
                                  </div>
                                ) : (
                                  <DndContext
                                    key={iteration.id}
                                    sensors={folderDnd.sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={(event) => {
                                      setCurrentIterationId(iteration.id);
                                      folderDnd.handleDragStart(event);
                                    }}
                                    onDragOver={folderDnd.handleDragOver}
                                    onDragEnd={(event) => folderDnd.handleDragEnd(event)}
                                    onDragCancel={folderDnd.handleDragCancel}
                                  >
                                    <SortableContext
                                      items={iterFolders.map((f) => f.id)}
                                      strategy={verticalListSortingStrategy}
                                    >
                                      {iterFolders.map((folder) =>
                                        renderFolder(folder, 0, iteration.id, product.id),
                                      )}
                                    </SortableContext>

                                    {/* 未分类需求区域 */}
                                    {filteredUnclassifiedReqs.length > 0 && (
                                      <div
                                        className={
                                          iterFolders.length > 0
                                            ? 'border-t border-sy-border/50 mt-1'
                                            : ''
                                        }
                                      >
                                        {iterFolders.length > 0 && (
                                          <div className="flex items-center gap-1.5 pl-10 pr-3 py-1">
                                            <FolderX className="w-3 h-3 text-sy-text-3" />
                                            <span className="text-[10px] text-sy-text-3 uppercase tracking-wider">
                                              未分类
                                            </span>
                                          </div>
                                        )}
                                        {filteredUnclassifiedReqs.map((req) =>
                                          renderRequirementItem(req, iteration.id, product.id),
                                        )}
                                      </div>
                                    )}

                                    {iterFolders.length === 0 &&
                                      filteredUnclassifiedReqs.length === 0 && (
                                        <div className="pl-10 pr-3 py-1.5">
                                          <span className="text-[11px] text-sy-text-3">
                                            暂无需求
                                          </span>
                                        </div>
                                      )}
                                  </DndContext>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Drag handle */}
      <button
        type="button"
        aria-label="拖拽调整宽度"
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-sy-accent transition-colors p-0 border-0 bg-transparent"
        onMouseDown={handleMouseDown}
      />

      {/* 需求右键菜单 */}
      {reqContextMenu.open && (
        <div
          className="fixed z-50 bg-sy-bg-1 border border-sy-border rounded-lg shadow-xl py-1 w-36"
          style={{ top: reqContextMenu.y, left: reqContextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-sy-text-2 hover:bg-sy-bg-2 transition-colors"
            onClick={() => {
              const iterationId = reqContextMenu.iterationId;
              const productId = reqContextMenu.productId;
              const _currentFolderId = reqContextMenu.req
                ? (reqContextMenu.req as Requirement & { folder_id?: string }).folder_id
                : null;
              setMoveFolderDialog({
                open: true,
                req: reqContextMenu.req,
                iterationId,
                productId,
              });
              setReqContextMenu((prev) => ({ ...prev, open: false }));
            }}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            移入文件夹
          </button>
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

      {/* Move to Folder Dialog */}
      <MoveFolderDialog
        open={moveFolderDialog.open}
        folders={moveFolderDialog.iterationId ? (folders[moveFolderDialog.iterationId] ?? []) : []}
        currentFolderId={
          moveFolderDialog.req
            ? (moveFolderDialog.req as Requirement & { folder_id?: string }).folder_id
            : null
        }
        onConfirm={handleMoveToFolder}
        onCancel={() => setMoveFolderDialog((prev) => ({ ...prev, open: false }))}
      />

      {/* Upload Requirement Dialog */}
      <UploadRequirementDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        productId={products[0]?.id}
        iterationId={Object.values(iterations).flat()[0]?.id}
        onSuccess={() => {
          setUploadDialogOpen(false);
        }}
      />
    </div>
  );
}
