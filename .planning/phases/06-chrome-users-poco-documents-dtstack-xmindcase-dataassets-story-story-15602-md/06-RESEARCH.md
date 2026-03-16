# Phase 6: 浏览器全量测试 - Research

**Researched:** 2026-03-17
**Domain:** Chrome DevTools MCP E2E 测试 + Markdown 渲染
**Confidence:** HIGH

## Summary

Phase 6 包含两个核心任务：(1) 修复需求模块的 Markdown 渲染和图片显示问题，(2) 使用 Chrome DevTools MCP 对平台主链路进行端到端测试。

Markdown 渲染方面，项目已安装 `react-markdown@10.1.0`，且在 `TestStandardEditor.tsx` 中有成熟的渲染模式可供复用。需求详情组件 `RequirementDetailTab.tsx` 目前使用 `whitespace-pre-wrap` 显示原始文本，需要改为 `ReactMarkdown` 组件渲染。

图片处理方面，后端已有 `image_handler.py` 实现外链图片抓取和 MinIO 归档，但 `/api/files/` 端点尚未实现，需要新增。测试数据 `Story-15602.md` 包含 3 张外链图片（蓝湖）和 1 张本地图片（Obsidian 语法），需要特殊处理。

Chrome DevTools MCP 提供约 29 个工具覆盖 6 大类：输入自动化、导航、模拟、性能、网络、调试，可用于端到端测试主链路流程。

**Primary recommendation:** 先实现 Markdown 渲染和图片端点，再通过 Chrome DevTools MCP 执行主链路 E2E 测试。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **主链路端到端测试**：分析台 → 工作台 → 用例库 核心流程
- 不覆盖全部 21 个模块，聚焦最关键用户场景
- 测试数据仅使用 Story-15602.md 一个真实需求

### 图片处理方案
- **图片上传目标**：MinIO（使用现有 `image_handler.py` 归档流程）
- **图片路径**：手动上传图片到 MinIO，生成临时访问 URL
- **图片语法**：仅支持标准 Markdown `![alt](url)` 语法，不额外支持 Obsidian `![[image.png]]`
- **相关图片位置**：`/Users/poco/Documents/DTStack/XmindCase/Assets/img/Pasted image 20260316170939.png`

### Markdown 渲染
- **渲染范围**：全局需求内容展示（所有显示需求内容的地方都使用 Markdown 渲染）
- **主要组件**：`RequirementDetailTab.tsx` 需要从 `whitespace-pre-wrap` 改为 Markdown 渲染
- **渲染库选择**：使用 `react-markdown` 或类似库，支持图片、链接、代码块等

### 验收标准
- **全功能通过**：所有按钮、表单、交互都正常工作
- 主链路端到端零报错
- 需求内容正确渲染 Markdown 格式和图片

### Claude's Discretion
- 具体使用哪个 Markdown 渲染库（react-markdown / marked / 其他）
- Markdown 渲染的样式细节
- Chrome 自动化测试的具体步骤和断言

### Deferred Ideas (OUT OF SCOPE)
None - 讨论保持在阶段范围内

</user_constraints>

<phase_requirements>
## Phase Requirements

Phase 6 是端到端测试阶段，主要任务是验证主链路功能和修复前置问题。具体需求：

