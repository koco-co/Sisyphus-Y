# 用例生成质量提升设计方案

**日期**：2026-03-22
**状态**：已批准
**背景**：当前平台用例生成采纳率接近 0%，根本原因是 AI 缺乏真实 UI 上下文（按钮名、页面路径、字段名），同时 Prompt 规范不够严格导致测试数据模糊。对比本地 Claude Code 工作流（需求 + 历史用例 + 源码三上下文），采纳率可达 50%+。

---

## 目标

| 指标 | 当前 | 目标 |
|---|---|---|
| 用例采纳率 | ~0% | 40%~50% |
| 测试数据模糊率 | 高 | 接近 0 |
| 步骤格式合规率 | 低 | >90% |

---

## 方案 C：两阶段落地

### Phase 1：Prompt 全面升级（3-4 天）

#### 改动范围

**`backend/app/ai/prompts.py`**

在 `GENERATION_SYSTEM` Layer 1 新增三个强制规范区块：

**⑥ 步骤格式强制规范**
- 第一步必须是：`进入【模块名-页面名】页面`
- 每个 step_num 与 expected_result 必须严格一一对应，数量相等
- UI 元素用【】标注（按钮、菜单、页面名）
- 用户输入的具体数据值用「」标注

**⑦ 测试数据强制规范**
- 文本字段：必须给出具体字符串（含字符数），禁止"输入合法值"等模糊描述
- 下拉/选择：必须给出具体选项值
- 数值/日期：必须给出具体数值
- 禁止词汇：如、像、类似、例如、合适的值、有效值

**⑧ 异常用例强制规范**
- 每条异常用例只能包含一个逆向条件（最重要规则）
- 禁止将两个不同缺失/错误情况合并为一条用例

同步更新：
- `EXPLORATORY_SYSTEM`：加入相同的步骤格式和测试数据规范
- Few-shot 示例：新增贴近真实业务（数据质量/告警场景）的完整示例

---

### Phase 2：GitLab 多仓库集成（1-2 周）

#### 2.1 数据模型

新建 `GitLabConfig` 表：

```python
class GitLabConfig(Base):
    id: UUID (PK)
    product_id: UUID (FK → products.id)
    name: str                  # 配置名称，如"前端仓库"
    gitlab_url: str            # https://gitlab.example.com
    project_id: str            # GitLab project ID 或 namespace/repo
    access_token: str          # AES 加密存储
    default_branch: str        # main / master
    is_enabled: bool
    created_at: datetime
    updated_at: datetime
```

一个产品可绑定多个仓库配置（前端仓/后端仓独立管理）。

#### 2.2 后端适配层

新建 `backend/app/integrations/gitlab/`：

```
gitlab/
├── __init__.py
├── client.py          # GitLab REST API 封装（获取文件树、文件内容）
├── extractor.py       # 源码裁剪：提取路由/字段/按钮名
└── context_builder.py # 裁剪结果 → Prompt 文本块（含 token 截断）
```

**文件裁剪策略**（控制 Token 消耗）：

| 文件类型 | 提取内容 |
|---|---|
| `.tsx` / `.vue` | 路由路径、`<button>` 文本、表单字段名、placeholder 属性 |
| `.py` | API 路由 path、Pydantic schema 字段定义 |
| 其他 | 跳过 |

- 单次注入上限：**4000 tokens**
- 超出时按优先级截断：路由定义 > 组件字段 > 其他

**容错策略**：

| 场景 | 处理 |
|---|---|
| Token 无效/过期 | 降级跳过代码上下文，生成继续 |
| 路径不存在 | 返回空列表，前端提示 |
| 文件超大 | 按优先级截断 |
| GitLab 不可达 | 超时 5s，降级 |
| 权限不足 | 提示最小权限要求 |

核心原则：**GitLab 上下文是增强项，失败时降级而不是中断生成。**

新建 `backend/app/modules/gitlab_config/`：

```
gitlab_config/
├── __init__.py
├── models.py     # GitLabConfig ORM
├── schemas.py    # 请求/响应 Pydantic 模型
├── router.py     # CRUD 路由 + 连接测试端点
└── service.py    # 业务逻辑（Token 加密/解密）
```

API 端点：

```
GET  /gitlab-configs?product_id=xxx      # 获取产品下所有仓库配置
POST /gitlab-configs                     # 新建配置
PUT  /gitlab-configs/{id}               # 更新配置
DELETE /gitlab-configs/{id}             # 删除配置
POST /gitlab-configs/{id}/test          # 连接测试
GET  /gitlab-configs/{id}/tree?path=xxx # 获取文件树（供前端预览）
```

#### 2.3 Prompt 注入

GitLab 源码上下文注入 `assemble_prompt` 第 6 层（与 RAG 合并或并列）：

```python
# 注入格式
## 源码参考（来自 GitLab）
仓库：frontend / 路径：src/pages/quality/
文件：AlertConfig.tsx
  - 页面路径：/quality/alert-config
  - 按钮：【保存】【测试连接】【取消】
  - 表单字段：「告警名称」「告警方式」（邮箱/钉钉/企微）「是否发送明细」（是/否）
```

#### 2.4 前端改动

**设置页**：在现有「设置」页新增「代码仓库」Tab

- 展示当前产品下所有 GitLab 仓库配置列表
- 支持新建/编辑/删除/连接测试
- Token 显示遮码，支持查看（同 AI Key 处理方式）

**工作台**：`GenerationPanel.tsx` 生成区域底部新增折叠区

```
┌─────────────────────────────────────────┐
│  参考代码（可选）              [开关 ●] │
│                                         │
│  仓库  [前端仓库 ▾]                     │
│  路径  [src/pages/quality/    ]  [获取] │
│                                         │
│  ✓ 已加载 12 个文件，约 1,800 tokens    │
└─────────────────────────────────────────┘
```

- 开关默认关闭，用户主动开启
- 点击「获取」后调用 `/gitlab-configs/{id}/tree` 预览文件数和 token 估算
- 生成时将路径和仓库 ID 传给后端，后端实时拉取并注入

---

## 测试覆盖

| 层 | 测试内容 |
|---|---|
| `gitlab/client.py` | mock GitLab API，验证文件获取、分支切换、token 鉴权 |
| `gitlab/extractor.py` | 给定 tsx/py 文件内容 → 验证提取字段/路由正确 |
| `gitlab/context_builder.py` | 4000 token 截断逻辑 |
| `GENERATION_SYSTEM` | 验证新规则在组装后的 Prompt 中存在 |
| 前端 | 仓库配置 CRUD；工作台开关联动测试 |

---

## 实施顺序

```
Phase 1（第 1-4 天）
  ├── 升级 GENERATION_SYSTEM + EXPLORATORY_SYSTEM
  ├── 更新 Few-Shot 示例
  └── 补充/更新单元测试

Phase 2（第 5-18 天）
  ├── GitLabConfig DB 迁移
  ├── gitlab/ 适配层（client + extractor + context_builder）
  ├── gitlab_config/ 模块（CRUD + 连接测试）
  ├── assemble_prompt 第 6 层扩展（支持 gitlab_context）
  ├── 前端设置页"代码仓库"Tab
  └── 前端工作台"参考代码"折叠区
```
