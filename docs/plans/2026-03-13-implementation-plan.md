# Sisyphus-Y v2.0 全面重构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 按照 `docs/plans/2026-03-13-full-review-design.md` 中已确认的 50+ 设计决策，对 Sisyphus-Y 平台进行全面重构。

**Architecture:** 分 10 个 Phase 按依赖顺序执行。前端从 Ant Design 全面迁移到 shadcn/ui + React Hook Form + Zod + Sonner；后端重构 AI 配置系统为多模型列表、重写 System Prompt、优化 RAG 管道；重构菜单（13→9项）和页面合并（分析台/工作台/用例库）。

**Tech Stack:**
- Frontend: Next.js 16 + TypeScript + Tailwind CSS (sy-* tokens) + shadcn/ui + Sonner + React Hook Form + Zod + Zustand + Recharts + React Flow
- Backend: FastAPI + Python 3.12 + SQLAlchemy 2.0 async + asyncpg + Alembic + xmindparser
- Package managers: bun (frontend), uv (backend)
- Design reference: `docs/plans/2026-03-13-full-review-design.md`

---

## Phase 1: 前端基础设施 — 依赖替换与组件库搭建

> 目标：移除 Ant Design，安装新依赖，搭建基础组件

### Task 1.1: 安装新前端依赖

**Files:**
- Modify: `frontend/package.json`

**Step 1: 安装新依赖**

```bash
cd frontend
bun add sonner react-hook-form @hookform/resolvers zod nprogress
bun add -d @types/nprogress
```

**Step 2: 移除 Ant Design 依赖**

```bash
cd frontend
bun remove antd @ant-design/icons
```

**Step 3: 验证 package.json 中零 antd 依赖**

```bash
grep -i "antd\|ant-design" frontend/package.json
```

Expected: 无输出

**Step 4: Commit**

```bash
git add frontend/package.json frontend/bun.lock
git commit -m "chore: replace antd with sonner, react-hook-form, zod, nprogress

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 1.2: 删除 AntdProvider 并配置 Sonner

**Files:**
- Delete: `frontend/src/components/providers/AntdProvider.tsx`
- Modify: `frontend/src/app/layout.tsx` (root layout — remove AntdProvider, add Sonner Toaster)

**Step 1: 删除 AntdProvider.tsx**

```bash
rm frontend/src/components/providers/AntdProvider.tsx
```

**Step 2: 在根 layout.tsx 中移除 AntdProvider 引用，添加 Sonner Toaster**

在 `frontend/src/app/layout.tsx` 中：
- 移除 `import { AntdProvider } from '@/components/providers/AntdProvider'`
- 移除 JSX 中的 `<AntdProvider>...</AntdProvider>` 包裹
- 添加 `import { Toaster } from 'sonner'`
- 在 body 内添加 `<Toaster position="top-right" theme="dark" richColors closeButton />`

**Step 3: 全局搜索确认无 AntdProvider 残留**

```bash
grep -r "AntdProvider\|antd" frontend/src/ --include="*.tsx" --include="*.ts" -l
```

Expected: 仅剩 products/page.tsx 和 iterations/page.tsx（Task 1.4/1.5 处理）

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove AntdProvider, add Sonner Toaster

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 1.3: 搭建基础组件库 — DataTable, Form, EmptyState, ConfirmDialog

**Files:**
- Create: `frontend/src/components/ui/DataTable.tsx`
- Create: `frontend/src/components/ui/Skeleton.tsx`
- Modify: `frontend/src/components/ui/EmptyState.tsx` (已存在，按规范补充)
- Modify: `frontend/src/components/ui/ConfirmDialog.tsx` (已存在，按规范补充)

**Step 1: 创建 DataTable 组件**

创建 `frontend/src/components/ui/DataTable.tsx`：
- 基于 Tailwind 样式的自定义表格
- Props: `columns`, `data`, `loading`, `emptyText`, `onRowClick`, `selectable`, `selectedKeys`, `onSelectChange`
- 表头样式: `bg-sy-bg-2 text-sy-text-2 text-[12px] font-medium uppercase tracking-wider`
- 行样式: `border-b border-sy-border hover:bg-sy-bg-2/50 transition-colors`
- 选择列: 复选框
- Loading 状态: Skeleton 行
- 空状态: 使用 EmptyState 组件

**Step 2: 创建 Skeleton 组件**

创建 `frontend/src/components/ui/Skeleton.tsx`：
- Props: `rows`, `className`
- 每行随机宽度 (40%~90%)
- 动画: `animate-pulse bg-sy-bg-3 rounded`

**Step 3: 增强 EmptyState 组件**

按设计规范修改 `frontend/src/components/ui/EmptyState.tsx`：
- Props: `icon` (LucideIcon), `title`, `description`, `actionLabel`, `onAction`, `variant` ('default' | 'search')
- 标准结构: icon(48px, text-sy-text-3) + 暂无[对象] + 引导文案 + 按钮
- search variant: 显示「清除筛选」按钮，不显示新建

**Step 4: 增强 ConfirmDialog 组件**

按设计规范修改 `frontend/src/components/ui/ConfirmDialog.tsx`：
- Props: `open`, `onConfirm`, `onCancel`, `title`, `description`, `variant` ('default' | 'danger' | 'cascade')
- danger variant: 确认按钮 `bg-sy-danger text-white`
- cascade variant: 详细说明模板，确认按钮文字「确认删除」
- Undo toast: 删除确认后触发 `toast('已删除...', { action: { label: '撤销', onClick: onUndo }, duration: 5000 })`

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add DataTable, Skeleton, enhance EmptyState & ConfirmDialog

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 1.4: 重写 Products 页面 — 移除 antd

**Files:**
- Rewrite: `frontend/src/app/(main)/products/page.tsx`

**Step 1: 完全重写 Products 页面**

移除所有 antd 导入 (`Table`, `Form`, `Modal`, `message`, `Popconfirm`, `Skeleton`)。
使用新组件替代：
- `DataTable` 替代 antd `Table`
- React Hook Form + Zod 替代 antd `Form`
- shadcn/ui `Dialog` 替代 antd `Modal`
- `ConfirmDialog` 替代 antd `Popconfirm`
- Sonner `toast` 替代 antd `message`
- `Skeleton` 组件替代 antd `Skeleton`

保留现有的数据查询逻辑 (React Query hooks)。

**Step 2: 验证无 antd 导入**

```bash
grep -n "antd\|ant-design" frontend/src/app/\(main\)/products/page.tsx
```

Expected: 无输出

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rewrite Products page without antd

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 1.5: 重写 Iterations 页面 — 移除 antd

**Files:**
- Rewrite: `frontend/src/app/(main)/iterations/page.tsx`

**Step 1: 完全重写 Iterations 页面**

与 Task 1.4 相同策略。额外处理:
- antd `DatePicker` → 自定义日期输入 (HTML date input + Tailwind 样式) 或 shadcn/ui DatePicker
- antd `Empty` → `EmptyState` 组件
- antd `Input` → 标准 `<input>` + Tailwind 样式

**Step 2: 验证无 antd 导入**

```bash
grep -rn "antd\|ant-design" frontend/src/ --include="*.tsx" --include="*.ts"
```

Expected: 零结果（全局零 antd）

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rewrite Iterations page without antd, zero antd remaining

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 1.6: 清理硬编码颜色 — 全局替换

**Files:**
- Modify: 所有含 `style={{ color: 'var(--xxx)' }}` 的 .tsx 文件

**Step 1: 查找所有硬编码 style 颜色**

```bash
grep -rn "style={{" frontend/src/ --include="*.tsx" | grep -iE "color|background" | grep -v "backgroundImage"
```

**Step 2: 逐一替换为 Tailwind class**

替换规则：
- `style={{ color: 'var(--accent)' }}` → `className="text-sy-accent"`
- `style={{ color: 'var(--text2)' }}` → `className="text-sy-text-2"`
- `style={{ color: 'var(--text3)' }}` → `className="text-sy-text-3"`
- `style={{ color: 'var(--red)' }}` → `className="text-sy-danger"`
- `style={{ fontSize: 12, color: 'var(--text2)' }}` → `className="text-xs text-sy-text-2"`
- `style={{ fontSize: 11 }}` → `className="text-[11px]"`

**Step 3: 验证零硬编码颜色**

```bash
grep -rn "style={{" frontend/src/ --include="*.tsx" | grep -iE "color.*var\(--|rgba|#[0-9a-f]" | grep -v "backgroundImage"
```

Expected: 零结果

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: replace all hardcoded colors with sy-* Tailwind tokens

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 1.7: 配置 NProgress 路由进度条

**Files:**
- Create: `frontend/src/components/providers/NavigationProgress.tsx`
- Modify: `frontend/src/app/layout.tsx` (添加 NavigationProgress)

**Step 1: 创建 NavigationProgress 组件**

```tsx
'use client';
import { usePathname } from 'next/navigation';
import NProgress from 'nprogress';
import { useEffect } from 'react';
import 'nprogress/nprogress.css';

