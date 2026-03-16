---
phase: 5
slug: ti-yan-shou-wei
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-16
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (frontend) + pytest (backend) |
| **Config file** | `bunfig.toml` / `pyproject.toml` |
| **Quick run command** | `bun test` / `uv run pytest -x` |
| **Full suite command** | `bun test` / `uv run pytest --cov=app` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test` / `uv run pytest -x`
- **After every plan wave:** Run `bun test` / `uv run pytest --cov=app`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-00-01 | 00 | 0 | - | scaffold | `ls frontend/src/components/ui/*.test.tsx` | ✅ W0 | ⬜ pending |
| 05-00-02 | 00 | 0 | - | scaffold | `ls frontend/src/app/(main)/*/page.test.tsx` | ✅ W0 | ⬜ pending |
| 05-01-01 | 01 | 1 | UX-01 | E2E | `grep -r "新建" frontend/src/app/` | ✅ | ⬜ pending |
| 05-01-02 | 01 | 1 | UX-02 | unit | `bun test ConfirmDialog.test.tsx` | ✅ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | UX-03 | unit | `bun test ConfirmDialog.test.tsx` | ✅ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | UX-04 | unit | `bun test EmptyState.test.tsx` | ✅ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | UX-05 | visual | Manual | N/A | ⬜ pending |
| 05-02-02 | 02 | 1 | REC-01 | integration | `bun test recycle/page.test.tsx` | ✅ W0 | ⬜ pending |
| 05-02-03 | 02 | 1 | REC-02 | unit | `bun test recycle/page.test.tsx` | ✅ W0 | ⬜ pending |
| 05-02-04 | 02 | 1 | REC-03 | unit | `uv run pytest tests/unit/test_recycle/ -x` | ✅ | ⬜ pending |
| 05-03-01 | 03 | 1 | TPL-01 | unit | `bun test templates/page.test.tsx` | ✅ W0 | ⬜ pending |
| 05-03-02 | 03 | 1 | TPL-02 | unit | `bun test templates/page.test.tsx` | ✅ W0 | ⬜ pending |
| 05-03-03 | 03 | 1 | TPL-03 | unit | `bun test templates/page.test.tsx` | ✅ W0 | ⬜ pending |
| 05-04-01 | 04 | 2 | UX-06 | unit | `bun test OnboardingGuide.test.tsx` | ✅ W0 | ⬜ pending |
| 05-04-02 | 04 | 2 | UX-07 | unit | `bun test HelpFab.test.tsx` | ✅ W0 | ⬜ pending |
| 05-04-03 | 04 | 2 | UX-08 | unit | `bun test AiConfigBanner.test.tsx` | ✅ W0 | ⬜ pending |
| 05-05-01 | 05 | 3 | All | checkpoint | Manual verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 plan (05-00-WAVE0-PLAN.md) creates all test scaffolds:

- [x] `frontend/src/components/ui/ConfirmDialog.test.tsx` — stubs for UX-02/03 variant 扩展
- [x] `frontend/src/components/ui/EmptyState.test.tsx` — stubs for UX-04
- [x] `frontend/src/components/ui/AiConfigBanner.test.tsx` — stubs for UX-08
- [x] `frontend/src/components/ui/OnboardingGuide.test.tsx` — stubs for UX-06
- [x] `frontend/src/components/ui/HelpFab.test.tsx` — stubs for UX-07
- [x] `frontend/src/app/(main)/recycle/page.test.tsx` — stubs for REC-01/02
- [x] `frontend/src/app/(main)/templates/page.test.tsx` — stubs for TPL-01/02/03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 加载状态视觉一致性 | UX-05 | 视觉回归需要人工判断 | 1. 访问各列表页面，验证首次加载显示骨架屏 2. 点击各按钮，验证 Loader2 动画 3. 切换路由，验证 nprogress 进度条 4. 打开弹窗，验证 Spinner 居中 |
| 首次引导弹窗流程 | UX-06 | 交互流程需要人工体验 | 1. 清除 localStorage 2. 刷新首页 3. 验证引导弹窗显示 4. 完成引导后验证不再显示 |
| 帮助按钮菜单交互 | UX-07 | 交互需要人工验证 | 1. 点击帮助按钮 2. 验证菜单显示 3. 点击各选项验证功能 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (05-00-WAVE0-PLAN.md)
- [x] No watch-mode flags
- [x] Feedback latency < 45s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
