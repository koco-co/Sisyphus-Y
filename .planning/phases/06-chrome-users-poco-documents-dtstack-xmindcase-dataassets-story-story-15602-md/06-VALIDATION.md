---
phase: 06
slug: chrome-users-poco-documents-dtstack-xmindcase-dataassets-story-story-15602-md
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Chrome DevTools MCP (E2E) + Vitest (Frontend unit) |
| **Config file** | `frontend/vitest.config.ts` (unit) / MCP tools (E2E) |
| **Quick run command** | `cd frontend && bunx vitest run --reporter=basic` |
| **Full suite command** | `cd frontend && bunx vitest run` + Chrome MCP E2E |
| **Estimated runtime** | ~30 seconds (unit) + ~5 minutes (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && bunx vitest run --reporter=basic`
- **After every plan wave:** Run Chrome MCP E2E test on main pipeline
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds (unit) / 5 minutes (E2E)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | MD渲染 | unit | `vitest run RequirementDetailTab.test.tsx` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | files API | unit | `uv run pytest tests/unit/test_files/` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | E2E 分析台 | e2e | `Chrome MCP: navigate + snapshot` | N/A | ⬜ pending |
| 06-03-02 | 03 | 2 | E2E 工作台 | e2e | `Chrome MCP: click + fill + wait` | N/A | ⬜ pending |
| 06-03-03 | 03 | 2 | E2E 用例库 | e2e | `Chrome MCP: navigate + assert` | N/A | ⬜ pending |
| 06-03-04 | 03 | 2 | 图片显示 | e2e | `Chrome MCP: snapshot + verify image src` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/app/(main)/diagnosis/_components/__tests__/RequirementDetailTab.test.tsx` — Markdown rendering tests
- [ ] `backend/tests/unit/test_files/` — Files API unit tests directory
- [ ] Chrome MCP connection verified — `mcp__chrome-devtools__list_pages` returns success

*Note: Image display (E2E-TEST-02) is verified through E2E checkpoint testing, not unit tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Markdown样式 | MD渲染 | 视觉验证 | 1. 打开需求详情页 2. 检查标题/列表/代码块样式 |
| 图片加载 | 图片显示 | 需要真实网络 | 1. 上传需求文档 2. 检查图片是否正确显示 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