NProgress.configure({ showSpinner: false, trickleSpeed: 200 });

export function NavigationProgress() {
  const pathname = usePathname();
  useEffect(() => {
    NProgress.done();
    return () => { NProgress.start(); };
  }, [pathname]);
  return null;
}
```

**Step 2: 添加 NProgress 样式覆盖**

在全局 CSS 中覆盖 NProgress 颜色为 `sy-accent`:
```css
#nprogress .bar { background: #00d9a3; height: 2px; }
#nprogress .peg { box-shadow: 0 0 10px #00d9a3, 0 0 5px #00d9a3; }
```

**Step 3: 在 root layout 中引入**

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add NProgress route transition progress bar

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Phase 2: 后端数据模型重构

> 目标：重构 AI 配置、知识库、模板库、目录管理等核心数据模型

### Task 2.1: 重构 AI 配置模型 — 多模型列表

**Files:**
- Rewrite: `backend/app/modules/ai_config/models.py`
- Rewrite: `backend/app/modules/ai_config/schemas.py`
- Create: Alembic migration

**Step 1: 重写 models.py**

新模型 `ModelConfiguration`:
```python
class ModelConfiguration(BaseModel):
    __tablename__ = "model_configurations"

    name: Mapped[str]                    # 配置名称
    provider: Mapped[str]                # zhipu/dashscope/deepseek/kimi/openai/ollama/custom
    api_key_encrypted: Mapped[str]       # 加密存储
    base_url: Mapped[str]                # API base URL
    model_name: Mapped[str]              # 如 glm-5, qwen-max
    purpose_tags: Mapped[list] = mapped_column(JSONB, default=list)  # ["analysis","case_gen","embedding","general"]
    temperature: Mapped[float | None]
    max_tokens: Mapped[int | None]
    notes: Mapped[str | None]
    is_enabled: Mapped[bool] = mapped_column(default=True)
    sort_order: Mapped[int] = mapped_column(default=0)
```

新模型 `PromptConfiguration`:
```python
class PromptConfiguration(BaseModel):
    __tablename__ = "prompt_configurations"

    module: Mapped[str]                  # diagnosis/scene_map/generation/diff/knowledge/general
    system_prompt: Mapped[str]           # 当前 System Prompt
    is_customized: Mapped[bool] = mapped_column(default=False)
    version: Mapped[int] = mapped_column(default=1)
```

新模型 `PromptHistory`:
```python
class PromptHistory(BaseModel):
    __tablename__ = "prompt_histories"

    prompt_config_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("prompt_configurations.id"))
    version: Mapped[int]
    system_prompt: Mapped[str]
    changed_at: Mapped[datetime]
```

**Step 2: 重写 schemas.py**

Pydantic schemas:
- `ModelConfigCreate`: name, provider, api_key, base_url, model_name, purpose_tags, temperature?, max_tokens?, notes?
- `ModelConfigUpdate`: 所有字段 optional
- `ModelConfigResponse`: 含 id, created_at, is_enabled (api_key 脱敏: `"sk-****xxxx"`)
- `PromptConfigResponse`: module, system_prompt, is_customized, version
- `PromptConfigUpdate`: system_prompt
- `PromptHistoryResponse`: version, system_prompt, changed_at

**Step 3: 生成 Alembic migration**

```bash
cd backend
uv run alembic revision --autogenerate -m "restructure ai config to multi-model list and prompt management"
```

**Step 4: 运行 migration**

```bash
uv run alembic upgrade head
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: restructure AI config model to multi-model list + prompt management

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2.2: 增强知识库模型 — 分类、版本、手动条目

