---
phase: 05-ti-yan-shou-wei
plan: 00
type: execute
wave: 0
depends_on: []
files_modified:
  - frontend/src/components/ui/ConfirmDialog.test.tsx
  - frontend/src/components/ui/EmptyState.test.tsx
  - frontend/src/components/ui/AiConfigBanner.test.tsx
  - frontend/src/components/ui/OnboardingGuide.test.tsx
  - frontend/src/components/ui/HelpFab.test.tsx
  - frontend/src/app/(main)/recycle/page.test.tsx
  - frontend/src/app/(main)/templates/page.test.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "所有 Wave 0 测试文件存在且包含 failing stubs"
    - "每个测试文件有 describe 块和基础 test stubs"
  artifacts:
    - path: "frontend/src/components/ui/ConfirmDialog.test.tsx"
      provides: "ConfirmDialog 测试脚手架"
    - path: "frontend/src/components/ui/EmptyState.test.tsx"
      provides: "EmptyState 测试脚手架"
    - path: "frontend/src/components/ui/AiConfigBanner.test.tsx"
      provides: "AiConfigBanner 测试脚手架"
    - path: "frontend/src/components/ui/OnboardingGuide.test.tsx"
      provides: "OnboardingGuide 测试脚手架"
    - path: "frontend/src/components/ui/HelpFab.test.tsx"
      provides: "HelpFab 测试脚手架"
    - path: "frontend/src/app/(main)/recycle/page.test.tsx"
      provides: "回收站页面测试脚手架"
    - path: "frontend/src/app/(main)/templates/page.test.tsx"
      provides: "模板库页面测试脚手架"
  key_links: []
---

<objective>
创建 Phase 5 所有需要的测试脚手架文件，为后续实现任务提供 RED 基线。

Purpose: 确保所有后续任务有可运行的 failing tests 作为 TDD 起点
Output: 7 个测试文件，每个包含基础 describe 块和 test stubs
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/05-ti-yan-shou-wei/05-VALIDATION.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: 创建组件测试脚手架</name>
  <files>
    frontend/src/components/ui/ConfirmDialog.test.tsx
    frontend/src/components/ui/EmptyState.test.tsx
    frontend/src/components/ui/AiConfigBanner.test.tsx
    frontend/src/components/ui/OnboardingGuide.test.tsx
    frontend/src/components/ui/HelpFab.test.tsx
  </files>
  <action>
1. 创建 ConfirmDialog.test.tsx：
   ```typescript
   import { describe, it, expect, vi } from 'bun:test'
   import { render, screen } from '@testing-library/react'
   import { ConfirmDialog } from './ConfirmDialog'

   describe('ConfirmDialog', () => {
     it('renders simple variant with recycle hint', () => {
       // RED: variant="simple" 时 description 包含「删除后可在回收站中找回」
       expect(true).toBe(false) // Stub - implement in 05-01
     })

     it('renders cascade variant with impact count', () => {
       // RED: variant="cascade" 时显示影响数量
       expect(true).toBe(false) // Stub - implement in 05-01
     })

     it('cascade variant uses danger button style', () => {
       // RED: variant="cascade" 时确认按钮使用 sy-danger 样式
       expect(true).toBe(false) // Stub - implement in 05-01
     })
   })
   ```

2. 创建 EmptyState.test.tsx：
   ```typescript
   import { describe, it, expect } from 'bun:test'
   import { render, screen } from '@testing-library/react'
   import { EmptyState } from './EmptyState'

   describe('EmptyState', () => {
     it('renders default icon with 48px size', () => {
       // RED: 默认图标尺寸为 w-12 h-12（48px）
       expect(true).toBe(false) // Stub - implement in 05-01
     })

     it('renders default title "暂无数据"', () => {
       expect(true).toBe(false) // Stub - implement in 05-01
     })

     it('renders action button when provided', () => {
       expect(true).toBe(false) // Stub - implement in 05-01
     })
   })
   ```

3. 创建 AiConfigBanner.test.tsx：
   ```typescript
   import { describe, it, expect } from 'bun:test'
   import { render, screen } from '@testing-library/react'
   import { AiConfigBanner } from './AiConfigBanner'

   describe('AiConfigBanner', () => {
     it('shows warning when AI not configured', () => {
       // RED: AI 未配置时显示警告横幅
       expect(true).toBe(false) // Stub - implement in 05-05
     })

     it('hides when AI is configured', () => {
       expect(true).toBe(false) // Stub - implement in 05-05
     })

     it('contains link to settings', () => {
       expect(true).toBe(false) // Stub - implement in 05-05
     })
   })
   ```

4. 创建 OnboardingGuide.test.tsx：
   ```typescript
   import { describe, it, expect, beforeEach } from 'bun:test'
   import { render, screen, fireEvent } from '@testing-library/react'
   import { OnboardingGuide } from './OnboardingGuide'

   describe('OnboardingGuide', () => {
     beforeEach(() => {
       localStorage.clear()
     })

     it('shows on first visit', () => {
       // RED: localStorage 无标记时显示引导
       expect(true).toBe(false) // Stub - implement in 05-05
     })

     it('hides after completion', () => {
       // RED: 关闭后设置 localStorage 标记
       expect(true).toBe(false) // Stub - implement in 05-05
     })

     it('does not show again after localStorage set', () => {
       // RED: 有标记后不再显示
       expect(true).toBe(false) // Stub - implement in 05-05
     })
   })
   ```

