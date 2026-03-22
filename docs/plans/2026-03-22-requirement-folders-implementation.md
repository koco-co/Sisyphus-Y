# Requirement Folders 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为需求管理添加多层级文件夹组织能力，Phase 1 实现基础 CRUD 功能。

**Architecture:** 扩展现有 `useRequirementTree` hook 添加文件夹支持，在 AnalysisLeftPanel 和 RequirementNav 组件中渲染文件夹树，后端在新建迭代时自动创建「未分类」系统文件夹。

**Tech Stack:** React, TypeScript, FastAPI, SQLAlchemy, TanStack Query

---

## Task 1: 后端 - 新建迭代自动创建「未分类」文件夹

**Files:**
- Modify: `backend/app/modules/products/service.py:69-74`
- Test: `backend/tests/unit/test_products/test_iteration_service.py`

**Step 1: 编写测试**

```python
# backend/tests/unit/test_products/test_iteration_service.py

import pytest
from app.modules.products.service import IterationService
from app.modules.products.schemas import IterationCreate
from app.modules.products.models import RequirementFolder

@pytest.mark.asyncio
async def test_create_iteration_auto_creates_uncategorized_folder(db_session):
    """新建迭代时应自动创建「未分类」系统文件夹"""
    # 先创建产品
    from app.modules.products.models import Product
    product = Product(name="测试产品", slug="test-product")
    db_session.add(product)
    await db_session.commit()

    service = IterationService(db_session)
    data = IterationCreate(
        product_id=product.id,
        name="v1.0",
    )
    iteration = await service.create_iteration(data)

    # 验证自动创建了文件夹
    from sqlalchemy import select
    result = await db_session.execute(
        select(RequirementFolder).where(
            RequirementFolder.iteration_id == iteration.id,
            RequirementFolder.is_system == True,
        )
    )
    folder = result.scalar_one_or_none()

    assert folder is not None, "应该自动创建系统文件夹"
    assert folder.name == "未分类"
    assert folder.is_system == True
    assert folder.level == 1
    assert folder.parent_id is None
```

**Step 2: 运行测试验证失败**

```bash
cd backend && uv run pytest tests/unit/test_products/test_iteration_service.py::test_create_iteration_auto_creates_uncategorized_folder -v
```

Expected: FAIL (文件夹未被创建)

**Step 3: 实现功能**

```python
# backend/app/modules/products/service.py
# 在 IterationService.create_iteration 方法中添加

async def create_iteration(self, data: IterationCreate) -> Iteration:
    iteration = Iteration(**data.model_dump())
    self.session.add(iteration)
    await self.session.flush()  # 获取 iteration.id

    # 自动创建「未分类」系统文件夹
    uncategorized = RequirementFolder(
        iteration_id=iteration.id,
        parent_id=None,
        name="未分类",
        sort_order=0,
        level=1,
        is_system=True,
    )
    self.session.add(uncategorized)

    await self.session.commit()
    await self.session.refresh(iteration)
    return iteration
```

**Step 4: 运行测试验证通过**

```bash
cd backend && uv run pytest tests/unit/test_products/test_iteration_service.py::test_create_iteration_auto_creates_uncategorized_folder -v
```

Expected: PASS

**Step 5: 提交**

```bash
git add backend/app/modules/products/service.py backend/tests/unit/test_products/test_iteration_service.py
git commit -m "feat(products): auto-create 'Uncategorized' folder when creating iteration"
```

---

## Task 2: 后端 - 添加系统文件夹删除保护

**Files:**
- Modify: `backend/app/modules/products/service.py:307-324`
- Test: `backend/tests/unit/test_products/test_folder_service.py`

**Step 1: 编写测试**

```python
# backend/tests/unit/test_products/test_folder_service.py

import pytest
from fastapi import HTTPException
from app.modules.products.service import RequirementFolderService
from app.modules.products.models import Product, Iteration, RequirementFolder

@pytest.mark.asyncio
async def test_delete_system_folder_raises_error(db_session):
    """系统文件夹不可删除"""
    # 创建测试数据
    product = Product(name="测试产品", slug="test-product")
    db_session.add(product)
    await db_session.commit()

    iteration = Iteration(product_id=product.id, name="v1.0")
    db_session.add(iteration)
    await db_session.commit()

    folder = RequirementFolder(
        iteration_id=iteration.id,
        name="未分类",
        is_system=True,
        level=1,
    )
    db_session.add(folder)
    await db_session.commit()

    service = RequirementFolderService(db_session)

    with pytest.raises(HTTPException) as exc:
        await service.delete_folder(folder.id)

    assert exc.value.status_code == 400
    assert "系统文件夹" in exc.value.detail
```

