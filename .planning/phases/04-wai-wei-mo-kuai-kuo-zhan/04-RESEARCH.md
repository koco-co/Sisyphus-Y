# Phase 4: 外围模块扩展 - Research

**Researched:** 2026-03-16
**Domain:** 需求录入优化、用例库管理、仪表盘重构、需求 Diff、知识库增强
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INP-01 | 上传需求入口旁「下载模板」按钮，提供 docx/md 格式 | frontend public/templates/ 静态文件服务；无需后端 |
| INP-02 | UDA 解析后按章节/功能点自动拆分为独立需求条目，用户确认结构后保存 | UDA `/parse-structure` 端点已存在，缺前端确认 UI + 批量保存端点 |
| INP-03 | 非标准文档给出「识别置信度较低」提示，不阻断 | UDA service 已有 parse_status；需在前端展示置信度字段 |
| TC-01 | 三级目录树：产品/迭代/需求自动归属，超过3层置灰提示 | FolderTree 组件已存在，level/is_system 已实现；需对齐视觉规范 |
| TC-02 | 目录双击重命名（回车确认/Esc取消），不能为空/重名，超20字截断 | FolderTree 已实现双击重命名，需补充重名验证 |
| TC-03 | 目录删除：有用例时二次确认弹窗，确认后目录和用例全入回收站；空目录直接删 | 已有 deleteConfirm 弹窗 + 软删除；需确认 cascaded soft-delete 链路 |
| TC-04 | 同级目录拖拽排序（持久化），跨层级通过右键「移动到…」实现 | dnd-kit 已集成；拖拽排序已实现；右键「移动到…」尚未实现 |
| TC-05 | 拖拽用例到不同目录（单条或多选批量），同时支持右键「移动到…」 | /testcases/folders/move-cases 端点已存在；前端拖拽用例移动未实现 |
| TC-06 | 「未分类」目录不可删除/重命名，所有无指定目录的用例自动归入 | is_system=True 机制已存在，FolderTree 已禁用系统目录操作 |
| TC-07 | 导入支持 xlsx/csv/json/xmind 四种格式，提供对应模板下载 | ImportDialog 已支持四种格式；模板下载按钮缺失 |
| TC-08 | 非标准文件上传时进入字段映射步骤，必填字段未映射则禁止导入 | ImportDialog 有 ColumnMapping 步骤，需强化必填字段校验 |
| TC-09 | 导入必有预览步骤（前5条解析结果），用户确认后才正式导入 | ImportDialog 已有 preview_rows；逻辑基本完整 |
| TC-10 | 重复检测（标题+目录唯一），预览步骤列出重复条目，用户选覆盖/跳过/重命名导入 | /testcases/import/check-duplicates 已存在；前端重复处理 UI 需验证完整性 |
| TC-11 | 导入完成 Toast：「成功导入 N 条，跳过 M 条，覆盖 K 条」 | ImportResult 结构已存在；Toast 汇总文案需验证 |
| TC-12 | 导出支持 xlsx/csv/xmind/md 四种格式 | ExportService 后端已有 xlsx/csv/json；xmind/md 生成端点已存在 |
| TC-13 | 导出范围：当前目录/按需求/按迭代/自由勾选（四种） | ExportJobCreate schema 需确认 scope 字段；前端 ExportDialog 需对齐四种范围 |
| TC-14 | 导出自定义字段（复选框选择，XMind 格式固定全字段） | 需在 ExportDialog 增加字段选择 UI + 后端接受 fields 参数 |
| DSH-01 | 顶部4卡片：需求总数/用例总数/平均覆盖率/本迭代进度，含与上迭代 delta | DashboardService.get_stats 已完整实现，前端已渲染4卡片 |
| DSH-02 | 中部折线图：近6迭代用例总量/P0覆盖率/缺陷发现率，三线可单独显示 | 后端缺少多迭代历史趋势端点；前端目前无折线图 |
| DSH-03 | 中部环形图：当前迭代用例来源占比（AI生成/历史导入/手动创建） | get_quality_stats 已返回 by_source；前端目前用 BarChart 非环形图 |
| DSH-04 | 底部：最近5条需求动态 + 待处理事项列表（含「去处理」跳转） | get_recent_activities + get_pending_items 已实现，前端 ActivityTimeline + PendingItems 已有 |
| DSH-05 | 右上角迭代选择器，切换后所有图表同步更新 | 迭代选择器已实现；但只驱动 stats 端点，需扩展到趋势图 |
| DSH-06 | 「质量分析」Tab：迭代用例质量分布 + AI 生成效率统计 | 质量分析 Tab 已存在，使用 BarChart；需替换源码分布图为 PieChart/Donut |
| DIF-01 | 「发布新版本」按钮在需求编辑器右上角，点击填写版本说明后触发 Diff | 需求编辑器有 VersionHistory 组件；需在需求编辑器右上角加「发布新版本」按钮 |
| DIF-02 | 文本对比 Tab：左旧右新，删除红/新增绿/修改黄，支持折叠未变更段落 | DiffView 组件已存在；当前渲染 unified diff 原始文本，需升级为并排视图 |
| DIF-03 | 变更摘要 Tab：卡片列表，每卡显示变更类型+摘要+业务影响 | SemanticAnalysis 组件已存在；需结合 LLM 语义分析结果 |
| DIF-04 | Diff 后自动影响分析，受影响用例打标（需重写/需复核/不受影响） | mark_affected_test_cases 引擎层已实现；TestCase 缺少 change_impact 字段 |
| DIF-05 | 「一键推送到工作台」将「需重写」用例批量推送，用例列表同步显示对应 Badge | RegenerateButton 已存在；push-to-workbench 端点尚未实现 |
| KB-01 | 四固定分类：企业测试规范/业务领域知识/历史用例/技术参考 | KnowledgeDocument.category 字段已存在，default="business_rule"；四分类需标准化为 enum |
| KB-02 | 文档分块预览抽屉（序号/token数/内容），支持删除单个 chunk | Qdrant 存储 chunks；需新增 /knowledge/{id}/chunks 端点 + 前端抽屉 |
| KB-03 | 手动添加知识条目（标题/分类/内容/标签），直接向量化入库，显示「手动」Badge | entry_type="manual" 字段已存在；需新增手动创建端点 + 前端表单 |
| KB-04 | 文档版本管理：新版本上传弹确认，旧版本停用不参与检索，最多保留3版，超限自动删除最旧 | KnowledgeDocument.version 递增；需新增版本管理逻辑 + is_active 控制检索过滤 |
</phase_requirements>

