# Phase 5: 体验收尾 - Research

**Researched:** 2026-03-16
**Domain:** UI/UX Polish, Recycle Bin, Template Prompt Management
**Confidence:** HIGH

## Summary

Phase 5 聚焦于平台整体体验收尾，包括全局 UI 规范统一（按钮文案、删除弹窗、空状态、加载状态）、首次引导流程、帮助浮动按钮、回收站软删除链路完善、以及模板库 Prompt Tab 功能实现。

**Primary recommendation:** 复用现有组件（ConfirmDialog、EmptyState、AiConfigBanner、OnboardingGuide）进行扩展，避免重复造轮子。回收站 cleanup API 已存在，只需前端调用。Prompt Tab 从后端读取 `_MODULE_PROMPTS` 字典并展示。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### 首次引导弹窗（UX-06）
- **内容**：展示核心流程图「需求录入 → AI 分析 → 测试点确认 → 用例生成 → 用例库」，让用户理解平台核心价值
- **存储方式**：localStorage，key 为 `sisyphus-onboarding-complete`，值为 `"true"` 或时间戳
- **触发时机**：首次访问任意页面时弹出（检查 localStorage 中无标记时触发）
- **重新查看**：右下角帮助浮动按钮点击后可重新打开引导弹窗
- **弹窗结构**：全屏模态框，底部「跳过」和「下一步」按钮，最后一步「开始使用」

#### 全局 UI 规范（UX-01~05）
- **按钮文案统一**：
  - 运行脚本全局扫描替换「新增」「创建」→「新建」
  - 保留例外：上传、添加、导入（不改为「新建」）
  - 格式：「新建 + 对象名」，如「新建需求」「新建用例」「新建模板」
- **删除弹窗模板**：
  - 统一使用 `ConfirmDialog` 组件，通过 `variant` prop 切换
  - `variant="simple"`：简单删除，description 为「确定删除「xxx」？删除后可在回收站中找回。」
  - `variant="cascade"`：级联删除，description 显示影响范围「将同时删除 N 条关联用例」，确认按钮用 `sy-danger`
- **空状态页面**：
  - 复用现有 `EmptyState` 组件
  - 统一规范：图标 48px + 暂无文案 + 引导操作按钮
  - 搜索无结果时不显示新建按钮
- **加载状态规范**：
  - 列表首次加载：骨架屏（animate-pulse）
  - 按钮操作：Loader2 + 文字切换（如「保存中...」）
  - 路由跳转：nprogress 进度条
  - 弹窗内：Spinner 居中
  - 规范记录在 CLAUDE.md，通过代码审查确保一致性

#### 回收站完善（REC-01~03）
- **30 天自动清理**：
  - 触发方式：前端访问回收站页面时调用 `POST /recycle/cleanup` API
  - 后端 `cleanup_expired()` 根据 `deleted_at < now() - 30 days` 自动判断并物理删除
  - 无需 Celery 定时任务（当前为 stub）
- **恢复时原目录不存在**：
  - 自动移入「未分类」目录
  - Toast 提示「原目录已删除，已移入未分类」
  - 「未分类」目录不可删除/重命名，作为兜底
- **即将过期通知**：
  - 仅页面提示：剩余天数列 + 到期前 3 天标红
  - 无主动推送通知（无通知中心）
- **批量恢复**：
  - 已有 `batch_restore` API，Toast 汇总「成功恢复 N 条」

#### 模板库 Prompt Tab（TPL-01~03）
- **CRUD 与设置页关系**：
  - Prompt Tab 只读展示系统 Prompt 列表
  - 编辑按钮点击跳转「设置 → Prompt 管理」
  - 不在模板库内直接编辑，保持单一编辑入口
- **数据来源**：
  - 读取 `app/ai/prompts.py` 中的 `_MODULE_PROMPTS` 字典
  - 支持查看默认值和「恢复默认」功能
  - 用户覆盖值存储在 DB `prompt_config` 表，读取时合并
- **Prompt 模板字段结构**：
  - 适用模块（module）：如 diagnosis、scene_map、generation
  - 身份声明（identity）：角色描述
  - 任务边界（task_boundary）：职责范围
  - 输出规范（output_format）：响应格式要求
  - 质量红线（quality_constraints）：禁止事项
- **导出/导入格式**：
  - 导出：Markdown 文件，每个 Prompt 一个 section
  - 导入：解析 Markdown 填充表单，预览后确认
  - 便于版本控制和阅读

