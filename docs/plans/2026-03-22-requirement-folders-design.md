# 需求文件夹功能设计

> 创建日期: 2026-03-22
> 状态: 已批准
> 方案: 分阶段实现 (Phase 1 基础功能优先)

## 1. 概述

为需求管理添加多层级文件夹组织能力，允许用户按自定义结构分类管理需求文档。

### 1.1 目标

- 支持最多 5 层深度的文件夹结构
- 提供完整的 CRUD 操作（新建、重命名、删除、展开/折叠）
- 新建迭代时自动创建「未分类」系统文件夹
- 为后续拖拽功能预留扩展空间

### 1.2 现状

| 层级 | 状态 | 说明 |
|------|------|------|
| 数据模型 | ✅ 已实现 | `RequirementFolder` 支持多层级 |
| API 端点 | ✅ 已实现 | 树查询、CRUD 全部就绪 |
| 前端展示 | ❌ 未实现 | 需求是平铺在迭代下的 |

## 2. 数据流设计

```
┌─────────────────────────────────────────────────────────────┐
│                      前端组件层级                            │
├─────────────────────────────────────────────────────────────┤
│  AnalysisLeftPanel / RequirementNav                         │
│    └── useRequirementTree hook (扩展)                       │
│          ├── products[]                                     │
│          ├── iterations[productId][]                        │
│          ├── folders[iterationId][]  ← 新增                 │
│          └── requirements[iterationId][] (含 folder_id)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API 调用                               │
├─────────────────────────────────────────────────────────────┤
│  GET  /products/{pid}/iterations/{iid}/folders/tree         │
│  POST /products/{pid}/iterations/{iid}/folders              │
│  PATCH /folders/{folderId}                                  │
│  DELETE /folders/{folderId}                                 │
│  PATCH /requirements/{reqId}  (更新 folder_id)              │
└─────────────────────────────────────────────────────────────┘
```

## 3. 前端 Hook 扩展

### 3.1 类型定义

```typescript
interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  level: number;
  is_system: boolean;
  requirement_count: number;
  children: Folder[];
}
```

### 3.2 新增状态和方法

```typescript
// useRequirementTree.ts 扩展

// 新增状态
const [folders, setFolders] = useState<Record<string, Folder[]>>({});
const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
const [foldersLoading, setFoldersLoading] = useState<Record<string, boolean>>({});

// 新增方法
const loadFolders = useCallback(async (productId: string, iterationId: string) => {
  // GET /products/{pid}/iterations/{iid}/folders/tree
}, []);

const createFolder = useCallback(async (data: {
  iterationId: string;
  parentId: string | null;
  name: string;
}) => {
  // POST /products/{pid}/iterations/{iid}/folders
}, []);

const updateFolder = useCallback(async (folderId: string, data: { name?: string }) => {
  // PATCH /folders/{folderId}
}, []);

const deleteFolder = useCallback(async (folderId: string) => {
  // DELETE /folders/{folderId}
}, []);

const toggleFolder = useCallback((folderId: string) => {
  // 展开/折叠
}, []);

const moveRequirementToFolder = useCallback(async (reqId: string, folderId: string | null) => {
  // PATCH /requirements/{reqId} with folder_id
}, []);
```

## 4. UI 组件设计

### 4.1 树形结构渲染

```
📁 产品 A                    ← product (展开)
  📁 迭代 v1.0               ← iteration (展开)
    📂 未分类 (3)            ← 系统文件夹 (is_system=true)
      📄 需求 1
      📄 需求 2
    📂 用户模块 (5)          ← 用户文件夹 level=1
      📂 登录功能 (2)        ← 子文件夹 level=2
        📄 需求 3
        📄 需求 4
      📄 需求 5
    📂 支付模块 (3)          ← 用户文件夹 level=1
      📄 需求 6
```

### 4.2 渲染逻辑

```typescript
// 伪代码
iteration.expanded ?
  folders.map(folder => renderFolder(folder, level=1))
  + requirements.filter(r => !r.folder_id).map(renderRequirement)
: null

renderFolder(folder, level):
  <FolderItem folder={folder} indent={level * 12} />
  folder.expanded ?
    folder.children.map(child => renderFolder(child, level+1))
    + requirements.filter(r => r.folder_id === folder.id).map(renderRequirement)
  : null
```