**Step 2: 运行测试验证失败**

```bash
cd backend && uv run pytest tests/unit/test_products/test_folder_service.py::test_delete_system_folder_raises_error -v
```

Expected: FAIL (目前允许删除)

**Step 3: 实现功能**

```python
# backend/app/modules/products/service.py
# 修改 RequirementFolderService.delete_folder 方法

async def delete_folder(self, folder_id: UUID) -> None:
    """软删除文件夹，将文件夹内需求的 folder_id 重置为 None（移到迭代根目录）。"""
    folder = await self.session.get(RequirementFolder, folder_id)
    if not folder or folder.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    # 系统文件夹不可删除
    if folder.is_system:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="系统文件夹不可删除")

    # 将该文件夹内的需求移至根层（folder_id = None）
    reqs = await self.session.execute(
        select(Requirement).where(
            Requirement.folder_id == folder_id,
            Requirement.deleted_at.is_(None),
        )
    )
    for req in reqs.scalars().all():
        req.folder_id = None

    folder.deleted_at = datetime.now(UTC)
    await self.session.commit()
```

**Step 4: 运行测试验证通过**

```bash
cd backend && uv run pytest tests/unit/test_products/test_folder_service.py::test_delete_system_folder_raises_error -v
```

Expected: PASS

**Step 5: 提交**

```bash
git add backend/app/modules/products/service.py backend/tests/unit/test_products/test_folder_service.py
git commit -m "feat(products): prevent deletion of system folders"
```

---

## Task 3: 前端 - 添加 Folder 类型和 API

**Files:**
- Modify: `frontend/src/lib/api.ts`

**Step 1: 添加 Folder 类型定义**

在 `frontend/src/lib/api.ts` 中，在 `Requirement` 接口后添加：

```typescript
// frontend/src/lib/api.ts
// 在 Requirement 接口后（约第 97 行）添加

export interface Folder {
  id: string;
  iteration_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  level: number;
  is_system: boolean;
  requirement_count: number;
  children: Folder[];
  created_at: string;
  updated_at: string;
}

export interface FolderCreatePayload {
  iteration_id: string;
  parent_id?: string | null;
  name: string;
  sort_order?: number;
}

export interface FolderUpdatePayload {
  name?: string;
  parent_id?: string | null;
  sort_order?: number;
}
```

**Step 2: 添加 foldersApi**

在 `productsApi` 后（约第 367 行）添加：

```typescript
// frontend/src/lib/api.ts
// 在 productsApi 后添加

export const foldersApi = {
  getTree: (productId: string, iterationId: string) =>
    api.get<Folder[]>(`/products/${productId}/iterations/${iterationId}/folders/tree`),
  create: (productId: string, iterationId: string, data: FolderCreatePayload) =>
    api.post<Folder>(`/products/${productId}/iterations/${iterationId}/folders`, data),
  update: (folderId: string, data: FolderUpdatePayload) =>
    api.patch<Folder>(`/products/folders/${folderId}`, data),
  delete: (folderId: string) =>
    api.delete<void>(`/products/folders/${folderId}`),
};
```

**Step 3: 验证类型检查通过**

```bash
cd frontend && bunx tsc --noEmit
```

Expected: No errors

**Step 4: 提交**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat(frontend): add Folder types and foldersApi"
```

---

## Task 4: 前端 - 扩展 useRequirementTree Hook

**Files:**
- Modify: `frontend/src/hooks/useRequirementTree.ts`

**Step 1: 添加 Folder 相关状态**

在现有状态声明后添加：

```typescript
// frontend/src/hooks/useRequirementTree.ts
// 在 imports 后添加 Folder 类型
import { type Folder, type Iteration, type Product, productsApi, foldersApi, type Requirement } from '@/lib/api';

// 在现有状态声明后添加
const [folders, setFolders] = useState<Record<string, Folder[]>>({});
const [foldersLoading, setFoldersLoading] = useState<Record<string, boolean>>({});
const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
```

**Step 2: 添加 loadFolders 方法**

```typescript
// frontend/src/hooks/useRequirementTree.ts
// 在 toggleIteration 方法后添加