#### 帮助浮动按钮（UX-07）
- **位置**：`fixed bottom-6 right-6`
- **样式**：sy-accent 背景 + HelpCircle 图标 + 圆形
- **点击行为**：打开帮助菜单，包含「重新查看引导」「快捷键」「反馈问题」
- **常驻显示**：所有页面可见，不随滚动隐藏

#### AI 未配置警告横幅（UX-08）
- **复用现有**：`AiConfigBanner` 组件已在分析台/工作台使用
- **扩展位置**：确保分析台、工作台、用例库（如涉及 AI 功能）均显示
- **内容**：「AI 未配置，部分功能不可用」+「前往配置」跳转链接

### Claude's Discretion

- 首次引导弹窗的具体步骤数和动画效果
- 帮助按钮菜单的具体选项和图标
- 空状态图标的颜色和具体样式
- Markdown 导出的具体格式细节

### Deferred Ideas (OUT OF SCOPE)

- 系统通知中心（登录时 Toast 提示即将过期数据）—— 需要通知系统重构后实现
- Prompt 模板在线分享/市场 —— 超出当前迭代范围
- 移动端首次引导适配 —— 当前优先桌面端

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | 按钮文案统一「新建 + 对象名」，全局搜索消除「新增」「创建」 | 全局脚本扫描 + sed 替换，已有 confirm/cancel 模式参考 |
| UX-02 | 简单删除弹窗：「确定删除「xxx」？删除后可在回收站中找回。」 | ConfirmDialog 已存在，需扩展 `variant="simple"` |
| UX-03 | 级联删除弹窗：显示影响范围（N条用例），危险按钮用 sy-danger | ConfirmDialog 需扩展 `variant="cascade"` + impactCount prop |
| UX-04 | 空状态页面：图标48px + 暂无文案 + 引导操作按钮 | EmptyState 组件已存在，icon 默认 w-12 h-12 满足需求 |
| UX-05 | 列表首次加载用骨架屏，按钮操作用 Loader2，路由跳转用 nprogress | 现有代码已使用 Loader2 + animate-spin，需统一骨架屏组件 |
| UX-06 | 首次登录全屏引导弹窗（核心流程图），只弹一次 | OnboardingGuide 组件已实现，使用 `sisyphus-y-onboarding-seen` key |
| UX-07 | 右下角固定「?」帮助浮动按钮 | OnboardingGuideButton 已存在，位置 fixed bottom-6 right-6 |
| UX-08 | AI 未配置时分析台/工作台顶部显示固定警告横幅 | AiConfigBanner 组件已存在，需扩展到用例库 |
| REC-01 | 回收站30天自动清理，到期前3天标红，支持手动清空 | 后端 cleanup API 已存在，前端需在 page load 时调用 |
| REC-02 | 回收站 Tab 筛选：全部/需求/用例/知识库文档 | recycle/page.tsx 已有 filter 实现，需确认 entity_type 映射 |
| REC-03 | 恢复时原目录不存在则移入「未分类」，支持批量恢复并 Toast 汇总 | batch_restore API 已存在，需处理目录不存在逻辑 |
| TPL-01 | 模板库双 Tab：Prompt 模板 + 用例结构模板 | templates/page.tsx 已有双 Tab 框架，Prompt Tab 显示「即将上线」 |
| TPL-02 | 内置数据中台场景默认模板（只读「内置」Badge），可复制后另存 | 现有模板已有 isBuiltin 字段和 Star 图标 |
| TPL-03 | 模板导出/导入 JSON | 需新建导出/导入 API 端点和前端组件 |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lucide-react | latest | 图标库 | 项目统一使用，禁止 emoji 作 UI 元素 |
| sonner | latest | Toast 通知 | 全局 toast() 调用，已在项目中使用 |
| tailwindcss | v3 | 样式系统 | 使用 sy-* 颜色 token，禁止硬编码色值 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-themes | latest | 主题切换 | 已在 layout.tsx 中使用 |
| nprogress | latest | 路由进度条 | UX-05 路由跳转加载状态 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 自建 Modal 组件 | ConfirmDialog | 已有 ConfirmDialog，扩展 variant 即可 |
| 新建 Onboarding 组件 | OnboardingGuide | 已存在完整实现，需调整触发逻辑 |

