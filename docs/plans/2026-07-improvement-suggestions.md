# Sisyphus-Y 用例生成质量改进 — 实施总结与后续建议

> 日期: 2026-07

## 一、本轮已实施改进

### 1. 死代码清理 (Phase 1)

| 操作                                                                    | 影响                         |
| ----------------------------------------------------------------------- | ---------------------------- |
| 删除 `modules/collaboration/` (5 文件)                                  | 减少未使用的协作模块         |
| 删除 `modules/test_plan/` (5 文件)                                      | 移除已裁剪的测试计划模块     |
| 删除 `tests/unit/test_collaboration/` (2 文件)                          | 清理失效测试                 |
| 删除前端 `analytics/`、`test-plan/`、`CommentSection.tsx`、`use-sse.ts` | 减少前端死代码               |
| 清理 `api.ts` 中 `collaborationApi` 及相关类型                          | 消除未使用导出               |
| `.gitignore` 添加 `清洗后数据/`                                         | 避免大量数据文件进入版本控制 |

### 2. Prompt 系统重写 (Phase 3.1)

**改动文件**: `backend/app/ai/prompts.py` — `GENERATION_SYSTEM`

核心改进点:

- 新增「可执行性」三要素定义：具体操作路径 + 明确测试数据 + 可验证预期结果
- 强化 JSON 纯输出指令："以 [ 开头，以 ] 结尾"
- 新增 ⑥ 预期结果模式库（表单/流程/查询/联动/异常 5 大类）
- 新增 ⑧ 前置条件规范（编号列表 + 角色/数据/配置三纬度）
- 新增 ⑨ 输出前自检清单（12 条 CHECK 项源自 SKILL.md）
- 改进 Few-Shot 示例
- 扩展禁用词表

### 3. JSON 解析器增强 (Phase 3.2)

**改动文件**: `backend/app/ai/parser.py`

| 增强项             | 说明                                                        |
| ------------------ | ----------------------------------------------------------- |
| 尾随逗号修复       | `_strip_trailing_commas()` — 自动移除 `,]` / `,}`           |
| 截断 JSON 修复     | `_try_repair_truncated_json()` — 尝试闭合未完成的 JSON 数组 |
| 模糊关键词扩展     | 从 9 个增至 24 个，覆盖"选择对应选项""页面正常显示"等       |
| 短标题过滤         | 标题 < 4 字符直接过滤                                       |
| case_type 自动修复 | 识别中文 case_type 名称并映射到 DB 合法值                   |
| priority 自动修复  | 从 "高/P0" 格式中提取 P-level                               |

### 4. case_type 全链路对齐 (Phase 3.3)

**问题**: prompt 输出 `"normal"` → parser 验证 `"normal"` → service 映射到 `"functional"` — 三层各自为政

**修复**:

- prompt: `case_type` 枚举改为 `functional|exception|boundary|performance|security|compatibility`（与DB一致）
- parser: `_VALID_CASE_TYPES` 和 `_CASE_TYPE_MAP` 对齐 DB 的 `CaseTypeLiteral`
- 旧值 `"normal"` → `"functional"`、`"concurrent"` → `"performance"`、`"permission"` → `"security"`

### 5. RAG 双路检索 + 阈值降低 (Phase 3.4-3.5)

**改动文件**: `backend/app/modules/generation/service.py`

| 改进             | 之前                      | 之后                                                 |
| ---------------- | ------------------------- | ---------------------------------------------------- |
| RAG 检索源       | 仅 `historical_testcases` | 同时检索 `historical_testcases` + `knowledge_chunks` |
| score_threshold  | 0.72（偏严格）            | 0.55（提升召回率）                                   |
| task_instruction | 6 句简要指令              | 10 句含具体质量约束                                  |

### 6. 测试覆盖

新增 12 个 parser 单元测试（全部通过），覆盖:

- 尾随逗号修复
- 中文 case_type 映射
- `normal` → `functional` 映射
- 短标题过滤
- 扩展模糊关键词过滤
- JSON 提取（裸数组、代码块、截断修复）

---

## 二、后续建议（按优先级排序）

### P0 — 直接影响用例采纳率

#### 2.1 Few-Shot 模板来自真实采纳用例

当前 prompt 中的 Few-Shot 示例是手写的。建议：

- 从已采纳（`status = approved`）的用例中随机抽取 2-3 条
- 在 `assemble_prompt()` 中动态注入为 Few-Shot
- 这样 LLM 输出风格会自动贴合团队实际接受的标准

#### 2.2 用例评审反馈闭环

当用户拒绝或修改 AI 生成的用例时，记录修改 diff：

- 新增 `TestCaseRevision` 表（before_json, after_json, revision_type）
- 定期分析高频修改模式，反向优化 prompt
- 可选：将修改后的优质用例回写 Qdrant 作为 Few-Shot 来源

#### 2.3 同时启用 L4/L5 层

`assemble_prompt` 的 `module_rules` 和 `output_preference` 参数从未被传入。建议：

- 设置页保存的自定义规则应通过 `PromptConfig` 表注入 L4
- 用户偏好（如 "步骤不超过8步"、"优先覆盖异常场景"）注入 L5

### P1 — 体验与效率

#### 2.4 流式分块渲染 + 用例即时预览

当前 SSE 流完成后才触发 `refetchCases`，用户等待时间长。建议：

- 在 `content` event 中每当检测到完整 `}` 闭合时，尝试前端侧增量解析
- 右侧面板即时渲染已完成的用例卡片，无需等全部生成完毕

#### 2.5 对话历史上下文衰减

`chat_stream` 始终传入全部历史消息，多轮对话后 token 浪费严重。建议：

- 最近 3 轮保留原文
- 更早的对话压缩为摘要（用低成本模型如 glm-4-flash）
- 设置最大历史 token 预算（如 4000 token）

#### 2.6 生成模式路由优化

`test_point_driven` 和 `dialogue` 模式共用同一个 `chat_stream` 入口，但 prompt module 不同。建议：

- `document` 模式应走 `doc_driven.py` 引擎，当前似乎没有路由
- 根据模式选择不同的 Few-Shot 策略

### P2 — 架构改进

#### 2.7 Prompt 版本化

所有 prompt 修改应有版本追溯：

- `PromptVersion` 表记录每次 System Prompt 变更
- A/B 测试：同一需求用不同 prompt 版本生成，对比采纳率

#### 2.8 用例质量评分自动化

生成后自动打分（不需要 LLM，纯规则）：

- 步骤完整性（每步有 action + expected）
- 测试数据具体性（无模糊关键词）
- 标题规范性（包含功能点 + 场景描述）
- 前置条件完整性（有角色、数据、环境）
- 将分数显示在 CasePreviewCard 上，辅助人工评审

#### 2.9 E2E 验收测试

建议使用 Playwright 编写核心链路 E2E：

- 分析台 → 选择需求 → AI 分析 → 场景地图
- 工作台 → 确认测试点 → 生成用例 → 验证用例卡片渲染
- 用例库 → 筛选/搜索 → 导出
