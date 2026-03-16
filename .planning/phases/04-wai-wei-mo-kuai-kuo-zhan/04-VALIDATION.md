---
phase: 4
slug: wai-wei-mo-kuai-kuo-zhan
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Backend)** | pytest 7.x + pytest-asyncio (asyncio_mode=auto) |
| **Framework (Frontend)** | Vitest (bun run test) |
| **Config file** | `backend/pytest.ini` / `backend/pyproject.toml` |
| **Quick run command (BE)** | `cd backend && uv run pytest tests/unit/test_<module>/ -v -x` |
| **Full suite command (BE)** | `cd backend && uv run pytest -v` |
| **Full suite command (FE)** | `cd frontend && bun run build` |
| **Estimated runtime** | ~30 seconds (unit tests) |

---

## Sampling Rate

- **After every task commit:** Run quick pytest for relevant backend module
- **After every plan wave:** Run `cd backend && uv run pytest -v` + `cd frontend && bun run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 4-01-01 | 01 | 1 | INP-01,02,03 | unit | `uv run pytest tests/unit/test_uda/ -v` | ⬜ pending |
| 4-02-01 | 02 | 1 | TC-01~06 | unit | `uv run pytest tests/unit/test_testcases/ -v` | ⬜ pending |
| 4-02-02 | 02 | 1 | TC-07~11 | unit | `uv run pytest tests/unit/test_testcases/ -v` | ⬜ pending |
| 4-02-03 | 02 | 1 | TC-12~14 | unit | `uv run pytest tests/unit/test_testcases/ -v` | ⬜ pending |
| 4-03-01 | 03 | 2 | DSH-01~06 | unit | `uv run pytest tests/unit/test_dashboard/ -v` | ⬜ pending |
| 4-04-01 | 04 | 2 | DIF-01~05 | unit | `uv run pytest tests/unit/test_diff/ -v` | ⬜ pending |
| 4-05-01 | 05 | 2 | KB-01~04 | unit | `uv run pytest tests/unit/test_knowledge/ -v` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/unit/test_uda/test_template_download.py` — INP-01 模板下载
- [ ] `backend/tests/unit/test_uda/test_uda_parse.py` — INP-02,03 UDA 解析确认
- [ ] `backend/tests/unit/test_testcases/test_folder_tree.py` — TC-01~06 目录树 CRUD
- [ ] `backend/tests/unit/test_testcases/test_import_export.py` — TC-07~14 导入导出
- [ ] `backend/tests/unit/test_dashboard/test_dashboard_service.py` — DSH-01~06
- [ ] `backend/tests/unit/test_diff/test_diff_service.py` — DIF-01~05 变更分析
- [ ] `backend/tests/unit/test_knowledge/test_knowledge_service.py` — KB-01~04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 用例库拖拽排序跨层级移动 | TC-03, TC-04 | UI 交互行为，需浏览器验证 | 打开用例库，拖拽节点到不同层级，验证持久化 |
| 仪表盘折线图交互（hover/迭代切换） | DSH-02, DSH-04 | Recharts 渲染须视觉确认 | 切换迭代选择器，验证图表全局同步 |
| Diff 并排高亮展示 | DIF-02 | 视觉对比，需人工判断质量 | 发布新版本，查看 Diff Tab 并排效果 |
| 知识库分块预览抽屉 | KB-02 | UI 抽屉展开效果 | 点击文档条目，验证分块列表和向量展示 |
| ImportDialog 完整导入流程 | TC-07~11 | 多步骤文件上传流程 | 上传 xlsx，走完格式→映射→预览→重复→确认 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