**Files:**
- Modify: `backend/app/modules/knowledge/models.py`
- Modify: `backend/app/modules/knowledge/schemas.py`
- Create: Alembic migration

**Step 1: 修改 KnowledgeDocument 模型**

添加字段：
```python
category: Mapped[str] = mapped_column(default="business")  # standard/business/historical/technical
entry_type: Mapped[str] = mapped_column(default="file")     # file/manual
is_active: Mapped[bool] = mapped_column(default=True)       # 版本管理用
```

**Step 2: 更新 schemas**

添加 `KnowledgeEntryCreate`（手动条目）: title, category, content, tags
添加 `category` 过滤到查询 schema

**Step 3: 生成并运行 migration**

**Step 4: Commit**

---

### Task 2.3: 增强模板库模型 — Prompt 模板 + 用例结构模板

**Files:**
- Modify: `backend/app/modules/templates/models.py`
- Modify: `backend/app/modules/templates/schemas.py`
- Create: Alembic migration

**Step 1: 增加 template_type 字段**

```python
template_type: Mapped[str] = mapped_column(default="case_structure")  # prompt/case_structure
applicable_module: Mapped[str | None]  # analysis/generation/diff (仅 prompt 类型)
```

**Step 2: 更新 schemas 支持两种模板类型**

**Step 3: 生成并运行 migration**

**Step 4: Commit**

---

### Task 2.4: 增强用例模型 — 目录管理

**Files:**
- Create: `backend/app/modules/testcases/` 中新增 folder 相关逻辑
- Modify: `backend/app/modules/testcases/models.py`
- Create: Alembic migration

**Step 1: 添加 TestCaseFolder 模型**

```python
class TestCaseFolder(BaseModel):
    __tablename__ = "test_case_folders"

    name: Mapped[str]
    parent_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("test_case_folders.id"))
    product_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("products.id"))
    iteration_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("iterations.id"))
    requirement_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("requirements.id"))
    sort_order: Mapped[int] = mapped_column(default=0)
    is_system: Mapped[bool] = mapped_column(default=False)  # 系统自动生成的目录
    depth: Mapped[int] = mapped_column(default=0)  # 0/1/2, max 3 levels
```

**Step 2: 在 TestCase 模型中添加 folder_id**

```python
folder_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("test_case_folders.id"))
```

**Step 3: 生成并运行 migration**

**Step 4: Commit**

---

### Task 2.5: 增强回收站 — 30 天自动清理

**Files:**
- Modify: `backend/app/modules/recycle/models.py`
- Modify: `backend/app/modules/recycle/service.py`

**Step 1: 在 RecycleItem 模型中确保有 deleted_at 和 expires_at 字段**

```python
expires_at: Mapped[datetime] = mapped_column(
    default=lambda: datetime.utcnow() + timedelta(days=30)
)
object_type: Mapped[str]  # requirement/testcase/knowledge_doc
original_path: Mapped[str | None]  # 原目录路径
```

**Step 2: 在 service 中添加清理方法**

```python
async def cleanup_expired(self, db: AsyncSession) -> int:
    """删除过期 30 天的回收站记录"""
    result = await db.execute(
        delete(RecycleItem).where(RecycleItem.expires_at < datetime.utcnow())
    )
    await db.commit()
    return result.rowcount
```

**Step 3: 添加 Celery 定时任务 (每日执行)**

**Step 4: Commit**

---

### Task 2.6: 添加导入任务模型 — XMind/Excel/CSV/JSON 导入

**Files:**
- Modify: `backend/app/modules/import_clean/models.py` (检查是否已有 import_jobs)
- Modify: `backend/app/modules/import_clean/schemas.py`

**Step 1: 确认/增强 ImportJob 模型**

确保包含：
```python
source_format: Mapped[str]  # excel/csv/json/xmind
target_folder_id: Mapped[uuid.UUID | None]
duplicate_strategy: Mapped[dict | None]  # JSONB: {case_id: "overwrite"|"skip"|"rename"}
field_mapping: Mapped[dict | None]  # JSONB: {file_column: case_field}
preview_data: Mapped[dict | None]  # JSONB: 前 5 条预览
```

**Step 2: 更新 schemas**

**Step 3: Commit**

---

## Phase 3: 后端 API 重构

> 目标：重写 AI 配置 API、添加 Prompt 管理 API、增强知识库/导入导出/目录管理 API

### Task 3.1: 重写 AI 配置 API — 多模型 CRUD

**Files:**
- Rewrite: `backend/app/modules/ai_config/router.py`
- Rewrite: `backend/app/modules/ai_config/service.py`

**Step 1: 重写 router.py**

```python
# CRUD for model configurations
POST   /api/ai-config/models          # 创建模型配置
GET    /api/ai-config/models          # 获取所有模型配置列表
GET    /api/ai-config/models/{id}     # 获取单个配置
PUT    /api/ai-config/models/{id}     # 更新配置
DELETE /api/ai-config/models/{id}     # 删除配置
POST   /api/ai-config/models/{id}/test  # 测试连接
PATCH  /api/ai-config/models/{id}/toggle  # 启用/禁用

# Prompt management
GET    /api/ai-config/prompts         # 获取所有模块 Prompt
PUT    /api/ai-config/prompts/{module}  # 更新指定模块 Prompt
POST   /api/ai-config/prompts/{module}/reset  # 重置为默认
GET    /api/ai-config/prompts/{module}/history  # 获取修改历史
POST   /api/ai-config/prompts/{module}/rollback/{version}  # 回滚到指定版本

# Provider presets
GET    /api/ai-config/providers       # 获取 7 个预设提供商信息
```

**Step 2: 重写 service.py**