---

## Summary

Phase 4 涉及 6 个模块域（需求录入/用例库/导入导出/仪表盘/Diff/知识库），共 34 项需求。经过代码库深度审查，**大多数后端基础设施和核心组件已经存在**，Phase 4 的核心工作是：(1) 补齐缺失的后端端点（多迭代趋势、知识库分块预览、push-to-workbench 等），(2) 完善前端 UI（环形图替换、并排 Diff 视图、发布新版本入口等），(3) 处理几处真正的新功能（KB 版本管理限额、DIF-04 用例打标字段）。

**已实现比例**：约 60% 的功能有基础实现，40% 需要新增或补完。其中仪表盘趋势折线图（DSH-02）、Diff 并排视图（DIF-02）、知识库分块预览（KB-02）、发布新版本入口（DIF-01）是工作量最大的四项。

**关键风险**：STATE.md 明确标注 `ImportDialog` 是 1000 行的 Fragile 组件，修改时需极度谨慎，建议拆分成子组件后再扩展；Celery 任务全部为 stub，批量导入/向量化有阻塞请求线程的风险。

**Primary recommendation:** 按模块分波次交付：Wave 1（后端补全）→ Wave 2（用例库 UI）→ Wave 3（仪表盘）→ Wave 4（Diff 增强）→ Wave 5（知识库）→ Wave 6（需求录入）

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core + @dnd-kit/sortable | 已安装 | 目录树/用例拖拽排序 | 项目已使用，FolderTree 依赖 |
| Recharts | latest | 仪表盘折线图/环形图 | CLAUDE.md 明确指定 |
| sonner | 已安装 | Toast 通知（导入/导出汇总） | Phase 1 决策，全局 Toast 方案 |
| openpyxl | 已安装 | xlsx 导出生成 | ExportService 已用 |
| xmind | 需确认 | XMind 格式导出 | 项目 Out of Scope 限定 xmind2026 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| difflib (stdlib) | Python stdlib | Myers Diff 文本对比 | DiffService 已用，不需要额外安装 |
| tiktoken | 需安装 | chunk token 计数（KB-02） | 知识库分块预览显示 token 数 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts LineChart | React Flow | Recharts 更轻量，CLAUDE.md 已指定用于看板 |
| difflib unified_diff | diff2html | diff2html 更易渲染并排视图，但引入新依赖；可用纯 CSS 实现并排布局 |