**Installation:**
```bash
# 无需额外安装，所有依赖已在项目中
cd frontend && bun install
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── components/ui/           # 通用 UI 组件
│   ├── ConfirmDialog.tsx    # 扩展 variant prop
│   ├── EmptyState.tsx       # 复用现有
│   ├── AiConfigBanner.tsx   # 复用现有
│   ├── OnboardingGuide.tsx  # 复用现有
│   └── TableSkeleton.tsx    # 复用现有
├── app/(main)/
│   ├── recycle/page.tsx     # 添加 cleanup API 调用
│   └── templates/page.tsx   # 实现 Prompt Tab
└── lib/api.ts               # 添加 prompts API

backend/app/
├── ai/prompts.py            # _MODULE_PROMPTS 数据源
├── modules/
│   ├── recycle/
│   │   ├── router.py        # cleanup API 已存在
│   │   └── service.py       # cleanup_expired() 已存在
│   └── templates/
│       └── router.py        # 新增 prompts 列表端点
```

### Pattern 1: ConfirmDialog Variant 扩展
**What:** 扩展现有 ConfirmDialog 组件支持 simple/cascade 两种删除模式
**When to use:** UX-02/UX-03 删除确认弹窗
**Example:**
```typescript
// Source: 现有 ConfirmDialog.tsx 扩展
interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default' | 'simple' | 'cascade';
  impactCount?: number;  // cascade 模式显示影响数量
}

// cascade 模式 description 生成
const cascadeDescription = `确定删除「${itemName}」？将同时删除 ${impactCount} 条关联用例。此操作不可撤销。`;

// simple 模式 description 生成
const simpleDescription = `确定删除「${itemName}」？删除后可在回收站中找回。`;
```

### Pattern 2: 回收站 Cleanup 调用
**What:** 在回收站页面加载时调用 cleanup API
**When to use:** REC-01 30天自动清理
**Example:**
```typescript
// Source: backend/app/modules/recycle/router.py 已有端点
// POST /recycle/cleanup?retention_days=30

// frontend/src/app/(main)/recycle/page.tsx
useEffect(() => {
  async function initRecycle() {
    // 先执行清理
    await recycleApi.cleanup();
    // 再加载列表
    await loadItems(filter);
  }
  void initRecycle();
}, []);

// frontend/src/lib/api.ts 添加
export const recycleApi = {
  // ...existing methods
  cleanup: () => api.post<{ deleted: number }>('/recycle/cleanup'),
};
```

### Pattern 3: Prompt Tab 数据获取
**What:** 从后端读取 _MODULE_PROMPTS 字典并展示
**When to use:** TPL-01 模板库 Prompt Tab
**Example:**
```typescript
// backend/app/modules/templates/router.py 新增端点
@router.get("/prompts")
async def list_prompts() -> list[PromptTemplateResponse]:
    """返回所有模块的 Prompt 模板列表"""
    return [
        {
            "module": "diagnosis",
            "display_name": "需求分析",
            "identity": "...",
            "task_boundary": "...",
            "output_format": "...",
            "quality_constraints": "...",
        },
        // ...其他模块
    ]

// frontend Prompt Tab 组件
const [prompts, setPrompts] = useState<PromptTemplate[]>([]);

useEffect(() => {
  templatesApi.listPrompts().then(setPrompts);
}, []);
```

### Anti-Patterns to Avoid
- **硬编码色值**：禁止 `style={{ color: '#00d9a3' }}`，使用 `className="text-sy-accent"`
- **emoji 作 UI 元素**：禁止使用 emoji 作为图标，统一使用 lucide-react
- **重复造轮子**：ConfirmDialog、EmptyState、AiConfigBanner 已存在，直接复用

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 删除确认弹窗 | 自建 Modal | ConfirmDialog + variant | 已有基础结构，扩展即可 |
| 空状态展示 | 自建 Empty 组件 | EmptyState | 已有 icon/title/description/action 结构 |
| 首次引导 | 自建 Guide 组件 | OnboardingGuide | 已实现完整流程图 + localStorage |
| Toast 通知 | 自建 toast | sonner toast() | 全局统一使用 |
| AI 配置警告 | 自建 Banner | AiConfigBanner | 已有完整样式和跳转逻辑 |

**Key insight:** Phase 5 主要是「补全」和「统一」工作，大部分功能已有基础实现，重点是扩展和一致性。

## Common Pitfalls

### Pitfall 1: 忘记调用回收站清理 API
**What goes wrong:** 页面加载时未调用 cleanup，导致过期数据未清理
**Why it happens:** 后端 API 已存在但前端未调用
**How to avoid:** 在 `useEffect` 初始化时先调用 `recycleApi.cleanup()` 再加载列表
**Warning signs:** 回收站显示超过 30 天的数据