### 4.3 样式规范

| 元素 | 样式 |
|------|------|
| 文件夹图标 | `FolderOpen`（展开）/ `Folder`（折叠） |
| 系统文件夹 | 灰色图标 + 斜体文字 |
| 缩进 | 每层 `pl-4`（12px） |
| 最大层级 | 5 层（level 1-5） |

## 5. 新建入口设计

### 5.1 顶部工具栏按钮

```
┌─────────────────────────────────────────────────────┐
│ 🔍 搜索需求...                        [+ 新建文件夹] │
└─────────────────────────────────────────────────────┘
```

- 位置：搜索栏右侧
- 点击后弹出对话框，选择父文件夹 + 输入名称

### 5.2 行内 hover 按钮

```
📁 用户模块 (5)                    [+]
│  └ hover 时显示 + 按钮，点击创建子文件夹
```

- 位置：文件夹行右侧
- hover 时显示，点击直接创建子文件夹

### 5.3 右键菜单

```
📁 用户模块 (5)     ← 右键
┌──────────────────────┐
│ 📂 新建子文件夹      │
│ ✏️ 重命名            │
│ 🗑️ 删除文件夹        │
└──────────────────────┘
```

- 系统文件夹：「删除」选项置灰禁用
- 有子文件夹/需求时：删除前需确认

## 6. 后端改动

### 6.1 新建迭代自动创建「未分类」

```python
# backend/app/modules/products/service.py

class IterationService:
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
            is_system=True,  # 标记为系统文件夹
        )
        self.session.add(uncategorized)

        await self.session.commit()
        await self.session.refresh(iteration)
        return iteration
```

### 6.2 系统文件夹保护规则

- 系统文件夹不可删除
- 系统文件夹不可重命名
- 删除其他文件夹时，内部需求移至「未分类」

## 7. 影响模块

| 模块 | 改动内容 | 复杂度 |
|------|----------|--------|
| **后端** |  |  |
| `products/service.py` | 新建迭代时自动创建「未分类」 | 低 |
| **前端** |  |  |
| `hooks/useRequirementTree.ts` | 添加 folders 状态和方法 | 中 |
| `lib/api.ts` | 添加 folders API 调用方法 | 低 |
| `analysis/_components/AnalysisLeftPanel.tsx` | 渲染文件夹树 + 新建入口 | 中 |
| `workbench/_components/RequirementNav.tsx` | 渲染文件夹树 + 新建入口 | 中 |
| `requirements/page.tsx` | 渲染文件夹树（优先级低） | 中 |
| `components/ui/FolderDialog.tsx` | 新建/重命名文件夹对话框 | 低 |
| `components/ui/ContextMenu.tsx` | 右键菜单组件 | 低 |

## 8. 实现清单

### Phase 1 - 基础文件夹功能

```
□ 后端：IterationService.create_iteration 自动创建「未分类」
□ 前端：lib/api.ts 添加 folders API
□ 前端：useRequirementTree hook 扩展
□ 前端：FolderDialog 组件（新建/重命名）
□ 前端：ContextMenu 组件（右键菜单）
□ 前端：AnalysisLeftPanel 集成文件夹树
□ 前端：RequirementNav 集成文件夹树
□ 测试：单元测试 + 集成测试
```

### Phase 2 - 拖拽功能（后续）

```
□ 引入 @dnd-kit 拖拽库
□ 实现文件夹排序拖拽
□ 实现需求跨文件夹移动
```

### Phase 3 - 多入口优化（后续）

```
□ 右键上下文菜单完善
□ 行内 hover 按钮优化
□ 顶部工具栏按钮优化
```

## 9. 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 深层嵌套影响性能 | 限制最多 5 层，懒加载子文件夹 |
| 系统文件夹误删 | 前端 + 后端双重校验 |
| 大量需求时加载慢 | 虚拟滚动 + 分页加载 |