**Installation (if needed):**
```bash
# 后端（如需 tiktoken）
cd backend && uv add tiktoken
# 前端无需新增包
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 4 新增文件)

```
backend/app/
├── modules/
│   ├── dashboard/
│   │   ├── service.py        # 补充 get_trend_stats() 多迭代历史
│   │   └── router.py         # 补充 /dashboard/trend 端点
│   ├── diff/
│   │   ├── models.py         # TestCase 新增 change_impact 字段（迁移）
│   │   └── router.py         # 补充 /diff/{req_id}/push-to-workbench
│   ├── knowledge/
│   │   ├── router.py         # 补充 /knowledge/{id}/chunks、/knowledge/manual
│   │   └── service.py        # 补充 chunk 检索 + 手动条目 + 版本限额逻辑
│   └── export/
│       └── service.py        # 导出范围参数（folder_id/req_id/iter_id/case_ids）
├── engine/
│   └── diff/                 # impact_analyzer 已有，确认打标逻辑完整
└── alembic/versions/         # 新迁移：TestCase.change_impact

frontend/src/app/(main)/
├── page.tsx                  # 仪表盘：引入 Recharts LineChart + PieChart
├── testcases/_components/
│   ├── FolderTree.tsx        # 补充右键「移动到…」
│   ├── ImportDialog.tsx      # 补充模板下载 + 必填字段校验强化
│   └── ExportDialog.tsx      # 补充四种范围 + 自定义字段
├── diff/_components/
│   └── DiffView.tsx          # 升级为并排视图（side-by-side）
├── requirements/_components/
│   └── UploadRequirementDialog.tsx  # 补充模板下载 + 拆分确认 UI
└── knowledge/_components/
    ├── ChunkPreviewDrawer.tsx        # 新建
    └── ManualEntryDialog.tsx         # 新建

public/templates/
├── requirement-template.docx  # 新建
└── requirement-template.md    # 新建
```

### Pattern 1: 需求模板下载（INP-01）
**What:** 静态文件存放 `public/templates/`，前端 `<a href="/templates/xxx.docx" download>` 直接触发下载
**When to use:** 不涉及动态内容的模板文件
**Example:**
```typescript
// frontend 直接链接到 public 目录
<a href="/templates/requirement-template.docx" download>
  <Button variant="outline" size="sm">
    <Download className="w-3.5 h-3.5 mr-1" />
    下载模板
  </Button>
</a>
```

### Pattern 2: UDA 解析后结构化确认（INP-02/INP-03）
**What:** 调用已有 `/uda/parse-structure` 端点，返回结构化条目列表，展示置信度，用户确认后调用批量创建需求端点
**When to use:** 文档上传后的需求拆分确认流程
**Example:**
```typescript
// Step 1: parse-structure 返回 items 列表
const result = await api.post('/uda/parse-structure', formData)
// result.items: [{title, content, confidence, chapter}]

// Step 2: 展示确认 UI，低置信度显示警告 Badge
if (result.confidence < 0.7) {
  showConfidenceBanner = true  // 不阻断
}

// Step 3: 用户确认后批量创建
await api.post('/products/requirements/bulk-create', { items: confirmed })
```

### Pattern 3: Recharts 环形图（DSH-03）
**What:** 用 Recharts `PieChart` + `innerRadius` 实现环形图，数据来自 `by_source` 字段
**When to use:** 用例来源占比可视化
**Example:**
```typescript
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

const sourceData = [
  { name: 'AI 生成', value: quality.by_source.ai_generated ?? 0, color: 'var(--accent)' },
  { name: '历史导入', value: quality.by_source.imported ?? 0, color: 'var(--blue)' },
  { name: '手动创建', value: quality.by_source.manual ?? 0, color: 'var(--purple)' },
]

<PieChart width={200} height={200}>
  <Pie data={sourceData} innerRadius={50} outerRadius={80} dataKey="value">
    {sourceData.map((entry, index) => (
      <Cell key={index} fill={entry.color} />
    ))}
  </Pie>
  <Tooltip />