关键方法:
- `create_model_config()`: 创建时加密 API Key
- `test_connection()`: 调用 provider API 验证连通性
- `get_active_model_for_purpose()`: 按用途标签查找启用的模型
- `update_prompt()`: 保存前记录历史 (PromptHistory)
- `reset_prompt()`: 从 `app/ai/prompts.py` 加载默认值
- `get_prompt_history()`: 返回最近 5 条历史

**Step 3: 更新 `app/ai/llm_client.py`**

修改 LLM 客户端从新的 `ModelConfiguration` 表读取配置，替代旧的环境变量/单一配置方式。

**Step 4: 更新 `app/ai/stream_adapter.py`**

支持从 `ModelConfiguration` 动态加载 provider/model/api_key/base_url。

**Step 5: Commit**

---

### Task 3.2: 增强知识库 API — 分类、分块预览、手动条目、版本

**Files:**
- Modify: `backend/app/modules/knowledge/router.py`
- Modify: `backend/app/modules/knowledge/service.py`

**Step 1: 新增 API 端点**

```python
GET    /api/knowledge?category=xxx    # 按分类筛选
POST   /api/knowledge/manual          # 新建手动知识条目
GET    /api/knowledge/{id}/chunks     # 获取分块预览
DELETE /api/knowledge/{id}/chunks/{chunk_id}  # 删除单个 chunk
POST   /api/knowledge/{id}/version    # 上传新版本
GET    /api/knowledge/{id}/versions   # 获取版本历史
POST   /api/knowledge/{id}/activate   # 激活旧版本
```

**Step 2: 实现 service 方法**

- `create_manual_entry()`: 保存 → 向量化入库
- `get_chunks()`: 从 Qdrant 查询指定文档的所有 chunk
- `upload_new_version()`: 旧版本 is_active=False, 新版本入库, 清理超出 3 个的旧版本
- `activate_version()`: 切换活跃版本, 更新向量索引

**Step 3: Commit**

---

### Task 3.3: 增强用例 API — 目录管理 + 导入 + 导出

**Files:**
- Modify: `backend/app/modules/testcases/router.py`
- Modify: `backend/app/modules/testcases/service.py`
- Modify: `backend/app/modules/export/router.py`
- Modify: `backend/app/modules/export/service.py`
- Modify: `backend/app/modules/import_clean/router.py`

**Step 1: 目录管理 API**

```python
POST   /api/testcases/folders              # 创建目录
GET    /api/testcases/folders/tree          # 获取目录树
PUT    /api/testcases/folders/{id}          # 重命名
DELETE /api/testcases/folders/{id}          # 删除 (级联软删除用例)
PATCH  /api/testcases/folders/{id}/sort     # 更新排序
PATCH  /api/testcases/folders/{id}/move     # 移动到其他父目录
PATCH  /api/testcases/batch-move            # 批量移动用例到目标目录
```

**Step 2: 导入 API**

```python
POST   /api/import/upload           # 上传文件 → 返回解析预览 (前5条)
POST   /api/import/detect-mapping   # 检测字段映射
POST   /api/import/check-duplicates # 检测重复
POST   /api/import/execute          # 执行导入
GET    /api/import/templates/{format}  # 下载导入模板
```

添加 XMind 解析: `pip install xmindparser` (在 pyproject.toml 中)

**Step 3: 导出 API**

```python
POST   /api/export/cases            # 导出用例 (body: format, scope, fields, folder_id, etc.)
```

支持 4 种格式: Excel, CSV, XMind, Markdown

**Step 4: Commit**

---

### Task 3.4: 仪表盘 API — 统计卡片 + 图表数据

**Files:**
- Modify: `backend/app/modules/dashboard/router.py`
- Modify: `backend/app/modules/dashboard/service.py`

**Step 1: 新增 API 端点**

```python
GET /api/dashboard/overview?iteration_id=xxx
# 返回: stat_cards (4个), trend_chart (6迭代), source_chart, activities (5条), pending_items

GET /api/dashboard/quality?iteration_id=xxx
# 返回: quality_distribution, ai_efficiency, coverage_health
```

**Step 2: 实现统计聚合查询**

- `stat_cards`: 从 requirements/test_cases/coverage_matrices 表聚合
- `trend_chart`: 按迭代分组查询最近 6 个迭代的统计
- `pending_items`: 查询高风险遗漏 + 需重写用例 + 低覆盖率

**Step 3: Commit**

---

### Task 3.5: 全局搜索 API

**Files:**
- Modify: `backend/app/modules/search/router.py`
- Modify: `backend/app/modules/search/service.py`

**Step 1: 实现搜索端点**

```python
GET /api/search?q=关键词&limit=20
# 返回: { requirements: [...], testcases: [...] }
```

使用 PostgreSQL `ILIKE` 全文搜索:
- 需求: title + content_ast (提取文本)
- 用例: title + steps (提取 action 文本)

**Step 2: Commit**

---

### Task 3.6: 需求 Diff API — 版本发布 + 影响分析

**Files:**
- Modify: `backend/app/modules/diff/router.py`
- Modify: `backend/app/modules/diff/service.py`
- Modify: `backend/app/modules/products/router.py` (添加发布新版本端点)

**Step 1: 需求版本发布 API**

```python
POST /api/requirements/{id}/publish
# body: { version_note: "..." }
# 创建 RequirementVersion + 触发 Diff 分析
```

**Step 2: Diff + 影响分析结果 API**

```python
GET /api/diff/requirement/{id}/latest    # 获取最新 Diff
GET /api/diff/requirement/{id}/affected  # 获取受影响用例列表
POST /api/diff/push-to-workbench         # 批量推送「需重写」用例
```

**Step 3: 更新 `backend/app/engine/diff/impact_analyzer.py`**

自动标记受影响用例状态: `needs_rewrite` / `needs_review` / `unaffected`

**Step 4: Commit**

---

### Task 3.7: 回收站 API 增强 + 审计日志 API

**Files:**
- Modify: `backend/app/modules/recycle/router.py`
- Modify: `backend/app/modules/recycle/service.py`
- Modify: `backend/app/modules/audit/router.py`

**Step 1: 回收站 API**

```python
GET    /api/recycle?type=all|requirement|testcase|knowledge  # 按类型筛选
POST   /api/recycle/{id}/restore      # 恢复单条
POST   /api/recycle/batch-restore     # 批量恢复
DELETE /api/recycle/clear-all         # 清空回收站
```