const loadFolders = useCallback(
  async (productId: string, iterationId: string) => {
    if (folders[iterationId]) return; // 已加载

    setFoldersLoading((prev) => ({ ...prev, [iterationId]: true }));
    try {
      const data = await foldersApi.getTree(productId, iterationId);
      setFolders((prev) => ({ ...prev, [iterationId]: Array.isArray(data) ? data : [] }));
    } catch (error) {
      console.error('Failed to load folders:', error);
      setFolders((prev) => ({ ...prev, [iterationId]: [] }));
    } finally {
      setFoldersLoading((prev) => ({ ...prev, [iterationId]: false }));
    }
  },
  [folders],
);
```

**Step 3: 添加 toggleFolder 方法**

```typescript
// frontend/src/hooks/useRequirementTree.ts
// 在 loadFolders 方法后添加

const toggleFolder = useCallback((folderId: string) => {
  setExpandedFolders((prev) => {
    const next = new Set(prev);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    return next;
  });
}, []);
```

**Step 4: 修改 toggleIteration 方法，展开迭代时加载文件夹**

```typescript
// frontend/src/hooks/useRequirementTree.ts
// 修改 toggleIteration 方法

const toggleIteration = useCallback(
  async (productId: string, iterationId: string) => {
    setExpandedIterations((prev) => {
      const next = new Set(prev);
      if (next.has(iterationId)) {
        next.delete(iterationId);
      } else {
        next.add(iterationId);
        // 加载需求
        if (!requirements[iterationId]) {
          setRequirementsLoading((prev) => ({ ...prev, [iterationId]: true }));
          productsApi
            .listRequirements(productId, iterationId)
            .then((data) =>
              setRequirements((p) => ({ ...p, [iterationId]: Array.isArray(data) ? data : [] })),
            )
            .catch((error) => {
              console.error(error);
              setRequirements((p) => ({ ...p, [iterationId]: [] }));
            })
            .finally(() =>
              setRequirementsLoading((prev) => ({
                ...prev,
                [iterationId]: false,
              })),
            );
        }
        // 加载文件夹
        loadFolders(productId, iterationId);
      }
      return next;
    });
  },
  [requirements, loadFolders],
);
```

**Step 5: 添加 createFolder 和 deleteFolder 方法**

```typescript
// frontend/src/hooks/useRequirementTree.ts
// 在 toggleFolder 方法后添加

const createFolder = useCallback(
  async (productId: string, iterationId: string, data: { name: string; parentId: string | null }) => {
    const folder = await foldersApi.create(productId, iterationId, {
      iteration_id: iterationId,
      name: data.name,
      parent_id: data.parentId,
    });
    // 刷新文件夹列表
    const updated = await foldersApi.getTree(productId, iterationId);
    setFolders((prev) => ({ ...prev, [iterationId]: updated }));
    return folder;
  },
  [],
);

const updateFolder = useCallback(
  async (productId: string, iterationId: string, folderId: string, data: { name?: string }) => {
    const folder = await foldersApi.update(folderId, data);
    // 刷新文件夹列表
    const updated = await foldersApi.getTree(productId, iterationId);
    setFolders((prev) => ({ ...prev, [iterationId]: updated }));
    return folder;
  },
  [],
);

const deleteFolder = useCallback(
  async (productId: string, iterationId: string, folderId: string) => {
    await foldersApi.delete(folderId);
    // 刷新文件夹列表和需求列表（需求可能被移至未分类）
    const [updatedFolders, updatedReqs] = await Promise.all([
      foldersApi.getTree(productId, iterationId),
      productsApi.listRequirements(productId, iterationId),
    ]);
    setFolders((prev) => ({ ...prev, [iterationId]: updatedFolders }));
    setRequirements((prev) => ({ ...prev, [iterationId]: updatedReqs }));
  },
  [],
);
```

**Step 6: 更新 return 对象**

```typescript
// frontend/src/hooks/useRequirementTree.ts
// 修改 return 对象

return {
  products,
  productsLoading,
  expandedProducts,
  iterations,
  iterationsLoading,
  expandedIterations,
  requirements,
  requirementsLoading,
  selectedReqId,
  selectedReqTitle,
  // 新增
  folders,
  foldersLoading,
  expandedFolders,
  toggleProduct,
  toggleIteration,
  toggleFolder,
  loadFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  selectRequirement,
};
```

**Step 7: 验证类型检查通过**

```bash
cd frontend && bunx tsc --noEmit
```

Expected: No errors

**Step 8: 提交**

```bash
git add frontend/src/hooks/useRequirementTree.ts
git commit -m "feat(hooks): extend useRequirementTree with folder support"
```

---

## Task 5: 前端 - 创建 FolderDialog 组件

**Files:**
- Create: `frontend/src/components/ui/FolderDialog.tsx`

**Step 1: 创建组件**

```typescript
// frontend/src/components/ui/FolderDialog.tsx