5. 创建 HelpFab.test.tsx：
   ```typescript
   import { describe, it, expect } from 'bun:test'
   import { render, screen, fireEvent } from '@testing-library/react'
   import { HelpFab } from './HelpFab'

   describe('HelpFab', () => {
     it('renders at fixed bottom-right position', () => {
       // RED: 固定在右下角 fixed bottom-6 right-6
       expect(true).toBe(false) // Stub - implement in 05-05
     })

     it('shows menu on click', () => {
       expect(true).toBe(false) // Stub - implement in 05-05
     })

     it('menu contains "重新查看引导" option', () => {
       expect(true).toBe(false) // Stub - implement in 05-05
     })
   })
   ```
</action>
  <verify>
    <automated>ls -la frontend/src/components/ui/*.test.tsx | wc -l | xargs -I {} sh -c 'test {} -ge 5 && echo "OK" || echo "MISSING"'</automated>
  </verify>
  <done>
    - ConfirmDialog.test.tsx 创建完成
    - EmptyState.test.tsx 创建完成
    - AiConfigBanner.test.tsx 创建完成
    - OnboardingGuide.test.tsx 创建完成
    - HelpFab.test.tsx 创建完成
  </done>
</task>

<task type="auto">
  <name>Task 2: 创建页面测试脚手架</name>
  <files>
    frontend/src/app/(main)/recycle/page.test.tsx
    frontend/src/app/(main)/templates/page.test.tsx
  </files>
  <action>
1. 创建 recycle/page.test.tsx：
   ```typescript
   import { describe, it, expect, vi, beforeEach } from 'bun:test'
   import { render, screen, waitFor } from '@testing-library/react'
   import RecyclePage from './page'

   vi.mock('@/lib/api', () => ({
     recycleApi: {
       cleanup: vi.fn().mockResolvedValue({ deleted: 0 }),
       list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
       restore: vi.fn().mockResolvedValue({}),
       batchRestore: vi.fn().mockResolvedValue({}),
     }
   }))

   describe('RecyclePage', () => {
     it('calls cleanup API on mount', async () => {
       // RED: 页面加载时调用 cleanup API
       expect(true).toBe(false) // Stub - implement in 05-02
     })

     it('shows loading skeleton on first load', () => {
       // RED: 首次加载显示骨架屏
       expect(true).toBe(false) // Stub - implement in 05-02
     })

     it('filters by tab correctly', () => {
       // RED: Tab 筛选功能
       expect(true).toBe(false) // Stub - implement in 05-02
     })

     it('shows expiring items in red', () => {
       // RED: 即将过期项目标红
       expect(true).toBe(false) // Stub - implement in 05-02
     })
   })
   ```

2. 创建 templates/page.test.tsx：
   ```typescript
   import { describe, it, expect, vi } from 'bun:test'
   import { render, screen, fireEvent } from '@testing-library/react'
   import TemplatesPage from './page'

   vi.mock('@/lib/api', () => ({
     templatesApi: {
       list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
       listPrompts: vi.fn().mockResolvedValue({ items: [] }),
     }
   }))

   describe('TemplatesPage Prompt Tab', () => {
     it('renders 6 module prompts', async () => {
       // RED: Prompt Tab 显示 6 个模块
       expect(true).toBe(false) // Stub - implement in 05-03
     })

     it('shows builtin badge for system prompts', () => {
       // RED: 内置模板显示 Badge
       expect(true).toBe(false) // Stub - implement in 05-03
     })

     it('exports prompts as Markdown', () => {
       // RED: 导出 Markdown 功能
       expect(true).toBe(false) // Stub - implement in 05-03
     })

     it('imports valid Markdown file', () => {
       // RED: 导入 Markdown 功能
       expect(true).toBe(false) // Stub - implement in 05-03
     })
   })
   ```
</action>
  <verify>
    <automated>ls -la frontend/src/app/\(main\)/recycle/page.test.tsx frontend/src/app/\(main\)/templates/page.test.tsx 2>/dev/null | wc -l | xargs -I {} sh -c 'test {} -ge 2 && echo "OK" || echo "MISSING"'</automated>
  </verify>
  <done>
    - recycle/page.test.tsx 创建完成
    - templates/page.test.tsx 创建完成
  </done>
</task>

</tasks>

<verification>
1. 验证所有测试文件存在
2. 验证所有测试文件包含 describe 块和 test stubs
3. 运行测试确认全部为 RED 状态（failing）
</verification>

<success_criteria>
- 7 个测试文件全部创建
- 每个测试文件包含至少 2 个 test stubs
- 测试运行结果为 RED（预期失败）
</success_criteria>

<output>
After completion, create `.planning/phases/05-ti-yan-shou-wei/05-00-SUMMARY.md`
</output>