| ID | Description | Research Support |
|----|-------------|-----------------|
| MD-01 | RequirementDetailTab Markdown 渲染 | react-markdown 已安装，参考 TestStandardEditor.tsx 模式 |
| IMG-01 | /api/files/ 端点实现 | image_handler.py 提供归档能力，需新增路由 |
| IMG-02 | 本地图片上传到 MinIO | 手动调用 archive_image() 或通过 CLI 上传 |
| IMG-03 | Obsidian 语法转换 | 需预处理将 `![[image.png]]` 转为 `![image](url)` |
| E2E-01 | 分析台功能验证 | Chrome DevTools MCP 工具链 |
| E2E-02 | 工作台功能验证 | Chrome DevTools MCP 工具链 |
| E2E-03 | 用例库功能验证 | Chrome DevTools MCP 工具链 |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-markdown | 10.1.0 | Markdown 渲染 | 项目已安装，React 生态标准选择 |
| Chrome DevTools MCP | latest | 浏览器自动化 | Claude Code 内置 MCP 工具 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| remark-gfm | - | GitHub 风格 Markdown 扩展 | 如需支持表格、删除线等 |
| rehype-raw | - | HTML 渲染 | 如需支持原始 HTML 标签 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-markdown | marked + DOMPurify | marked 更轻量但需手动处理 XSS |
| react-markdown | MDX | MDX 支持组件但复杂度高 |

**Installation:**
```bash
# react-markdown 已安装
# 如需扩展支持：
cd frontend && bun add remark-gfm rehype-raw
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── app/(main)/
│   └── diagnosis/_components/
│       └── RequirementDetailTab.tsx   # 需改为 MD 渲染
├── components/
│   └── ui/
│       └── MarkdownRenderer.tsx       # 可选：统一 MD 渲染组件

backend/app/
├── modules/
│   └── files/                         # 新增模块
│       └── router.py                  # /api/files/{path} 端点
└── engine/uda/
    └── image_handler.py               # 现有图片归档逻辑
```

### Pattern 1: react-markdown 渲染模式
**What:** 使用 ReactMarkdown 组件渲染 Markdown，配合 Tailwind prose 样式
**When to use:** 任何需要渲染用户输入 Markdown 的场景
**Example:**
```tsx
// Source: frontend/src/app/(main)/settings/_components/TestStandardEditor.tsx
import ReactMarkdown from 'react-markdown';

// 渲染模式（参考 TestStandardEditor.tsx 第 111-113 行）
<div className="prose-sm text-text2 text-[13px] leading-relaxed
  [&_h1]:text-text [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-4
  [&_h2]:text-text [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2
  [&_ul]:pl-5 [&_ul]:list-disc [&_li]:mb-1
  [&_code]:font-mono [&_code]:text-accent [&_code]:bg-bg3 [&_code]:px-1 [&_code]:rounded
  [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-border">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>
```

### Pattern 2: 图片归档与访问流程
**What:** 外链图片自动下载归档，本地图片手动上传，统一通过 `/api/files/` 访问
**When to use:** 需求文档包含图片时
**Example:**
```python
# Source: backend/app/engine/uda/image_handler.py

# 1. 归档图片到 MinIO
async def archive_image(file_bytes, original_filename, requirement_id=None):
    # 返回 "sisyphus-images/images/{req_id}/{hash}.png"

# 2. 生成临时访问 URL（24小时有效）
def get_image_url(object_path, expires_hours=24):
    # 返回 presigned URL

# 3. 外链图片抓取并替换
async def fetch_and_archive_external_images(markdown_content, requirement_id):
    # 将 https://example.com/img.png 替换为 /api/files/sisyphus-images/images/...
```

### Pattern 3: Chrome DevTools MCP 测试流程
**What:** 使用 MCP 工具链进行浏览器自动化测试
**When to use:** E2E 功能验证
**Example:**
```markdown
# 典型测试流程
1. mcp__chrome-devtools__navigate - 打开页面
2. mcp__chrome-devtools__screenshot - 验证初始状态
3. mcp__chrome-devtools__click - 点击按钮/链接
4. mcp__chrome-devtools__type - 输入文本
5. mcp__chrome-devtools__wait_for - 等待元素出现
6. mcp__chrome-devtools__evaluate - 执行 JS 断言
```