</PieChart>
```

### Pattern 4: 多迭代趋势折线图（DSH-02）
**What:** 新增后端端点 `/dashboard/trend?limit=6`，返回最近6迭代的用例总量/P0用例数（以 coverage_rate 替代缺陷发现率），前端 Recharts `LineChart`
**When to use:** 仪表盘中部趋势区域
**Example:**
```python
# backend: DashboardService.get_trend_stats(limit=6)
# 返回: [{"iteration_name": "v1.0", "testcase_count": 120, "p0_count": 20, "coverage_rate": 85}]
```

### Pattern 5: Diff 并排视图（DIF-02）
**What:** 将 unified diff text 解析为行级 `{type: 'add'|'del'|'ctx', line: string}[]`，两列对齐显示
**When to use:** DiffView 组件升级
**Example:**
```typescript
// 解析 unified diff
function parseDiff(diffText: string) {
  return diffText.split('\n').map(line => ({
    type: line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : 'ctx',
    content: line.slice(1),
  }))
}
// 左列显示 del+ctx，右列显示 add+ctx
// del 行背景: bg-sy-danger/10，add 行: bg-sy-accent/10，修改行: bg-sy-warn/10
```

### Anti-Patterns to Avoid
- **直接修改 ImportDialog.tsx 主文件添加大段逻辑**：该文件已超 1000 行，STATE.md 标注为 Fragile。正确做法是先抽取子组件（FieldMappingStep、DuplicateStep 等），再在子组件中增加功能
- **直接在 page.tsx 写 Recharts 图表逻辑**：抽取 `TrendChart.tsx`、`SourcePieChart.tsx` 等独立组件
- **在 FolderTree 内嵌「移动到」弹窗**：FolderTree 已经复杂，新建独立 `MoveFolderDialog.tsx`/`MoveCaseDialog.tsx`
- **Celery stub 用于同步请求路径**：批量导入和向量化不得在请求线程同步执行，需要用 BackgroundTask 或确认数据量限制

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 拖拽排序 | 自定义 mousedown drag | @dnd-kit/sortable | 项目已集成，FolderTree 已用 |
| Toast 通知 | 自定义 Toast 组件 | sonner toast() | Phase 1 统一决策 |
| 折线图/环形图 | 自定义 SVG 图表 | Recharts LineChart/PieChart | CLAUDE.md 指定，已有 BarChart 用例 |
| xlsx 读写 | 手动解析 CSV | openpyxl (后端) / SheetJS | 项目后端已用 openpyxl |
| Diff 文本解析 | 自定义 diff 算法 | difflib.unified_diff (已用) | stdlib，已经集成 |
| 向量检索 chunk 列表 | 自建 chunk 存储 | Qdrant point query | RAG 架构已基于 Qdrant，chunk 即 Qdrant point |

**Key insight:** 知识库分块预览（KB-02）中的 chunks 存储在 Qdrant，不在 PostgreSQL。需调用 Qdrant client 的 `scroll` 接口按 doc_id 过滤 points，不能另建 DB 表。

---

## Common Pitfalls

### Pitfall 1: ImportDialog Fragile 组件
**What goes wrong:** 在 ImportDialog.tsx（1000行）中直接添加模板下载或字段校验逻辑，导致难以维护
**Why it happens:** 历史积累的单文件组件
**How to avoid:** 先拆分为 `FormatSelectStep`、`FieldMappingStep`、`PreviewStep`、`DuplicateStep`、`ResultStep` 子组件，再在对应 Step 中增加功能
**Warning signs:** 添加新功能后该文件行数超过 1200

### Pitfall 2: TestCase.change_impact 字段迁移冲突
**What goes wrong:** DIF-04 需要给 TestCase 新增 `change_impact` 字段，但现有 Alembic 迁移可能产生冲突
**Why it happens:** STATE.md 记录有一次因 phase 1 残留导致迁移文件噪声问题
**How to avoid:** 生成迁移前运行 `uv run alembic check`，确认当前 DB head 与代码模型一致；新迁移描述写清楚（`add_change_impact_to_test_cases`）
**Warning signs:** `alembic autogenerate` 生成了不属于本次修改的 DROP TABLE 语句

### Pitfall 3: 仪表盘 Recharts 样式与 sy-* token 不兼容
**What goes wrong:** Recharts 组件不识别 Tailwind class，颜色用 `className="text-sy-accent"` 不生效
**Why it happens:** Recharts 用 inline style 渲染 SVG 元素
**How to avoid:** 使用 CSS 变量字符串 `'var(--sy-accent)'` 或从 `getComputedStyle` 中读取值。根据已有 page.tsx 代码模式，项目使用 `var(--accent)` CSS 变量（见 priorityColors）
**Warning signs:** 图表在截图或 build 后颜色变为默认蓝色

### Pitfall 4: Qdrant chunk 检索性能
**What goes wrong:** KB-02 分块预览调用 Qdrant scroll 时，doc_id 过滤可能返回数千条 chunks
**Why it happens:** 大型技术文档可能切出数百个 chunks
**How to avoid:** scroll 接口加 `limit=50`，前端分页加载；不要一次性返回全部 chunks
**Warning signs:** API 响应超过 5 秒或 payload 超过 1MB

### Pitfall 5: DIF-01 发布新版本与 RequirementVersion 创建时机
**What goes wrong:** 「发布新版本」的版本号递增与 UDA 解析时自动递增可能冲突
**Why it happens:** Requirement.version 和 RequirementVersion 表共存，需要明确谁负责 bump 版本
**How to avoid:** 「发布新版本」按钮触发专用端点 `POST /products/requirements/{id}/publish-version`，在事务内 bump version + 创建 RequirementVersion 记录 + 触发 Diff 计算
**Warning signs:** Diff 的 version_from/version_to 出现重复或跳跃

### Pitfall 6: XMind 导出格式
**What goes wrong:** python-xmind 库或 xmind-sdk 生成的文件无法被 XMind 2026 打开
**Why it happens:** XMind 格式有多个版本，部分 SDK 只支持旧版（.xmind = zip with XML）
**How to avoid:** 检查现有 ExportService.generate_xmind() 实现；如果当前用 xmindparser 则需要换成能写出 `.xmind` 格式的库（推荐 `xmindparser` + 手动构造 zip 内容）；已在 Out of Scope 中限定"只验证 xmind2026"
**Warning signs:** 生成的文件扩展名是 .xmind 但无法被应用打开

---

## Code Examples

### 仪表盘多迭代趋势端点（DSH-02 后端）
```python
# backend/app/modules/dashboard/service.py