### Pitfall 2: 删除弹窗文案不统一
**What goes wrong:** 不同页面使用不同的删除确认文案
**Why it happens:** 缺少统一的 ConfirmDialog variant 封装
**How to avoid:** 扩展 ConfirmDialog 支持 simple/cascade variant，统一文案模板
**Warning signs:** 代码审查发现硬编码的删除文案

### Pitfall 3: Prompt Tab 直接编辑
**What goes wrong:** 在模板库 Prompt Tab 直接编辑 Prompt，与设置页冲突
**Why it happens:** 未遵循「单一编辑入口」原则
**How to avoid:** Prompt Tab 只读展示，编辑按钮跳转设置页
**Warning signs:** 模板库出现 Prompt 编辑表单

### Pitfall 4: 帮助按钮与引导弹窗分离
**What goes wrong:** 帮助按钮和首次引导使用不同组件
**Why it happens:** 未复用 OnboardingGuide 组件
**How to avoid:** 帮助按钮点击后打开同一个 OnboardingGuideModal
**Warning signs:** 出现两个不同的引导弹窗实现

## Code Examples

Verified patterns from existing codebase:

### ConfirmDialog 扩展（UX-02/03）
```typescript
// Source: frontend/src/components/ui/ConfirmDialog.tsx
// 现有 variant: 'danger' | 'warning' | 'default'
// 需扩展为: 'danger' | 'warning' | 'default' | 'simple' | 'cascade'

const confirmClass =
  variant === 'danger' || variant === 'cascade'
    ? 'bg-red text-white hover:bg-red/90'
    : variant === 'warning'
      ? 'bg-amber text-white hover:bg-amber/90'
      : 'bg-accent text-white hover:bg-accent2';
```

### 回收站页面调用清理（REC-01）
```typescript
// Source: frontend/src/app/(main)/recycle/page.tsx
// 现有 loadItems 函数
const loadItems = useCallback(async (activeFilter: FilterType) => {
  setLoading(true);
  setError(null);
  try {
    // 新增：先执行过期清理
    await recycleApi.cleanup();

    const data = await recycleApi.list({
      entityType: activeFilter === 'all' ? undefined : activeFilter,
      pageSize: 100,
    });
    setItems(data.items);
    setTotal(data.total);
  } catch (err) {
    // ...
  }
}, []);
```

### Prompt 列表端点（TPL-01）
```python
# Source: backend/app/ai/prompts.py
_MODULE_PROMPTS: dict[str, str] = {
    "diagnosis": DIAGNOSIS_SYSTEM,
    "scene_map": SCENE_MAP_SYSTEM,
    "generation": GENERATION_SYSTEM,
    "diagnosis_followup": DIAGNOSIS_FOLLOWUP_SYSTEM,
    "diff": DIFF_SEMANTIC_SYSTEM,
    "exploratory": EXPLORATORY_SYSTEM,
}

# 新增端点 backend/app/modules/templates/router.py
from app.ai.prompts import _MODULE_PROMPTS

PROMPT_DISPLAY_NAMES = {
    "diagnosis": "需求分析",
    "scene_map": "场景地图",
    "generation": "用例生成",
    "diagnosis_followup": "深度追问",
    "diff": "变更分析",
    "exploratory": "对话式工作台",
}

@router.get("/prompts")
async def list_prompts() -> list[dict]:
    """返回所有模块的 Prompt 模板列表（只读）"""
    return [
        {
            "module": module,
            "display_name": PROMPT_DISPLAY_NAMES.get(module, module),
            "has_override": False,  # TODO: 检查 prompt_config 表
        }
        for module in _MODULE_PROMPTS.keys()
    ]
```