**Step 2: 审计日志 API (只读)**

```python
GET /api/audit/logs?start=xxx&end=xxx&limit=100
# 返回: [{time, user, action_type, object_name}]
```

**Step 3: Commit**

---

## Phase 4: System Prompt 重写 + RAG 优化

> 目标：重写 6 模块 System Prompt、优化 RAG 管道、添加 Few-shot 示例

### Task 4.1: 重写 6 模块 System Prompt

**Files:**
- Modify: `backend/app/ai/prompts.py`

**Step 1: 按 4 段结构重写所有 System Prompt**

每个模块 Prompt 包含: ① 身份声明 ② 任务边界 ③ 输出规范 ④ 质量红线

重写:
- `DIAGNOSIS_SYSTEM` → `ANALYSIS_SYSTEM`（改名 + 重写）
- `SCENE_MAP_SYSTEM`
- `GENERATION_SYSTEM`
- `DIFF_SYSTEM`
- `KNOWLEDGE_SYSTEM`
- `GENERAL_SYSTEM`

**Step 2: 添加默认 Prompt 加载方法**

```python
DEFAULT_PROMPTS = {
    "analysis": ANALYSIS_SYSTEM,
    "scene_map": SCENE_MAP_SYSTEM,
    "generation": GENERATION_SYSTEM,
    "diff": DIFF_SYSTEM,
    "knowledge": KNOWLEDGE_SYSTEM,
    "general": GENERAL_SYSTEM,
}

def get_default_prompt(module: str) -> str:
    return DEFAULT_PROMPTS[module]
```

**Step 3: 更新引擎层读取 Prompt 的逻辑**

修改 `app/ai/prompts.py` 中的 `assemble_prompt()` 方法:
先查询 `PromptConfiguration` 表的自定义 Prompt，若无则使用默认值。

**Step 4: Commit**

---

### Task 4.2: RAG 检索优化

**Files:**
- Modify: `backend/app/engine/rag/retriever.py`

**Step 1: 修改 top-K 和阈值**

```python
TOP_K = 5
SIMILARITY_THRESHOLD = 0.72
```

**Step 2: 修改检索结果注入 Prompt 时带分数**

```python
def format_rag_context(results: list) -> str:
    lines = []
    for r in results:
        if r.score >= SIMILARITY_THRESHOLD:
            lines.append(f"[相似度: {r.score:.2f}] {r.payload['content']}")
    return "\n---\n".join(lines)
```

**Step 3: 支持按知识库分类检索**

添加 `category` 过滤参数到 Qdrant 查询。

**Step 4: Commit**

---

### Task 4.3: 添加 Few-shot 正负例

**Files:**
- Modify: `backend/app/ai/prompts.py`

**Step 1: 在 GENERATION_SYSTEM Prompt 中添加 Few-shot 区域**

```python
FEW_SHOT_POSITIVE = """
### ✅ 高质量用例示例

**示例 1 - 正常场景:**
{从审查通过的清洗数据中动态加载}

**示例 2 - 异常场景:**
{从审查通过的清洗数据中动态加载}

**示例 3 - 边界场景:**
{从审查通过的清洗数据中动态加载}
"""

FEW_SHOT_NEGATIVE = """
### ❌ 禁止生成以下类型内容

**反例 1 - 模糊预期:**
步骤: 点击提交按钮
预期: 操作成功  ← 禁止！必须描述具体的系统行为

**反例 2 - 步骤不独立:**
步骤: 参照用例 TC-001 的前置条件  ← 禁止！每条用例必须自包含

**反例 3 - 前置条件缺失:**
前置条件: 数据库中有测试数据  ← 禁止！必须提供具体建表和插入语句
"""
```

**Step 2: 在 `assemble_prompt()` 中注入 Few-shot 层**

**Step 3: Commit**

---

## Phase 5: 导航菜单与路由重构

> 目标：重写侧边栏菜单（13→9项），重新组织前端路由

### Task 5.1: 重写侧边栏菜单

**Files:**
- Rewrite: `frontend/src/app/(main)/layout.tsx`

**Step 1: 更新 navGroups 为新的 9 项结构**

```typescript
const navGroups = [
  {
    items: [
      { href: '/', label: '仪表盘', icon: LayoutGrid },
    ],
  },
  {
    items: [
      { href: '/analysis', label: '分析台', icon: SearchCheck },
      { href: '/workbench', label: '工作台', icon: Wand2 },
      { href: '/diff', label: '需求Diff', icon: GitCompareArrows },
    ],
  },
  {
    items: [
      { href: '/testcases', label: '用例库', icon: ClipboardList },
      { href: '/templates', label: '模板库', icon: LayoutTemplate },
      { href: '/knowledge', label: '知识库', icon: BookOpen },
    ],
  },
  {
    items: [
      { href: '/recycle', label: '回收站', icon: Trash2 },
      { href: '/settings', label: '设置', icon: Settings },
    ],
  },
];
```

**Step 2: 移除旧菜单项**

删除: products、requirements、diagnosis、scene-map、coverage、analytics、notifications

**Step 3: Commit**

---

### Task 5.2: 创建分析台路由与页面骨架

**Files:**
- Create: `frontend/src/app/(main)/analysis/page.tsx`
- Create: `frontend/src/app/(main)/analysis/_components/RequirementList.tsx`
- Create: `frontend/src/app/(main)/analysis/_components/RequirementDetail.tsx`
- Create: `frontend/src/app/(main)/analysis/_components/AIAnalysis.tsx`
- Create: `frontend/src/app/(main)/analysis/_components/CoverageTracking.tsx`

**Step 1: 创建分析台页面**

左右两栏布局:
- 左栏: `RequirementList` (需求列表按迭代分组 + 状态 Badge)
- 右栏: Tab 组件 (需求详情 / AI 分析 / 覆盖追踪)

**Step 2: 迁移并整合 diagnosis 和 coverage 逻辑**

复用现有组件:
- `DiagnosisChat.tsx` → `AIAnalysis.tsx`
- `CoverageMatrix.tsx` → `CoverageTracking.tsx`
- `requirements/page.tsx` 中的编辑逻辑 → `RequirementDetail.tsx`