async def get_trend_stats(self, product_id: UUID | None = None, limit: int = 6) -> list[dict]:
    """返回最近 N 个迭代的趋势数据。"""
    iterations = await self._get_iteration_options()
    if product_id:
        iterations = [i for i in iterations if i.product_id == product_id]
    recent = iterations[:limit][::-1]  # 时间正序

    result = []
    for iter_snap in recent:
        metrics = await self._get_iteration_metrics(iter_snap.id)
        p0_q = (
            select(func.count())
            .select_from(TestCase)
            .join(Requirement, TestCase.requirement_id == Requirement.id)
            .where(
                TestCase.deleted_at.is_(None),
                Requirement.deleted_at.is_(None),
                Requirement.iteration_id == iter_snap.id,
                TestCase.priority == "P0",
            )
        )
        p0_count = (await self.session.execute(p0_q)).scalar() or 0
        result.append({
            "iteration_name": iter_snap.name,
            "testcase_count": metrics.testcase_count,
            "p0_count": p0_count,
            "coverage_rate": metrics.coverage_rate,
        })
    return result
```

### 知识库分块预览端点（KB-02 后端）
```python
# backend/app/modules/knowledge/router.py
@router.get("/{doc_id}/chunks")
async def get_chunks(doc_id: uuid.UUID, session: AsyncSessionDep, limit: int = 50, offset: int = 0) -> dict:
    """返回文档的 Qdrant 分块列表（序号/token数/内容预览）。"""
    from app.engine.rag.retriever import scroll_by_doc_id
    chunks = await scroll_by_doc_id(str(doc_id), limit=limit, offset=offset)
    return {
        "items": [
            {
                "index": i + offset,
                "content": c["content"][:500],
                "token_count": len(c["content"].split()),  # 粗略估算，或用 tiktoken
            }
            for i, c in enumerate(chunks)
        ],
        "total": len(chunks),
    }
```

### 知识库手动添加条目（KB-03）
```python
# backend/app/modules/knowledge/schemas.py
class ManualEntryCreate(BaseModel):
    title: str
    category: str  # 四固定分类之一
    content: str
    tags: list[str] = []