### Anti-Patterns to Avoid
- **直接使用 dangerouslySetInnerHTML:** 存在 XSS 风险，必须用 ReactMarkdown
- **硬编码图片 URL:** 图片应通过 MinIO 归档，避免外链失效
- **忽略 Obsidian 语法:** 测试数据包含 `![[image.png]]`，需预处理转换

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown 解析 | 自定义正则解析器 | react-markdown | 边界情况多，XSS 风险 |
| 图片存储 | 本地文件系统 | MinIO | 分布式、持久化、CDN 友好 |
| 浏览器自动化 | Puppeteer 脚本 | Chrome DevTools MCP | Claude 原生集成，更简洁 |

**Key insight:** react-markdown 已处理 CommonMark 规范的所有边界情况，包括代码块、表格、图片等。自行解析容易遗漏安全漏洞。

## Common Pitfalls

### Pitfall 1: /api/files/ 端点缺失
**What goes wrong:** `image_handler.py` 将图片 URL 替换为 `/api/files/...`，但后端没有对应路由，导致图片 404
**Why it happens:** 归档逻辑已实现，但访问端点未同步实现
**How to avoid:** 新增 `/api/files/{bucket}/{path:path}` 路由，调用 `get_image_url()` 返回重定向或代理响应
**Warning signs:** 测试中看到 `/api/files/` 开头的请求返回 404

### Pitfall 2: Obsidian 图片语法不兼容
**What goes wrong:** `Story-15602.md` 使用 `![[Pasted image 20260316170939.png]]` 语法，react-markdown 无法识别
**Why it happens:** Obsidian 使用非标准 Markdown 扩展语法
**How to avoid:** 预处理 Markdown 内容，将 `![[filename]]` 转换为 `![filename](/api/files/...)`
**Warning signs:** 渲染后图片位置显示为原始文本

### Pitfall 3: Chrome MCP 测试不稳定
**What goes wrong:** 页面加载慢导致断言失败，或元素选择器变化
**Why it happens:** 异步加载、动态 ID、动画延迟
**How to avoid:** 使用 `wait_for` 工具等待元素出现，选择器优先用 data-testid 或稳定 class
**Warning signs:** 测试时断时续，需要多次重试

### Pitfall 4: 外链图片无法访问
**What goes wrong:** 蓝湖图片 URL 需要登录或有防盗链
**Why it happens:** 外链图片可能有访问限制
**How to avoid:** 测试前手动检查外链是否可访问，或提前归档到 MinIO
**Warning signs:** `fetch_and_archive_external_images` 日志显示抓取失败

## Code Examples

Verified patterns from official sources:

### Markdown 渲染集成 (RequirementDetailTab.tsx 修改)
```tsx
// Source: 参考 TestStandardEditor.tsx 模式
import ReactMarkdown from 'react-markdown';

// 在 RequirementDetailTab.tsx 第 203 行替换：
// 原: <div className="text-[13px] text-text leading-relaxed whitespace-pre-wrap">
// 新:
<div className="text-[13px] text-text leading-relaxed
  prose prose-sm prose-invert max-w-none
  [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-4
  [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2
  [&_ul]:pl-5 [&_ul]:list-disc [&_li]:mb-1
  [&_code]:font-mono [&_code]:text-accent [&_code]:bg-bg3 [&_code]:px-1 [&_code]:rounded
  [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-3
  [&_a]:text-accent [&_a]:underline">
  <ReactMarkdown>{rawContent}</ReactMarkdown>
</div>
```

### /api/files/ 端点实现
```python
# Source: 需新增 backend/app/modules/files/router.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from app.engine.uda.image_handler import get_image_url

router = APIRouter(prefix="/files", tags=["files"])

@router.get("/{bucket}/{path:path}")
async def serve_file(bucket: str, path: str):
    """代理 MinIO 文件访问，返回 presigned URL 重定向"""
    object_path = f"{bucket}/{path}"
    try:
        url = get_image_url(object_path, expires_hours=24)
        return RedirectResponse(url=url)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
```