**Step 3: Commit**

---

### Task 5.3: 重构工作台 — Step 进度条 + 三栏

**Files:**
- Modify: `frontend/src/app/(main)/workbench/page.tsx`
- Create: `frontend/src/app/(main)/workbench/_components/StepBar.tsx`
- Create: `frontend/src/app/(main)/workbench/_components/TestPointConfirm.tsx`
- Modify existing workbench components

**Step 1: 创建 StepBar 组件**

```tsx
// 两步进度条: Step 1 确认测试点 | Step 2 生成用例
// 支持双向切换
```

**Step 2: 重构工作台页面**

- Step 1: 整合 scene-map 的测试点确认逻辑（TestPointList, ConfirmAllButton）
- Step 2: 保留现有的 ChatArea + GeneratedCases

**Step 3: Commit**

---

### Task 5.4: 清理旧路由页面

**Files:**
- Delete/archive: `frontend/src/app/(main)/products/page.tsx` (合并到分析台产品选择)
- Delete: `frontend/src/app/(main)/diagnosis/` (合并到分析台)
- Delete: `frontend/src/app/(main)/scene-map/` (合并到工作台)
- Delete: `frontend/src/app/(main)/coverage/` (合并到分析台)
- Delete: `frontend/src/app/(main)/analytics/` (合并到仪表盘)
- Delete: `frontend/src/app/(main)/notifications/` (砍掉)

注意: 不是直接删除文件，而是将有用逻辑先迁移到新页面后再删除旧文件。

**Step 1: 确认所有逻辑已迁移到新页面**
**Step 2: 删除旧页面文件**
**Step 3: Commit**

---

## Phase 6: 核心页面实现

> 目标：实现仪表盘、分析台、工作台、用例库、设置等核心页面

### Task 6.1: 仪表盘页面 — 概览 + 质量分析

**Files:**
- Rewrite: `frontend/src/app/(main)/page.tsx`
- Modify/Create: `frontend/src/app/(main)/_components/` 下相关组件

**Step 1: 实现概览 Tab**

- 4 个 StatCard (需求/用例/覆盖率/迭代进度) + delta
- 左栏折线图 (Recharts LineChart, 60% 宽)
- 右栏环形图 (Recharts PieChart, 40% 宽)
- 底部: 最近动态列表 + 待处理事项列表
- 右上角迭代选择器

**Step 2: 实现质量分析 Tab**

- 迭代用例质量分布
- AI 生成效率统计
- 覆盖率健康度

**Step 3: Commit**

---

### Task 6.2: 分析台完整实现

**Files:**
- 完善 Phase 5.2 中创建的骨架组件

**Step 1: RequirementList 组件**

- 按迭代分组的 accordion 列表
- 每条需求显示 StatusBadge (未分析/分析中/已完成)
- 点击选中高亮
- 顶部: 文档上传按钮 + 下载模板按钮 (链接到 public/templates/)

**Step 2: RequirementDetail Tab**

- 需求内容富文本展示/编辑
- 编辑后出现「开始分析」按钮
- 按钮点击 → 自动切换到 AI 分析 Tab

**Step 3: AIAnalysis Tab**

- 顶部: 广度扫描结果卡片
- 底部: 苏格拉底追问对话 (复用 DiagnosisChat 逻辑)
- SSE 流式输出 + StreamCursor

**Step 4: CoverageTracking Tab**

- 需求 × 场景类型矩阵 (复用 CoverageMatrix)
- 高风险未覆盖项标红

**Step 5: Commit**

---

### Task 6.3: 用例库 — 目录树 + 导入/导出

**Files:**
- Modify: `frontend/src/app/(main)/testcases/page.tsx`
- Rewrite: `frontend/src/app/(main)/testcases/_components/FolderTree.tsx`
- Create: `frontend/src/app/(main)/testcases/_components/ImportDialog.tsx`
- Create: `frontend/src/app/(main)/testcases/_components/ExportDialog.tsx`

**Step 1: 增强 FolderTree**

- 3 级目录嵌套
- 右键菜单: 新建子目录/重命名/删除/移动到...
- 双击编辑目录名
- 拖拽排序 (同级)
- 拖拽用例到目录 (高亮目标)
- 「未分类」节点不可删除/重命名

**Step 2: 创建 ImportDialog**

多步骤弹窗:
1. 选择文件 + 格式自动检测
2. 字段映射 (非标准文件)
3. 预览 (前 5 条)
4. 重复检测 + 处理
5. 确认导入

**Step 3: 创建 ExportDialog**

- 格式选择 (Excel/CSV/XMind/Markdown)
- 范围选择 (目录/需求/迭代/已选)
- 字段选择 (复选框)
- 导出按钮 → 下载

**Step 4: Commit**

---

### Task 6.4: 设置页面 — AI 模型配置列表 + Prompt 管理

**Files:**
- Rewrite: `frontend/src/app/(main)/settings/page.tsx`
- Rewrite: `frontend/src/app/(main)/settings/_components/AIModelSettings.tsx`
- Create: `frontend/src/app/(main)/settings/_components/PromptManager.tsx`
- Create: `frontend/src/app/(main)/settings/_components/AuditLogs.tsx`

**Step 1: AI 模型配置列表**

- 模型配置列表 (DataTable)
- 新建/编辑弹窗 (React Hook Form + Zod):
  - 提供商下拉 (7 预设 + 自定义)
  - 选择提供商自动填充 Base URL
  - 用途标签多选
  - 高级设置折叠区 (Temperature/Max Tokens)
  - 测试连接按钮
- 启用/禁用切换
- 删除确认

**Step 2: Prompt 管理 Tab**

- 6 个模块的 Prompt 编辑器
- 等宽字体 textarea + 字数统计
- 「重置为默认值」按钮
- 保存历史查看 + 回滚
- 顶部全局警告横幅

**Step 3: 审计日志 Tab**

- 只读表格: 时间/操作人/操作类型/对象
- 时间范围筛选
- 最近 100 条

**Step 4: Commit**

---

### Task 6.5: 知识库页面增强