'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface FolderDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  initialValue?: string;
  title?: string;
  loading?: boolean;
}

export function FolderDialog({
  open,
  onClose,
  onSubmit,
  initialValue = '',
  title = '新建文件夹',
  loading = false,
}: FolderDialogProps) {
  const [name, setName] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setName(initialValue);
    }
  }, [open, initialValue]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-sy-bg-1 border border-sy-border rounded-lg shadow-xl w-[320px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-sy-border">
          <h3 className="text-[13px] font-semibold text-sy-text">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sy-text-3 hover:text-sy-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-4 py-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="文件夹名称"
              className="w-full px-3 py-2 bg-sy-bg-2 border border-sy-border rounded-md text-[12px] text-sy-text placeholder:text-sy-text-3 outline-none focus:border-sy-accent transition-colors"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-sy-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[12px] text-sy-text-2 hover:text-sy-text transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="px-3 py-1.5 text-[12px] font-medium bg-sy-accent text-sy-bg rounded-md hover:bg-sy-accent-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : '确定'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: 验证类型检查通过**

```bash
cd frontend && bunx tsc --noEmit
```

Expected: No errors

**Step 3: 提交**

```bash
git add frontend/src/components/ui/FolderDialog.tsx
git commit -m "feat(ui): add FolderDialog component"
```

---

## Task 6: 前端 - 创建 ContextMenu 组件

**Files:**
- Create: `frontend/src/components/ui/ContextMenu.tsx`

**Step 1: 创建组件**

```typescript
// frontend/src/components/ui/ContextMenu.tsx

'use client';

import { useEffect, useRef, useState } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // 调整位置以避免超出视口
  const adjustedPosition = { ...position };
  if (menuRef.current) {
    const rect = menuRef.current.getBoundingClientRect();
    if (position.x + rect.width > window.innerWidth) {
      adjustedPosition.x = window.innerWidth - rect.width - 8;
    }
    if (position.y + rect.height > window.innerHeight) {
      adjustedPosition.y = window.innerHeight - rect.height - 8;
    }
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[140px] bg-sy-bg-1 border border-sy-border rounded-md shadow-lg py-1"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          type="button"
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
          disabled={item.disabled}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left transition-colors ${
            item.disabled
              ? 'text-sy-text-3 cursor-not-allowed'
              : item.danger
                ? 'text-sy-danger hover:bg-sy-danger/10'
                : 'text-sy-text-2 hover:bg-sy-bg-2'
          }`}
        >
          {item.icon && <span className="w-3.5 h-3.5">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
}

// Hook for managing context menu state
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });

  const showContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };

  const hideContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  return { contextMenu, showContextMenu, hideContextMenu };
}
```

**Step 2: 验证类型检查通过**

```bash
cd frontend && bunx tsc --noEmit
```

Expected: No errors

**Step 3: 提交**

```bash
git add frontend/src/components/ui/ContextMenu.tsx
git commit -m "feat(ui): add ContextMenu component"
```

---

## Task 7: 前端 - 创建 FolderItem 子组件

**Files:**
- Create: `frontend/src/components/folders/FolderItem.tsx`

**Step 1: 创建组件**

```typescript
// frontend/src/components/folders/FolderItem.tsx

'use client';

import { ChevronDown, ChevronRight, FolderOpen, Folder, Plus } from 'lucide-react';
import { useState } from 'react';
import type { Folder } from '@/lib/api';
import { useContextMenu } from '@/components/ui/ContextMenu';

interface FolderItemProps {
  folder: Folder;
  level: number;
  expanded: boolean;
  onToggle: () => void;
  onCreateChild: (parentId: string) => void;
  onRename: (folderId: string, currentName: string) => void;
  onDelete: (folderId: string) => void;
  children?: React.ReactNode;
}