### Obsidian 语法预处理
```typescript
// 将 ![[image.png]] 转换为 ![image](url)
function convertObsidianImages(content: string, imageUrlMap: Record<string, string>): string {
  return content.replace(/!\[\[([^\]]+)\]\]/g, (match, filename) => {
    const url = imageUrlMap[filename];
    if (url) {
      return `![${filename}](${url})`;
    }
    return match; // 保持原样如果找不到映射
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| whitespace-pre-wrap 纯文本 | ReactMarkdown 渲染 | Phase 6 | 支持富文本格式、图片、链接 |
| 外链图片直接引用 | MinIO 归档 + presigned URL | 已实现 | 避免外链失效，统一管理 |
| Puppeteer/Playwright 脚本 | Chrome DevTools MCP | Phase 6 | Claude 原生集成，降低维护成本 |

**Deprecated/outdated:**
- `whitespace-pre-wrap`: 不支持格式化，需改为 ReactMarkdown
- 直接引用外链图片: 存在失效风险，应归档到 MinIO

## Open Questions

1. **是否需要支持 remark-gfm 扩展？**
   - What we know: react-markdown 基础版不支持表格、删除线
   - What's unclear: Story-15602.md 是否包含表格语法
   - Recommendation: 先检查测试数据，如有表格则安装 remark-gfm

2. **本地图片上传方式？**
   - What we know: 图片在本地路径 `/Users/poco/Documents/DTStack/XmindCase/Assets/img/`
   - What's unclear: 手动上传还是通过 API 上传
   - Recommendation: 通过 Python 脚本调用 `archive_image()` 上传，或使用 MinIO 控制台

3. **Chrome MCP 测试的元素选择器策略？**
   - What we know: 页面可能有动态 ID
   - What's unclear: 哪些元素有稳定的 data-testid
   - Recommendation: 测试前检查页面结构，必要时添加 data-testid

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | frontend/vitest.config.ts |
| Quick run command | `cd frontend && bun test --run` |
| Full suite command | `cd frontend && bun test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MD-01 | Markdown 渲染显示格式化内容 | unit | `bun test RequirementDetailTab.test.tsx` | ❌ Wave 0 |
| IMG-01 | /api/files/ 返回图片 | unit | `pytest tests/unit/test_files/` | ❌ Wave 0 |
| E2E-01~03 | 主链路端到端流程 | e2e | Chrome DevTools MCP 手动/脚本 | N/A (MCP) |

### Sampling Rate
- **Per task commit:** `cd frontend && bun test --run`
- **Per wave merge:** `cd frontend && bun test && cd ../backend && uv run pytest`
- **Phase gate:** 全量测试通过 + Chrome MCP E2E 验证

### Wave 0 Gaps
- [ ] `frontend/src/app/(main)/diagnosis/_components/RequirementDetailTab.test.tsx` - covers MD-01
- [ ] `backend/app/modules/files/` - 新增模块，需 router.py + 测试
- [ ] `backend/tests/unit/test_files/test_router.py` - covers IMG-01

## Sources

### Primary (HIGH confidence)
- `frontend/src/app/(main)/settings/_components/TestStandardEditor.tsx` - react-markdown 使用模式
- `backend/app/engine/uda/image_handler.py` - 图片归档逻辑
- `frontend/package.json` - react-markdown@10.1.0 已安装

### Secondary (MEDIUM confidence)
- `frontend/src/app/(main)/diagnosis/_components/RequirementDetailTab.tsx` - 需修改的目标组件
- `backend/app/main.py` - 模块注册模式
- `/Users/poco/Documents/DTStack/XmindCase/DataAssets/Story/Story-15602.md` - 测试数据

### Tertiary (LOW confidence)
- Chrome DevTools MCP 工具文档 - Claude Code 内置，工具列表基于系统提示

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-markdown 已安装，TestStandardEditor.tsx 有成熟模式
- Architecture: HIGH - 图片归档逻辑完整，只需补充端点
- Pitfalls: MEDIUM - Chrome MCP 测试稳定性取决于页面实现

**Research date:** 2026-03-17
**Valid until:** 30 days (stable stack)
