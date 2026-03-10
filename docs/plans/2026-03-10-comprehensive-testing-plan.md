# Sisyphus-Y 综合测试计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 对 Sisyphus Case Platform 全平台进行系统性测试，覆盖代码审查、单元测试、接口测试、UI 样式测试、端到端流程测试及 AI 生成质量评估，并将所有测试任务写入 progress.json 在进度大盘可视化。

**Architecture:** 测试分 8 个阶段（T0–T7），从基础设施连通性验证到 AI 质量评估，每个阶段下设模块，每个模块下有 2–8 个独立可执行的细粒度测试任务。进度通过 progress.json 持久化，前端进度大盘实时展示。

**Tech Stack:** pytest + pytest-asyncio（后端）, httpx（API 测试）, agent-browser（前端 UI/E2E）, 直接代码审查（规范检查）

---

## 修复项（立即处理）

### Fix-01: 修复进度大盘按钮显示问题
- 移除 antd Drawer/Collapse/Spin/Tooltip 依赖，改用原生 CSS + React state
- 扩展 Module 支持 tasks 数组（3 级展示：Phase → Module → Task）
- 重写 ProgressDashboard.tsx

### Fix-02: 重建 progress.json
- 格式扩展为支持 tasks 数组
- 写入全部 8 个测试阶段、~55 个模块、~200 个细粒度任务

---

## 测试阶段总览

| 阶段 | 名称 | 模块数 | 预计任务数 |
|------|------|--------|-----------|
| T0 | 环境验证 | 2 | 10 |
| T1 | 后端代码规范审查 | 12 | 48 |
| T2 | 后端接口测试 | 8 | 40 |
| T3 | AI 引擎功能测试 | 6 | 24 |
| T4 | 前端代码规范审查 | 4 | 16 |
| T5 | 前端 UI 样式测试 | 10 | 40 |
| T6 | 端到端业务流程测试 | 4 | 16 |
| T7 | AI 生成质量评估 | 4 | 16 |

---

## Task 1: 修复 ProgressDashboard 组件

**Files:**
- Modify: `frontend/src/components/ui/ProgressDashboard.tsx`

步骤：
1. 移除 antd 依赖，使用原生 React + globals.css
2. 添加 Task 接口支持
3. 实现 3 级展示（Phase → Module → Task）
4. 修复 Drawer 改为 slide-in panel
5. 验证按钮可见可点击

---

## Task 2: 创建 progress.json

**Files:**
- Create: `progress.json`（项目根目录）

全量测试任务，8 个阶段，~200 任务

---

## Task 3: 执行 T0 环境验证

验证所有服务连通性：FastAPI、PostgreSQL、Redis、Qdrant、MinIO、Next.js

---

## Task 4: 执行 T1 后端代码审查

对每个后端模块（M00-M21）进行代码规范审查：
- router.py 是否只做参数校验
- service.py 是否无 Prompt
- models.py SoftDeleteMixin 是否应用
- Prompt 是否只在 engine/ 层

---

## Task 5: 执行 T2 后端接口测试

对所有 REST API 端点进行 HTTP 测试（使用 curl/httpx）

---

## Task 6: 执行 T3 AI 引擎测试

使用提供的需求文档测试：
- UDA 解析
- 诊断扫描
- 场景地图生成
- 用例 SSE 流式生成
- Diff 引擎
- RAG 检索

---

## Task 7: 执行 T4 前端代码审查

审查前端代码：
- 无硬编码颜色
- 无 emoji 图标
- 使用 sy-* token

---

## Task 8: 执行 T5 前端 UI 测试（agent-browser）

使用 agent-browser 逐页截图验证，对比原型图

---

## Task 9: 执行 T6 E2E 测试（agent-browser）

完整业务流程测试

---

## Task 10: 执行 T7 AI 质量评估

用 docs/信永中和 需求文档测试 AI 生成质量，不合格则修改 Prompt

---

## 修复策略

测试过程中发现 bug 立即修复：
1. 后端 API 问题 → 修改 service/router
2. 前端样式问题 → 修改组件
3. AI 生成质量差 → 修改 engine/ 层 Prompt
4. 向量检索无效 → 修改 rag/ 配置