# backend/app/modules/knowledge/service.py
async def create_manual_entry(self, data: ManualEntryCreate) -> KnowledgeDocument:
    doc = KnowledgeDocument(
        title=data.title,
        file_name=f"manual_{data.title[:50]}",
        doc_type="manual",
        file_size=len(data.content.encode()),
        content=data.content,
        category=data.category,
        entry_type="manual",  # 前端用于显示「手动」Badge
        is_active=True,
        vector_status="processing",
    )
    self.session.add(doc)
    await self.session.flush()
    chunks = [{"content": data.content, "doc_id": str(doc.id)}]
    await index_chunks(chunks, doc_id=str(doc.id))
    doc.vector_status = "completed"
    doc.chunk_count = 1
    await self.session.commit()
    await self.session.refresh(doc)
    return doc
```

### 知识库版本管理限额（KB-04）
```python
# backend/app/modules/knowledge/service.py
MAX_VERSIONS = 3

async def upload_new_version(self, doc_id: UUID, file: UploadFile) -> KnowledgeDocument:
    """上传新版本，旧版本停用，超过3版自动删除最旧。"""
    # 1. 找到同标题的所有历史版本（按 version 升序）
    q = select(KnowledgeDocument).where(
        KnowledgeDocument.title == existing.title,
        KnowledgeDocument.deleted_at.is_(None),
        KnowledgeDocument.is_active == True,
    ).order_by(KnowledgeDocument.version.asc())
    versions = list((await self.session.execute(q)).scalars().all())

    # 2. 将现有版本全部停用（不参与检索）
    for v in versions:
        v.is_active = False

    # 3. 如果已有 MAX_VERSIONS 个活跃版本，软删除最旧一个
    if len(versions) >= MAX_VERSIONS:
        oldest = versions[0]
        oldest.deleted_at = datetime.now(UTC)
        delete_by_doc_id(str(oldest.id))  # 清除 Qdrant 向量

    # 4. 创建新版本记录
    # ... (同 upload_document 逻辑)
```

### 发布新版本端点（DIF-01）
```python
# backend/app/modules/products/router.py
@router.post("/{req_id}/publish-version")
async def publish_requirement_version(
    req_id: uuid.UUID,
    data: PublishVersionRequest,  # version_note: str | None
    session: AsyncSessionDep,
) -> dict:
    """创建 RequirementVersion 快照，版本号+1，返回新旧版本号用于触发 Diff。"""
    req_service = RequirementService(session)
    old_version, new_version = await req_service.publish_version(req_id, data.version_note)
    return {
        "requirement_id": str(req_id),
        "version_from": old_version,
        "version_to": new_version,
    }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 仪表盘用 fallbackQuality 静态数据 | 接入真实 API 数据 | Phase 4 | DSH 系列需求 |
| Diff 页面手动输入需求 UUID | 从需求编辑器一键触发 | Phase 4 (DIF-01) | 降低使用门槛 |
| 知识库只能上传文件 | 支持手动添加条目 | Phase 4 (KB-03) | 知识沉淀更灵活 |
| 用例库导出固定 json/csv/xlsx | 支持 xmind/md + 范围/字段自定义 | Phase 4 (TC-12..14) | 对外交付灵活性 |

**Deprecated/outdated:**
- 仪表盘中的 `fallbackQuality` 静态数据：Phase 4 接入真实 API 后应移除
- `BarChart` 用于来源占比：Phase 4 替换为 `PieChart`（Recharts）

---

## Open Questions

1. **XMind 导出库现状**
   - What we know: `ExportService.generate_xmind()` 方法已存在，Out of Scope 限定 xmind2026 格式
   - What's unclear: 当前 generate_xmind 使用哪个 Python 库，是否已生成有效文件
   - Recommendation: 在 Wave 1 后端任务中优先验证现有 xmind 生成逻辑，如有问题升级库

2. **Qdrant scroll_by_doc_id 接口是否已实现**
   - What we know: `app/engine/rag/retriever.py` 有 `delete_by_doc_id`，推测有类似接口
   - What's unclear: 是否有 scroll/query by doc_id 的接口
   - Recommendation: 开发 KB-02 时先检查 retriever.py，如无则新增 `scroll_by_doc_id` 函数

3. **「发布新版本」是否需要 LLM 语义分析（DIF-03）**
   - What we know: DiffService.compute_diff 调用 engine/diff/ 引擎层，`semantic_impact` 字段已在 RequirementDiff 模型中
   - What's unclear: engine/diff 的语义分析是否已调用 LLM，还是仍为 stub
   - Recommendation: 检查 `engine/diff/impact_analyzer.py`；若为 stub，Phase 4 计划内实现 LLM 语义分析

