# Delivery Acceptance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立一套可在前端进度大盘展示的全站交付验收与整改闭环，并完成首批高优先级体验修复。

**Architecture:** 以 progress.json 为单一交付过程记录源，先完成进度模型和大盘兼容改造，再启动前后端进行真实浏览器验收，按“验收任务 -> 问题条目 -> 修复验证”三轨闭环推进。实现过程中优先修复工作台流式反馈、模型配置、文档事实漂移和导航/模块不一致问题。

**Tech Stack:** Next.js App Router, TypeScript, FastAPI, Python 3.12, progress.json, Bun, uv, Playwright/browser tools

---

### Task 1: 固化进度模型

**Files:**

- Modify: progress.json
- Modify: frontend/src/app/api/progress/route.ts
- Modify: frontend/src/components/ui/ProgressDashboard.tsx

**Step 1: 写失败前提检查**

检查当前 progress API 是否只能表达 phase/module/task 的弱层次，无法区分验收/问题/验证。

**Step 2: 运行局部验证**

Run: bunx tsc --noEmit
Expected: 当前实现可以通过，但无法表达三轨交付语义。

**Step 3: 写最小实现**

- 扩展 progress.json 条目约定
- route.ts 增强 category/status 映射
- ProgressDashboard 增强状态文案与聚合展示

**Step 4: 再次验证**

Run: bunx tsc --noEmit
Expected: 通过

### Task 2: 建立交付验收任务骨架

**Files:**

- Modify: progress.json
- Create: process.json

**Step 1: 写失败前提检查**

确认 process.json 不存在，progress.json 仍是旧验收清单。

**Step 2: 写最小实现**

- 创建 process.json，记录本轮开发阶段
- 将 progress.json 扩充为全站验收、问题、修复验证三类条目

**Step 3: 验证 JSON 可读性**

Run: jq '.stats' progress.json && jq '.meta // .project' process.json
Expected: JSON 结构合法

### Task 3: 启动前后端并做全站现状验收

**Files:**

- Modify: progress.json

**Step 1: 启动依赖**

Run: bash ./init.sh 或按需分步启动 backend/frontend
Expected: 健康检查通过，前后端可访问

**Step 2: 浏览器实测所有现有入口**

覆盖：仪表盘、分析台、工作台、Diff、用例库、模板库、知识库、回收站、设置、test-plan

**Step 3: 将发现的问题写入 progress.json**

每个问题包含：位置、复现步骤、期望、实际、严重级别、建议策略。

### Task 4: 优先修复工作台生成体验

**Files:**

- Modify: frontend/src/app/(main)/workbench/\_components/GenerationPanel.tsx
- Modify: frontend/src/hooks/useSSE.ts
- Modify: backend/app/modules/generation/service.py
- Test: frontend/src/\*_/workbench_.test.tsx 或 backend/tests/unit/test_generation/\*

**Step 1: 写失败测试**

验证以下行为：

- 生成开始时一定有明确 loading
- thinking/content/case 事件任何一种到达时 UI 都有反馈
- SSE 异常时错误态和重试可见

**Step 2: 运行测试确认失败**

Run: 对应前端或后端测试命令
Expected: 至少一项失败，证明当前体验缺口存在

**Step 3: 写最小实现**

补足状态机、文案、超时兜底、空响应提示。

**Step 4: 重新运行测试**

Expected: 通过

### Task 5: 清理导航与模块暴露不一致

**Files:**

- Modify: frontend/src/app/(main)/layout.tsx
- Modify: backend/app/main.py
- Modify: README.md
- Modify: CLAUDE.md
- Modify: AGENTS.md
- Modify: .github/copilot-instructions.md

**Step 1: 写失败前提检查**

确认文档、导航、后端路由对 test_plan 等模块表述不一致。

**Step 2: 写最小实现**

按最终建议决定 keep/simplify/hide/refactor/remove，并同步文档事实。

**Step 3: 验证**

Run: bunx tsc --noEmit
Run: uv run pyright app/

### Task 6: 修复 AI 配置与文档事实漂移

**Files:**

- Modify: frontend/src/app/(main)/settings/\_components/AIModelSettings.tsx
- Modify: backend/app/modules/ai_config/router.py
- Modify: docs/功能实现文档.md
- Modify: README.md
- Modify: CHANGELOG.md

**Step 1: 写失败测试或行为验证**

关注 openrouter、自定义 provider、API key 展示、默认值与保存语义。

**Step 2: 实现与验证**

确保前后端 provider 能力与文档一致。

### Task 7: 修复 markdown 渲染、图片回显与文件体验

**Files:**

- Modify: frontend/src/\*\*
- Modify: backend/app/modules/files/\*\*
- Test: 相关前后端测试文件

**Step 1: 浏览器复现**

找出 markdown、图片预览、MinIO 回显、404 或跨域问题。

**Step 2: 写失败测试**

最小覆盖核心渲染和回显逻辑。

**Step 3: 实现并回归**

完成后记录修复验证条目。

### Task 8: 文档收敛与最终验收

**Files:**

- Modify: README.md
- Modify: CHANGELOG.md
- Modify: CLAUDE.md
- Modify: AGENTS.md
- Modify: .github/copilot-instructions.md
- Modify: progress.json
- Modify: process.json

**Step 1: 只保留已实现能力**

逐份清理超前描述、重复描述、已裁剪描述。

**Step 2: 运行最终验证**

Run: bunx biome check .
Run: bunx tsc --noEmit
Run: uv run ruff check .
Run: uv run pyright app/

**Step 3: 浏览器回归主流程**

覆盖分析台 -> 工作台 -> 用例库 -> 设置。

**Step 4: 更新验收结论**

只有在验证证据完整后，才更新 progress.json.acceptance_criteria.accepted。