export function FolderItem({
  folder,
  level,
  expanded,
  onToggle,
  onCreateChild,
  onRename,
  onDelete,
  children,
}: FolderItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

  const indentStyle = { paddingLeft: `${12 + level * 12}px` };

  const contextMenuItems = [
    {
      label: '新建子文件夹',
      onClick: () => onCreateChild(folder.id),
    },
    {
      label: '重命名',
      onClick: () => onRename(folder.id, folder.name),
      disabled: folder.is_system,
    },
    {
      label: '删除文件夹',
      onClick: () => onDelete(folder.id),
      disabled: folder.is_system,
      danger: true,
    },
  ];

  return (
    <>
      <div
        className="flex items-center gap-1.5 py-1.5 cursor-pointer hover:bg-sy-bg-2 transition-colors group"
        style={indentStyle}
        onClick={onToggle}
        onContextMenu={showContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-sy-text-3 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-sy-text-3 flex-shrink-0" />
        )}
        {expanded ? (
          <FolderOpen className={`w-3.5 h-3.5 flex-shrink-0 ${folder.is_system ? 'text-sy-text-3' : 'text-sy-accent'}`} />
        ) : (
          <Folder className={`w-3.5 h-3.5 flex-shrink-0 ${folder.is_system ? 'text-sy-text-3' : 'text-sy-accent'}`} />
        )}
        <span
          className={`flex-1 truncate text-[12px] ${folder.is_system ? 'text-sy-text-3 italic' : 'text-sy-text-2'}`}
        >
          {folder.name}
        </span>
        {folder.requirement_count > 0 && (
          <span className="text-[10px] text-sy-text-3 font-mono">{folder.requirement_count}</span>
        )}
        {isHovered && !folder.is_system && folder.level < 5 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCreateChild(folder.id);
            }}
            className="p-0.5 text-sy-text-3 hover:text-sy-accent transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
      {expanded && children}
      {contextMenu.visible && (
        <ContextMenu
          items={contextMenuItems}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={hideContextMenu}
        />
      />
    </>
  );
}
```

**Step 2: 验证类型检查通过**

```bash
cd frontend && bunx tsc --noEmit
```

Expected: No errors

**Step 3: 提交**

```bash
git add frontend/src/components/folders/FolderItem.tsx
git commit -m "feat(folders): add FolderItem component"
```

---

## Task 8: 前端 - 集成文件夹树到 AnalysisLeftPanel

**Files:**
- Modify: `frontend/src/app/(main)/analysis/_components/AnalysisLeftPanel.tsx`

**Step 1: 添加必要的 imports**

```typescript
// frontend/src/app/(main)/analysis/_components/AnalysisLeftPanel.tsx
// 在文件顶部 imports 中添加

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { FolderDialog } from '@/components/ui/FolderDialog';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { FolderItem } from '@/components/folders/FolderItem';
import type { Folder } from '@/lib/api';
```

**Step 2: 添加状态和对话框处理逻辑**

在组件内部，状态声明处添加：

```typescript
// frontend/src/app/(main)/analysis/_components/AnalysisLeftPanel.tsx
// 在组件内部的 useState 声明后添加

const [folderDialog, setFolderDialog] = useState<{
  open: boolean;
  mode: 'create' | 'rename';
  parentId: string | null;
  folderId?: string;
  initialValue?: string;
}>({ open: false, mode: 'create', parentId: null });

const [loading, setLoading] = useState(false);
```

**Step 3: 添加文件夹操作处理函数**

```typescript
// frontend/src/app/(main)/analysis/_components/AnalysisLeftPanel.tsx
// 在状态声明后添加

const handleCreateFolder = (parentId: string | null) => {
  setFolderDialog({
    open: true,
    mode: 'create',
    parentId,
  });
};

const handleRenameFolder = (folderId: string, currentName: string) => {
  setFolderDialog({
    open: true,
    mode: 'rename',
    parentId: null,
    folderId,
    initialValue: currentName,
  });
};

const handleDeleteFolder = async (folderId: string) => {
  if (!confirm('确定要删除此文件夹吗？文件夹内的需求将移至「未分类」。')) return;
  // 需要从 hook 获取 productId 和 iterationId
  // 这里简化处理，实际需要追踪当前选中的迭代
};