**Files:**
- Modify: `frontend/src/app/(main)/knowledge/page.tsx`
- Modify existing knowledge components

**Step 1: 左侧分类导航**

4 个固定分类 + 全部:
- 企业测试规范
- 业务领域知识
- 历史用例 (只读)
- 技术参考

**Step 2: 分块预览抽屉**

「查看分块」按钮 → 右侧 Drawer:
- chunk 列表 (序号/token 数/内容)
- 删除单个 chunk

**Step 3: 手动知识条目**

「新建知识条目」按钮 → 弹窗:
- 标题/分类/内容/标签
- 保存后向量化

**Step 4: 版本管理**

- 文档卡片显示版本号
- 同名上传 → 版本确认弹窗
- 版本历史查看 + 重新激活

**Step 5: Commit**

---

### Task 6.6: 需求 Diff 页面增强

**Files:**
- Modify: `frontend/src/app/(main)/diff/page.tsx`
- Modify existing diff components

**Step 1: 「发布新版本」集成**

在分析台需求详情中添加「发布新版本」按钮 → 弹窗填版本说明 → 触发 Diff

**Step 2: 双 Tab 展示**

- 文本对比 Tab: 左旧右新, 红绿黄标记
- 变更摘要 Tab: 卡片列表

**Step 3: 受影响用例列表**

- 底部展示受影响用例 + Badge (需重写/需复核/不受影响)
- 「一键推送到工作台」按钮

**Step 4: Commit**

---

### Task 6.7: 模板库页面

**Files:**
- Rewrite: `frontend/src/app/(main)/templates/page.tsx`

**Step 1: 两 Tab 结构**

- Prompt 模板 Tab: 列表 + 新建/编辑/删除/导出/导入
- 用例结构模板 Tab: 列表 + 新建/编辑/删除/导出/导入

**Step 2: 内置模板标注**

「内置」Badge, 只读, 可复制另存

**Step 3: Commit**

---

### Task 6.8: 回收站页面增强

**Files:**
- Modify: `frontend/src/app/(main)/recycle/page.tsx`

**Step 1: Tab 切换**

全部 / 需求 / 用例 / 知识库文档

**Step 2: 到期倒计时**

每条显示「还剩 X 天到期」, 到期前 3 天标红

**Step 3: 恢复逻辑**

- 单条恢复 (原目录不存在时提示)
- 批量恢复
- 清空回收站 (二次确认)

**Step 4: Commit**

---

## Phase 7: 新功能实现

> 目标：实现新手引导、全局搜索、文档模板

### Task 7.1: 新手引导系统

**Files:**
- Modify: `frontend/src/components/ui/OnboardingGuide.tsx` (已存在)
- Create: `frontend/src/components/ui/HelpDrawer.tsx`
- Create: `frontend/src/components/ui/AiConfigBanner.tsx`
- Modify: `frontend/src/app/(main)/layout.tsx`

**Step 1: 首次登录引导弹窗**

- 全屏弹窗 + 平台流程图
- 「跳过」/「下一步」按钮
- localStorage 记录 `onboarding_completed`

**Step 2: 浮动「?」帮助按钮**

- 圆形, `bg-sy-accent`, `HelpCircle` 图标
- 固定 `bottom-6 right-6`, z-50
- 点击打开 HelpDrawer

**Step 3: HelpDrawer 组件**

- 右侧 Drawer
- Tab 1 「快速开始」: 5 步图文流程
- Tab 2 「功能说明」: 各模块简介

**Step 4: AI 未配置横幅**

分析台/工作台顶部: 「AI 模型未配置，部分功能不可用 → [前往配置]」

**Step 5: Commit**

---

### Task 7.2: 全局搜索 (Cmd+K)

**Files:**
- Modify: `frontend/src/components/ui/GlobalSearch.tsx` (已存在)

**Step 1: 实现搜索弹窗**

- `Cmd+K` / `Ctrl+K` 快捷键唤起
- 搜索输入框 + 结果列表
- 结果按类型分组 (需求 / 用例)
- 点击跳转

**Step 2: 对接 `/api/search` 接口**

- debounce 300ms
- 实时搜索展示

**Step 3: Commit**

---

### Task 7.3: 文档模板文件

**Files:**
- Create: `frontend/public/templates/需求文档模板.md`
- Create: `frontend/public/templates/需求文档模板.docx`
- Create: `frontend/public/templates/用例导入模板.xlsx`
- Create: `frontend/public/templates/用例导入模板.csv`

**Step 1: 创建 Markdown 模板**

```markdown
# 需求标题

## 功能背景
（描述业务背景和需求来源）

## 功能描述
### 功能点 1：xxx
- 业务规则：
- 异常处理：
- 数据约束：

### 功能点 2：xxx
- 业务规则：
- 异常处理：
- 数据约束：

## 接口说明（可选）

## 非功能要求（可选）
```

**Step 2: 创建 Excel/CSV 导入模板**

列: 用例标题 / 优先级 / 场景类型 / 前置条件 / 步骤 / 预期结果

**Step 3: Commit**

---

## Phase 8: 文案与交互标准化

> 目标：全局替换文案、统一空状态、统一 Loading、统一错误处理

### Task 8.1: 全局术语替换 — 「诊断」→「分析」

**Files:**
- 全部前端 .tsx/.ts 文件中的「诊断」
- 全部后端 .py 文件中的日志和注释

**Step 1: 前端全局替换**

```bash
# 搜索所有「诊断」出现位置
grep -rn "诊断" frontend/src/ --include="*.tsx" --include="*.ts"
```

逐一替换为「分析」（注意保留变量名不变，只改用户可见文案）

**Step 2: 后端日志和注释替换**

**Step 3: Commit**

---

### Task 8.2: 按钮文案统一 — 「新建」

**Files:**
- 所有含「新增」「创建」按钮文案的 .tsx 文件

**Step 1: 搜索并替换**

```bash
grep -rn "新增\|创建" frontend/src/ --include="*.tsx" | grep -v "node_modules"
```

替换规则: 「新增」→「新建」, 「创建」→「新建」(上传/添加/导入保持)

**Step 2: 验证零残留**