### EmptyState 使用（UX-04）
```typescript
// Source: frontend/src/components/ui/EmptyState.tsx
// 现有结构已满足需求
<EmptyState
  icon={<ClipboardList className="w-12 h-12" />}  // 48px
  title="暂无用例"
  description="当前需求尚未生成用例，请先完成测试点确认"
  action={<button className="btn btn-primary">前往工作台</button>}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 各页面自定义删除弹窗 | ConfirmDialog 统一 | Phase 5 | 文案一致性 |
| 无首次引导 | OnboardingGuide | Phase 4 已实现 | 用户上手体验 |
| Prompt Tab 显示「即将上线」 | 实际读取数据展示 | Phase 5 | 功能完整 |

**Deprecated/outdated:**
- 直接在组件内硬编码删除文案：应使用 ConfirmDialog + variant

## Open Questions

1. **Prompt 导出 Markdown 格式细节**
   - What we know: CONTEXT.md 指定导出为 Markdown 文件
   - What's unclear: 每个 section 的具体格式（标题层级、字段分隔符）
   - Recommendation: 参考 `_MODULE_PROMPTS` 的四段式结构，使用 H2 作为模块名，H3 作为字段名

2. **帮助按钮菜单具体选项**
   - What we know: 包含「重新查看引导」「快捷键」「反馈问题」
   - What's unclear: 快捷键具体有哪些，反馈问题跳转哪里
   - Recommendation: 快捷键列表可延后，反馈问题跳转 GitHub Issues

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun test (frontend) + pytest (backend) |
| Config file | `bunfig.toml` / `pyproject.toml` |
| Quick run command | `bun test` / `uv run pytest -x` |
| Full suite command | `bun test` / `uv run pytest --cov=app` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-01 | 按钮文案统一 | E2E | `bun test` | Wave 0 |
| UX-02 | 简单删除弹窗 | Unit | `bun test ConfirmDialog.test.tsx` | Wave 0 |
| UX-03 | 级联删除弹窗 | Unit | `bun test ConfirmDialog.test.tsx` | Wave 0 |
| UX-04 | 空状态组件 | Unit | `bun test EmptyState.test.tsx` | Wave 0 |
| UX-05 | 加载状态规范 | Visual | Manual | N/A |
| UX-06 | 首次引导弹窗 | Unit | `bun test OnboardingGuide.test.tsx` | Existing |
| UX-07 | 帮助浮动按钮 | Unit | `bun test OnboardingGuide.test.tsx` | Existing |
| UX-08 | AI 配置警告 | Unit | `bun test AiConfigBanner.test.tsx` | Wave 0 |
| REC-01 | 30天自动清理 | Integration | `uv run pytest tests/unit/test_recycle/ -x` | Existing |
| REC-02 | Tab 筛选 | Unit | `bun test recycle/page.test.tsx` | Wave 0 |
| REC-03 | 批量恢复 | Unit | `uv run pytest tests/unit/test_recycle/ -x` | Existing |
| TPL-01 | Prompt Tab 展示 | Unit | `bun test templates/page.test.tsx` | Wave 0 |
| TPL-02 | 内置模板 Badge | Unit | `bun test templates/page.test.tsx` | Wave 0 |
| TPL-03 | 导出/导入 | Unit | `uv run pytest tests/unit/test_templates/ -x` | Existing |

### Sampling Rate
- **Per task commit:** `bun test` / `uv run pytest -x`
- **Per wave merge:** `bun test` / `uv run pytest --cov=app`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/components/ui/ConfirmDialog.test.tsx` — covers UX-02/03 variant 扩展
- [ ] `frontend/src/components/ui/EmptyState.test.tsx` — covers UX-04
- [ ] `frontend/src/components/ui/AiConfigBanner.test.tsx` — covers UX-08
- [ ] `frontend/src/app/(main)/recycle/page.test.tsx` — covers REC-02
- [ ] `frontend/src/app/(main)/templates/page.test.tsx` — covers TPL-01/02
- [ ] `backend/app/modules/templates/test_prompts_api.py` — covers TPL-01 后端

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

## Sources

### Primary (HIGH confidence)
- `frontend/src/components/ui/ConfirmDialog.tsx` - 现有组件结构
- `frontend/src/components/ui/EmptyState.tsx` - 现有组件结构
- `frontend/src/components/ui/AiConfigBanner.tsx` - 现有组件结构
- `frontend/src/components/ui/OnboardingGuide.tsx` - 完整引导实现
- `frontend/src/app/(main)/recycle/page.tsx` - 回收站页面实现
- `frontend/src/app/(main)/templates/page.tsx` - 模板库页面实现
- `backend/app/modules/recycle/service.py` - cleanup_expired() 实现
- `backend/app/modules/recycle/router.py` - cleanup API 端点
- `backend/app/ai/prompts.py` - _MODULE_PROMPTS 数据源

### Secondary (MEDIUM confidence)
- CONTEXT.md 锁定决策 - 用户明确指定实现方案

### Tertiary (LOW confidence)
- N/A - 所有信息均来自代码库或 CONTEXT.md

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 项目已有完整技术栈
- Architecture: HIGH - 现有组件可直接复用
- Pitfalls: HIGH - 基于 CONTEXT.md 明确约束

**Research date:** 2026-03-16
**Valid until:** 30 days (stable patterns)