const handleFolderSubmit = async (name: string) => {
  setLoading(true);
  try {
    if (folderDialog.mode === 'create') {
      // await createFolder(productId, iterationId, { name, parentId: folderDialog.parentId })
    } else {
      // await updateFolder(productId, iterationId, folderDialog.folderId!, { name })
    }
    setFolderDialog({ open: false, mode: 'create', parentId: null });
  } catch (error) {
    console.error('Failed to save folder:', error);
  } finally {
    setLoading(false);
  }
};
```

**Step 4: 渲染文件夹树**

这部分需要较大改动，将原有的需求列表渲染改为包含文件夹的树形结构。由于改动较大，建议在实现时参考现有代码结构逐步修改。

核心逻辑：
1. 在迭代展开后，渲染该迭代的文件夹树
2. 每个文件夹可展开/折叠，显示子文件夹和需求
3. 未归类需求（folder_id 为 null）显示在文件夹列表末尾

**Step 5: 验证类型检查通过**

```bash
cd frontend && bunx tsc --noEmit
```

**Step 6: 提交**

```bash
git add frontend/src/app/(main)/analysis/_components/AnalysisLeftPanel.tsx
git commit -m "feat(analysis): integrate folder tree into AnalysisLeftPanel"
```

---

## Task 9: 前端 - 集成文件夹树到 RequirementNav

**Files:**
- Modify: `frontend/src/app/(main)/workbench/_components/RequirementNav.tsx`

**Step 1-4: 同 Task 8 类似**

参考 Task 8 的步骤，将文件夹树集成到 RequirementNav 组件中。

**Step 5: 验证类型检查通过**

```bash
cd frontend && bunx tsc --noEmit
```

**Step 6: 提交**

```bash
git add frontend/src/app/(main)/workbench/_components/RequirementNav.tsx
git commit -m "feat(workbench): integrate folder tree into RequirementNav"
```

---

## Task 10: 测试 - 前端单元测试

**Files:**
- Create: `frontend/src/components/folders/FolderItem.test.tsx`

**Step 1: 编写测试**

```typescript
// frontend/src/components/folders/FolderItem.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FolderItem } from './FolderItem';

const mockFolder = {
  id: 'folder-1',
  iteration_id: 'iter-1',
  parent_id: null,
  name: '用户模块',
  sort_order: 0,
  level: 1,
  is_system: false,
  requirement_count: 5,
  children: [],
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('FolderItem', () => {
  it('renders folder name and count', () => {
    render(
      <FolderItem
        folder={mockFolder}
        level={1}
        expanded={false}
        onToggle={() => {}}
        onCreateChild={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    );

    expect(screen.getByText('用户模块')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(
      <FolderItem
        folder={mockFolder}
        level={1}
        expanded={false}
        onToggle={onToggle}
        onCreateChild={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('用户模块'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('disables delete for system folders', () => {
    const systemFolder = { ...mockFolder, is_system: true, name: '未分类' };
    const onDelete = vi.fn();

    render(
      <FolderItem
        folder={systemFolder}
        level={1}
        expanded={false}
        onToggle={() => {}}
        onCreateChild={() => {}}
        onRename={() => {}}
        onDelete={onDelete}
      />,
    );

    // 右键打开菜单后，删除按钮应该被禁用
    // 这里需要根据实际实现的右键菜单进行测试
  });
});
```

**Step 2: 运行测试**

```bash
cd frontend && bun test src/components/folders/FolderItem.test.tsx
```

**Step 3: 提交**

```bash
git add frontend/src/components/folders/FolderItem.test.tsx
git commit -m "test(folders): add FolderItem unit tests"
```

---

## 最终提交

完成所有任务后，运行完整测试套件并创建汇总提交：

```bash
cd backend && uv run pytest -v
cd frontend && bun test && bunx tsc --noEmit
git add -A
git commit -m "feat: implement requirement folders (Phase 1)

- Auto-create 'Uncategorized' folder for new iterations
- Prevent deletion of system folders
- Add Folder types and foldersApi
- Extend useRequirementTree hook with folder support
- Add FolderDialog, ContextMenu, FolderItem components
- Integrate folder tree into AnalysisLeftPanel and RequirementNav

Refs: docs/plans/2026-03-22-requirement-folders-design.md"
```

---

## 实现清单总结

| Task | 描述 | 状态 |
|------|------|------|
| 1 | 后端：新建迭代自动创建「未分类」 | □ |
| 2 | 后端：系统文件夹删除保护 | □ |
| 3 | 前端：添加 Folder 类型和 API | □ |
| 4 | 前端：扩展 useRequirementTree Hook | □ |
| 5 | 前端：创建 FolderDialog 组件 | □ |
| 6 | 前端：创建 ContextMenu 组件 | □ |
| 7 | 前端：创建 FolderItem 子组件 | □ |
| 8 | 前端：集成文件夹树到 AnalysisLeftPanel | □ |
| 9 | 前端：集成文件夹树到 RequirementNav | □ |
| 10 | 测试：前端单元测试 | □ |