4. **用例 change_impact 字段的数据库迁移顺序**
   - What we know: 当前存在一个已删除的迁移文件（git status 显示 D backend/alembic/versions/ee8a72884ae2_...）
   - What's unclear: 当前 alembic head 状态是否与代码模型一致
   - Recommendation: Wave 1 开始前运行 `uv run alembic check` 并在 PLAN 中作为前置步骤

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio (asyncio_mode = "auto") |
| Config file | backend/pyproject.toml |
| Quick run command | `uv run pytest tests/unit/test_dashboard/ tests/unit/test_diff/ -x -q` |
| Full suite command | `uv run pytest -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INP-02 | parse-structure 返回结构化条目 + confidence | unit | `uv run pytest tests/unit/test_uda/ -x` | ✅ |
| TC-04 | 右键移动到不同层级，folder_id 更新 | integration | `uv run pytest tests/unit/test_testcases/ -k move -x` | ✅ (需新增 test case) |
| TC-10 | 重复检测返回正确的 DuplicateInfo 列表 | unit | `uv run pytest tests/unit/test_testcases/ -k duplicate -x` | ✅ (需新增) |
| DSH-02 | get_trend_stats 返回最近6迭代正确数据 | unit | `uv run pytest tests/unit/test_dashboard/ -k trend -x` | ❌ Wave 0 |
| DIF-04 | mark_affected_test_cases 正确打标 change_impact | unit | `uv run pytest tests/unit/test_diff/ -k mark -x` | ✅ (需扩展) |
| KB-02 | scroll_by_doc_id 返回正确 chunk 列表 | unit | `uv run pytest tests/unit/test_knowledge/ -k chunks -x` | ❌ Wave 0 |
| KB-03 | create_manual_entry 向量化入库并设置 entry_type | integration | `uv run pytest tests/unit/test_knowledge/ -k manual -x` | ❌ Wave 0 |
| KB-04 | 第4个版本上传时自动删除最旧版本 | unit | `uv run pytest tests/unit/test_knowledge/ -k version_limit -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `uv run pytest tests/unit/test_<affected_module>/ -x -q`
- **Per wave merge:** `uv run pytest -v --tb=short`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/test_dashboard/test_trend.py` — 覆盖 DSH-02 get_trend_stats
- [ ] `tests/unit/test_knowledge/test_chunks.py` — 覆盖 KB-02 scroll_by_doc_id
- [ ] `tests/unit/test_knowledge/test_manual_entry.py` — 覆盖 KB-03 手动添加条目
- [ ] `tests/unit/test_knowledge/test_version_limit.py` — 覆盖 KB-04 版本限额（3版自动清理）

---

## Sources

### Primary (HIGH confidence)
- 直接代码审查：`backend/app/modules/testcases/` — 确认 FolderTree/ImportDialog/ExportService 现状
- 直接代码审查：`backend/app/modules/dashboard/service.py` — 确认现有统计端点实现
- 直接代码审查：`backend/app/modules/diff/` — 确认 RequirementDiff 模型 + DiffService
- 直接代码审查：`backend/app/modules/knowledge/` — 确认 category/entry_type/is_active 字段
- 直接代码审查：`frontend/src/app/(main)/testcases/` — 确认 FolderTree/ImportDialog 已实现状态
- 直接代码审查：`frontend/src/app/(main)/page.tsx` — 确认仪表盘当前实现

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — ImportDialog 1000行 Fragile 组件警告、Celery stub 风险
- `CLAUDE.md` — Recharts 指定用于看板、sy-* color token 规范
- `.planning/REQUIREMENTS.md` — 34个 Phase 4 需求详细描述

### Tertiary (LOW confidence)
- XMind 库具体版本：未直接检查 `pyproject.toml` 中的 xmind 依赖
- `engine/diff/impact_analyzer.py` 语义分析实现状态：未深度阅读

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 项目已有库，直接从代码文件确认
- Architecture: HIGH — 基于代码库直接审查，现有组件清晰
- Pitfalls: HIGH — 来自 STATE.md 明确记录的已知问题 + 代码分析
- DSH-02 折线图数据端点: MEDIUM — 需要新建，设计方案合理但未验证性能
- KB-02 Qdrant chunk 检索: MEDIUM — scroll API 合理，但 retriever.py 具体接口未完整阅读

**Research date:** 2026-03-16
**Valid until:** 2026-04-16（30天，技术栈稳定）
