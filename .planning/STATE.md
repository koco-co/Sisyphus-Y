---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Phase 3 AI enhancement
stopped_at: Completed 03-01 RAG Review Script Test Coverage
last_updated: "2026-03-16T16:23:00Z"
last_activity: 2026-03-16 — Phase 3 Plan 01 complete (RAG review script test coverage expanded to 6 files, 41 tests passing)
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 25
  completed_plans: 29
  percent: 90
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** 让测试工程师专注测试策略——平台生成用例草稿，人负责决策
**Current focus:** Phase 5 - 体验收尾

## Current Position

Phase: 5 of 5 (体验收尾) — IN PROGRESS
Phase 5: 4/6 plans (Wave 0 + Plan 01 + Plan 02 + Plan 04 complete)
Status: Phase 5 in progress
Last activity: 2026-03-16 — Phase 5 Plan 04 complete (HelpFab floating button, AiConfigBanner responsive, OnboardingGuideModal export)

Progress: [████████░░] 89%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- No plans completed yet
- Trend: -

*Updated after each plan completion*
| Phase 01-qingchang P01 | 2 | 2 tasks | 2 files |
| Phase 01-qingchang P03 | 8 | 2 tasks | 6 files |
| Phase 01-qingchang P03 | 25 | 3 tasks | 6 files |
| Phase 02-main-refactor P01 | 35 | 2 tasks | 9 files |
| Phase 02-main-refactor P02 | 25 | 3 tasks | 4 files |
| Phase 02-main-refactor P03 | 20 | 2 tasks | 4 files |
| Phase 02-main-refactor P06 | 7 | 2 tasks | 5 files |
| Phase 02-main-refactor P04 | 9 | 2 tasks | 8 files |
| Phase 02-main-refactor P05 | 30 | 2 tasks | 3 files |
| Phase 02-main-refactor P06 | 7 | 2 tasks | 5 files |
| Phase 02-main-refactor P07 | 6 | 1 tasks | 1 files |
| Phase 03-ai P02 | 35 | 2 tasks | 2 files |
| Phase 03-ai P01 | 45 | 2 tasks | 7 files |
| Phase 03-ai P03 | 10 | 1 tasks | 1 files |
| Phase 04-wai-wei-mo-kuai-kuo-zhan P04 | 15 | 2 tasks | 4 files |
| Phase 04-wai-wei-mo-kuai-kuo-zhan P03 | 7 | 2 tasks | 7 files |
| Phase 04-wai-wei-mo-kuai-kuo-zhan P02 | 8 | 2 tasks | 9 files |
| Phase 04-wai-wei-mo-kuai-kuo-zhan P07 | 10 | 2 tasks | 4 files |
| Phase 04-wai-wei-mo-kuai-kuo-zhan P08 | 5 | 2 tasks | 3 files |
| Phase 04-wai-wei-mo-kuai-kuo-zhan P09 | 6 | 3 tasks | 10 files |
| Phase 04-wai-wei-mo-kuai-kuo-zhan P06 | 18 | 2 tasks | 11 files |

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table. Key ones affecting current work:

- [Roadmap]: MOD-01~05 模块裁剪先行（Phase 1），为主链路重构清场
- [Roadmap]: Phase 3 RAG/Prompt 工作依赖 Phase 2 主链路稳定后展开
- [Roadmap]: Phase 4 外围扩展与 Phase 3 AI 质量提升可部分并行（依赖 Phase 2）
- [Arch]: Celery worker 任务均为 stub，Phase 4 长任务（批量导入/向量化）需注意
- [Phase 01-qingchang]: 仅移除路由注册保留模块文件和DB表，模块裁剪不等于代码删除
- [Phase 01-qingchang P02]: M16 通知模块整体裁剪，sonner toast() 满足通知需求，无需专用通知中心组件
- [Phase 01-qingchang]: MOD-04: 全局搜索去噪由前端控制，后端不强制限制 entity_types
- [Phase 01-qingchang]: MOD-05: 审计日志 API 路径统一为 /audit，page_size 默认 100，支持 date_from/date_to 后端过滤
- [Phase 01-qingchang]: MOD-04: 全局搜索去噪由前端控制，后端不强制限制 entity_types
- [Phase 01-qingchang]: MOD-05: 审计日志 API 路径统一为 /audit，page_size 默认 100，支持 date_from/date_to 后端过滤
- [Phase 02-main-refactor]: Alembic autogenerate migration trimmed: removed unrelated table-drop noise from Phase 1, kept only confirmed column addition
- [Phase 02-main-refactor]: RAG preview endpoint catches all exceptions (not just ConnectionError) to guarantee graceful degradation against any Qdrant failure
- [Phase 02-main-refactor]: useDiagnosis scoped inside RightPanelContent inner component — avoids hook call when selectedReqId is null
- [Phase 02-main-refactor]: DiagnosisRisk: keep legacy severity field + add level alongside — backward compat while supporting backend-canonical field name
- [Phase 02-main-refactor]: AnalysisTab: Enter workbench button inside component (not tab bar) — enables computed disabled state without prop drilling
- [Phase 02-main-refactor]: AnalysisLeftPanel height: 100% (not calc(100vh-49px)) — flex parent controls height, prevents overflow when AiConfigBanner shown
- [Phase 02-main-refactor]: ANA-01 copy rename: visible 诊断→分析 in UI text only; variable names/API paths unchanged
- [Phase 02-main-refactor]: CoverageTab returns null when visible=false to prevent hidden-tab API requests
- [Phase 02-main-refactor]: TestPointGroupList uses button elements for rows (a11y) — div+onClick replaced
- [Phase 02-main-refactor]: ProgressSteps extended with optional onStepClick prop (backward compat)
- [Phase 02-main-refactor]: GenerationPanel 追加模式判断用 isAppend ref，避免 handleStartGenerate 更新快照后判断时序错误
- [Phase 02-main-refactor]: AnalysisLeftPanel height: 100% (非 calc(100vh-49px)) — 由 page.tsx flex 容器决定高度，避免 AiConfigBanner 出现时高度溢出
- [Phase 02-main-refactor]: workbench onAdd adapter constructs full Omit<TestPointItem,'id'> object — sm.addPoint takes structured payload not positional args
- [Phase 02-main-refactor]: WRK-02: Removed duplicate header generate button in workbench Step1 — TestPointGroupList bottom bar is canonical generate action
- [Phase 03-ai]: 5 个模块 Prompt 均使用四段式结构 + Few-shot 示例（2~3 正例 + 1 负例）
- [Phase 03-ai]: SSE 换行渲染确认：AI 消息路径已使用 renderMarkdown，用户消息路径 whitespace-pre-wrap 足够
- [Phase 03-ai]: GLM-5 配置验证通过，zhipu_model 默认值为 "glm-5"
- [Phase 03-ai P01]: 使用 md5(filepath::row_index) 生成稳定 ID 实现幂等性
- [Phase 03-ai P01]: utf-8-sig 编码处理带 BOM 的 CSV 文件
- [Phase 03-ai P01]: 三分支 verdict 系统：pass/polish/discard
- [Phase 03-ai P03]: retrieve_similar_cases 调用处显式指定 top_k=5, score_threshold=0.72
- [Phase 03-ai P03]: RAG 预览端点使用 graceful degradation，任何异常返回空结果而非 500
- [Phase 04-wai-wei-mo-kuai-kuo-zhan]: INP: UploadRequirementDialog checkbox confirm flow — per-item confidence not in API, overall threshold 0.7, file format validation client-side
- [Phase 04-wai-wei-mo-kuai-kuo-zhan]: Wave 0 测试脚手架：DSH-02/KB-02 已先行实现，KB-03/KB-04 由 hook 自动实现，DIF-04/05 和 TC-12/14 保持 RED 等待 Wave 1
- [Phase 04-wai-wei-mo-kuai-kuo-zhan]: scroll_by_doc_id 在 retriever 层返回完整 content，500字符截断在 router 层（关注点分离）
- [Phase 04-wai-wei-mo-kuai-kuo-zhan]: KB ManualEntryCreate.category 使用 Pydantic Literal 约束四固定分类，非法值 schema 层即拦截
- [Phase 04-wai-wei-mo-kuai-kuo-zhan]: 版本管理测试 patch.object(svc, get_document) 规避 SQLAlchemy select(MagicMock) ArgumentError
- [Phase 04-wai-wei-mo-kuai-kuo-zhan]: change_impact 值域 needs_rewrite/needs_review/not_affected，push_to_workbench 设置 status=needs_regen
- [Phase 04-wai-wei-mo-kuai-kuo-zhan]: Alembic autogenerate 噪声手动清理策略：只保留本次目标的 add_column，防止意外 drop_table
- [Phase 04-wai-wei-mo-kuai-kuo-zhan P07]: ExportJobCreate.scope 4种范围共用 scope_value 字段；iteration scope 通过 Requirement JOIN（TestCase 无 iteration_id 字段）
- [Phase 04-wai-wei-mo-kuai-kuo-zhan P07]: ExportDialog json 格式替换为 md，API 端点为 POST /export（router prefix + 空路径）
- [Phase 04-wai-wei-mo-kuai-kuo-zhan P08]: fallbackQuality 静态数据移除，quality state 默认 null，区分加载中和无数据
- [Phase 04-wai-wei-mo-kuai-kuo-zhan P08]: Recharts 颜色必须用 CSS 变量字符串 'var(--token)'，不能用 Tailwind 类控制 SVG 属性
- [Phase 04-wai-wei-mo-kuai-kuo-zhan P08]: @/components/ui/skeleton 不存在，使用内联 animate-pulse div 替代
- [Phase 04-wai-wei-mo-kuai-kuo-zhan]: publish_version 使用 BackgroundTasks 异步触发 Diff，避免阻塞请求；Diff 失败静默处理
- [Phase 04-wai-wei-mo-kuai-kuo-zhan]: parseSideBySide 将相邻 del+add 合并为 modified 类型对齐渲染；AffectedCases 双字段兼容 change_impact/impact_type
- [Phase 04-wai-wei-mo-kuai-kuo-zhan P05]: MoveFolderDialog/MoveCaseDialog 使用原生 overlay+div（不引入 shadcn/ui），与 deleteConfirm 风格一致
- [Phase 04-wai-wei-mo-kuai-kuo-zhan P05]: FolderTree 重名校验在前端 handleEditSubmit 完成，大小写不敏感，toast.error 提示并阻止提交
- [Phase 05-ti-yan-shou-wei P02]: cleanup API 调用失败时静默处理，不阻塞回收站列表加载
- [Phase 05-ti-yan-shou-wei P02]: 使用 TableSkeleton 组件替代 Loader2 作为首次加载骨架屏
- [Phase 05-ti-yan-shou-wei P02]: DELETE 请求带 body 使用 api.deleteWithBody 辅助方法
- [Phase 05-ti-yan-shou-wei P01]: 使用 Vitest 替代 bun:test 作为前端测试框架
- [Phase 05-ti-yan-shou-wei P01]: ConfirmDialog variant 扩展为 simple | cascade，自动生成描述文案
- [Phase 05-ti-yan-shou-wei P01]: simple 模式不显示警告图标，cascade 使用 sy-danger 样式
- [Phase 05-ti-yan-shou-wei P04]: HelpFab menu 使用 CSS visibility 替代条件渲染以支持静态 HTML 测试
- [Phase 05-ti-yan-shou-wei P04]: AiConfigBanner 通过 useAiConfig hook 检测 modelConfigs.is_enabled 判断 AI 配置状态

### Pending Todos

None yet.

### Blockers/Concerns

- Celery tasks 全部为 stub，批量向量化（RAG-01~04）若数据量大会阻塞请求线程
- DB 连接池未限制，Phase 2 SSE 并发场景需关注（pool_size 默认 ~5）
- RAG 向量维度校验缺失，Phase 3 切换 GLM-5 时需确认 embedding 维度兼容性
- ImportDialog 重构完成（04-06），Fragile 问题已解决

## Session Continuity

Last session: 2026-03-16T16:23:00Z
Stopped at: Completed 03-01 RAG Review Script Test Coverage
Resume file: .planning/phases/03-ai/03-01-SUMMARY.md
