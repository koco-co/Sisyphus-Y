---
phase: 04-wai-wei-mo-kuai-kuo-zhan
plan: "04"
subsystem: ui
tags: [requirements, upload, uda, file-upload, docx, confidence, checkbox]

# Dependency graph
requires:
  - phase: 02-main-refactor
    provides: requirements module with upload dialog and UDA parse-structure API
provides:
  - requirement-template.docx (37KB valid docx in frontend/public/templates/)
  - requirement-template.md (structured markdown template)
  - UploadRequirementDialog two-step flow with checkbox confirmation (upload -> confirm)
  - confidence threshold at 0.7 with percentage display in warning banner
  - per-item checkbox toggle for selective import
  - file format validation with user-friendly error
affects: [requirements-management, uda-parse-flow, INP-01, INP-02, INP-03]

# Tech tracking
tech-stack:
  added: [python-docx (template generation script)]
  patterns: [two-step upload confirmation with checkbox selection, confidence-gated banner warning]

key-files:
  created:
    - frontend/public/templates/requirement-template.docx
    - frontend/public/templates/requirement-template.md (pre-existing, verified)
    - scripts/create_requirement_template.py
  modified:
    - frontend/src/app/(main)/requirements/_components/UploadRequirementDialog.tsx

key-decisions:
  - "Per-item confidence not exposed by backend API (RequirementItem has no confidence field) — only overall_confidence (called confidence in API) shown in Banner"
  - "Checkbox toggle replaces deletion as primary de-selection mechanism; delete button still available for permanent removal"
  - "Template download links updated from 需求文档模板.docx to requirement-template.docx to match new file names"
  - "Confidence threshold raised from 0.6 to 0.7 per INP-03 requirement"
  - "File format validation added client-side before API call for instant feedback"

patterns-established:
  - "Checkbox-driven confirm step: items default checked=true, user unchecks unwanted, confirm button shows checked count"
  - "Confidence banner: shows percentage display with message, threshold 0.7, non-blocking"

requirements-completed: [INP-01, INP-02, INP-03]

# Metrics
duration: 15min
completed: 2026-03-16
---

# Phase 4 Plan 04: 需求录入优化 Summary

**需求文档模板文件（docx+md）+ UploadRequirementDialog 两步勾选确认流程，置信度 Banner 阈值 0.7，格式校验即时提示**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-16T05:50:00Z
- **Completed:** 2026-03-16T06:05:00Z
- **Tasks:** 2
- **Files modified:** 3 files created/modified

## Accomplishments

- 创建 requirement-template.docx（37KB 有效 docx，通过 python-docx 生成）和 requirement-template.md（含完整需求结构），可通过浏览器直接下载
- UploadRequirementDialog 下载模板链接更新至新文件名，置信度阈值从 0.6 升级到 0.7，Banner 显示百分比
- 添加 per-item checkbox 勾选机制，"确认导入（N条）"按钮动态显示已选条目数，未选中任何条目时置灰
- 添加文件格式客户端校验，上传非支持格式时立即显示用户友好错误提示（不阻断后续操作）

## Task Commits

1. **Task 1: 创建需求模板文件** - `514134b` (feat)
2. **Task 2: 升级 UploadRequirementDialog 两步确认流程** - `a2396ae` (feat)

## Files Created/Modified

- `frontend/public/templates/requirement-template.docx` - 需求文档 Word 模板（7个章节标题）
- `frontend/public/templates/requirement-template.md` - 需求文档 Markdown 模板（预存在，验证内容完整）
- `scripts/create_requirement_template.py` - 生成 docx 模板的 Python 脚本（可复现）
- `frontend/src/app/(main)/requirements/_components/UploadRequirementDialog.tsx` - 两步确认流程、checkbox、置信度 Banner、格式校验

## Decisions Made

- 后端 RequirementItem 无 per-item confidence 字段（仅有 overall confidence），因此条目级「低置信度」徽章跳过，仅在整体 Banner 显示百分比
- Checkbox 替换原删除按钮作为主要取消选择方式，保留删除按钮做永久移除
- 模板文件名从中文改为英文（requirement-template.*）便于跨系统兼容
- 客户端格式校验在 API 调用前执行，提供即时反馈

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] 添加文件格式客户端校验**
- **Found during:** Task 2（UploadRequirementDialog 升级）
- **Issue:** 计划提到「无效文件格式显示格式错误提示」，但原代码仅通过 `accept` 属性限制选择器，用户仍可通过拖拽或其他方式绕过
- **Fix:** 添加 `ALLOWED_EXTENSIONS` 常量和 `handleFileChange` 中的即时校验，不合法格式清空文件并显示 parseError
- **Files modified:** UploadRequirementDialog.tsx
- **Verification:** 格式校验逻辑 grep 可见，biome 和 tsc 无报错
- **Committed in:** a2396ae（Task 2 commit）

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** 安全性和 UX 改进，无范围扩展。

## Issues Encountered

- 后端 `ParseStructureResponse` 使用 `confidence` 字段而非计划中提到的 `overall_confidence`，前端 `ParseResponse` 接口已与后端实际 API 保持一致，不需要修改

## User Setup Required

None - 模板文件已静态部署到 `frontend/public/templates/`，无需额外配置。

## Next Phase Readiness

- 需求上传两步确认流程完整，INP-01/02/03 需求已实现
- 后续如需 per-item 置信度展示，需先扩展后端 RequirementItem schema 添加 confidence 字段

---
*Phase: 04-wai-wei-mo-kuai-kuo-zhan*
*Completed: 2026-03-16*