```bash
grep -rn "新增\|创建" frontend/src/ --include="*.tsx" | grep -E "btn|button|Button|按钮"
```

Expected: 零结果

**Step 3: Commit**

---

### Task 8.3: 统一空状态组件使用

**Files:**
- 所有页面中的空状态处理位置

**Step 1: 审查所有页面的空状态**

逐一确认每个列表页面在 `data.length === 0` 时使用 `EmptyState` 组件。

**Step 2: 补充缺失的空状态**

**Step 3: Commit**

---

### Task 8.4: 统一错误处理

**Files:**
- Modify: `frontend/src/lib/api.ts` (API 层统一错误处理)
- 所有使用 `catch (e)` 且只有 `console.log` 的位置

**Step 1: 在 API 层添加全局错误拦截**

```typescript
// 500: toast.error(response.data.detail || '服务器内部错误')
// timeout: toast.error('请求超时，请检查网络连接后重试')
// offline: toast.error('网络连接已断开')
```

**Step 2: 替换所有 console.log 错误处理为 toast**

**Step 3: Commit**

---

## Phase 9: 历史数据清洗与 RAG 重建

> 目标：修复历史用例渲染/格式问题，执行质量审查，重建向量库

### Task 9.1: 修复前端用例渲染 — \n 换行

**Files:**
- Modify: `frontend/src/app/(main)/testcases/_components/CaseDetailDrawer.tsx`
- Modify: `frontend/src/components/workspace/CaseCard.tsx`

**Step 1: 确保所有文本字段正确渲染换行**

在展示用例步骤/前置条件/预期结果时:
```tsx
// 将 \n 渲染为 <br /> 或使用 whitespace-pre-wrap
<p className="whitespace-pre-wrap">{step.action}</p>
```

**Step 2: Commit**

---

### Task 9.2: 检查 DB 数据 + 修复清洗脚本

**Step 1: 抽样检查 10 条用例的 DB 原始数据**

```sql
SELECT id, title, steps FROM test_cases WHERE source = 'imported' LIMIT 10;
```

判断: 是 `\n` 字面字符串还是真实换行符

**Step 2: 如需要，修复清洗脚本中的换行处理**

**Step 3: 修复字段名中英文混杂**

统一 `Precondition` → `前置条件`, `Steps` → `步骤`, `Expected` → `预期结果`

**Step 4: Commit**

---

### Task 9.3: 执行历史用例质量审查

**Step 1: 使用 /functional-test-case-reviewer skill 审查 清洗后数据/ 目录**

并行 subagent 处理。

**Step 2: 收集审查报告**

**Step 3: 清空旧向量 + 重新入库通过审查的用例**

**Step 4: Commit 审查报告**

---

## Phase 10: 后端依赖安装 + 测试 + 验收

> 目标：安装新依赖、运行 lint/typecheck、编写关键 API pytest、执行验收清单

### Task 10.1: 安装后端新依赖

**Files:**
- Modify: `backend/pyproject.toml`

**Step 1: 添加 xmindparser**

```bash
cd backend
uv add xmindparser
```

**Step 2: 同步依赖**

```bash
uv sync --all-extras
```

**Step 3: Commit**

---

### Task 10.2: 运行代码质量检查

**Step 1: 后端 lint + format**

```bash
cd backend
uv run ruff check . --fix
uv run ruff format .
```

**Step 2: 前端 lint + typecheck**

```bash
cd frontend
bunx biome check --write .
bunx tsc --noEmit
```

**Step 3: 修复所有报错**

**Step 4: Commit**

---

### Task 10.3: 编写关键 API pytest

**Files:**
- Create: `backend/tests/unit/test_ai_config/test_model_crud.py`
- Create: `backend/tests/unit/test_testcases/test_folder_crud.py`
- Create: `backend/tests/unit/test_import/test_import_flow.py`
- Create: `backend/tests/unit/test_search/test_global_search.py`

**Step 1: AI 模型配置 CRUD 测试**

测试 create/read/update/delete/toggle/test-connection

**Step 2: 目录管理测试**

测试 create/rename/delete/move/sort

**Step 3: 导入流程测试**

测试 Excel/CSV/XMind 解析 + 重复检测

**Step 4: 运行所有测试**

```bash
cd backend
uv run pytest -v
```

**Step 5: Commit**

---

### Task 10.4: 验收清单核查

按 `docs/plans/2026-03-13-full-review-design.md` Section L 的验收标准逐一检查:

**UI 规范类:**
```bash
# 零 antd 依赖
grep -i "antd\|ant-design" frontend/package.json
# 零硬编码颜色
grep -rn "style={{" frontend/src/ --include="*.tsx" | grep -iE "color.*#|rgba"
grep -rn 'text-\[#' frontend/src/ --include="*.tsx"
# 零「新增」「创建」
grep -rn "新增\|创建" frontend/src/ --include="*.tsx" | grep -iE "btn|button"
```

**功能完整性类:**
- 手动跑通核心链路: 新建产品 → 上传需求 → AI 分析 → 工作台 → 用例库 → 导出
- 刷新页面验证数据持久化
- 检查所有按钮 Loading 状态
- 检查所有删除确认弹窗
- 检查所有空状态页面

**数据类:**
- 确认至少 2 产品/2 迭代/5 需求/50 用例
- 确认向量数量一致

**Step 1: 运行所有自动化检查**
**Step 2: 手动验收核心链路**
**Step 3: 更新 progress.json**
**Step 4: Commit**

---

## 依赖关系总览

```
Phase 1 (前端基础)
  ↓
Phase 2 (后端模型) → Phase 3 (后端 API)
  ↓                     ↓
Phase 4 (Prompt+RAG)   Phase 5 (菜单路由)
  ↓                     ↓
                    Phase 6 (核心页面)
                        ↓
                    Phase 7 (新功能)
                        ↓
                    Phase 8 (文案标准化)
                        ↓
                    Phase 9 (数据清洗)
                        ↓
                    Phase 10 (测试验收)
```

Phase 1 和 Phase 2 可并行执行（前端/后端独立）。
Phase 3 依赖 Phase 2 的模型变更。
Phase 4 可与 Phase 5 并行。
Phase 6-10 按顺序执行。
