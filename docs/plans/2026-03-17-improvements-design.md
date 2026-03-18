# Sisyphus-Y 改进建议设计文档

**日期**: 2026-03-17
**版本**: v2.1
**范围**: 全面改进（代码质量 / 产品体验 / AI 生成质量）

---

## 一、代码质量 / Bug

### BUG-001/002 ｜ P1 — 设计 Token 违规
**文件**: `RequirementDetailTab.tsx:14-17`, `RagPreviewPanel.tsx:129`

违规示例（当前 → 应改）：
- `bg-red/10 text-red` → `bg-sy-danger/10 text-sy-danger`
- `bg-amber/10 text-amber` → `bg-sy-warn/10 text-sy-warn`
- `bg-blue/10 text-blue` → `bg-sy-info/10 text-sy-info`
- `bg-bg3 text-text3 border-border2` → `bg-sy-bg-3 text-sy-text-3 border-sy-border-2`

**验收**: TASK-150

---

### BUG-003 ｜ P0（安全）— Files API 无 bucket 白名单
**文件**: `backend/app/modules/files/router.py`

`serve_file` 接受任意 `bucket` 参数，无校验，可枚举内部 bucket。

**修复方案**:
```python
ALLOWED_BUCKETS = {"sisyphus-images", "sisyphus-docs"}

@router.get("/{bucket}/{path:path}")
async def serve_file(bucket: str, path: str):
    if bucket not in ALLOWED_BUCKETS:
        raise HTTPException(status_code=403, detail="Access denied")
    ...
```

**验收**: TASK-151

---

### BUG-004 ｜ P2 — 三 Tab 同时挂载
**文件**: `AnalysisRightPanel.tsx:56-67`

使用 CSS `hidden` 切换导致三个 Tab 同时挂载，产生不必要的 API 请求。

**修复方案**: Lazy mount — 首次点击 Tab 时挂载，之后保持挂载（preserve state）：
```tsx
const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['detail']));

const handleTabChange = (key) => {
  setVisitedTabs(prev => new Set([...prev, key]));
  onTabChange(key);
};

// 只渲染已访问过的 Tab
{visitedTabs.has('analysis') && (
  <div className={activeTab === 'analysis' ? '' : 'hidden'}>
    <AnalysisTab ... />
  </div>
)}
```

**验收**: TASK-152

---

### BUG-005 ｜ P2 — extractAstText 函数在组件内定义
**文件**: `RequirementDetailTab.tsx:27-33`

应移至组件外部（文件顶层），避免每次渲染重新创建。

**验收**: TASK-153

---

## 二、产品体验

### UX-001 ｜ P1 — 工作台测试点全选
在 `GroupSection` 标题行增加三态 checkbox（全选/部分选/全不选），支持一键操作整组。

**验收**: TASK-154

---

### UX-002 ｜ P1 — onStartAnalysis 竞态修复
`AnalysisRightPanel` 中 `startDiagnosis` 应在 `visible=true` 后（Tab 渲染完成）才触发，而非与 `onTabChange` 同步调用。

建议改为在 `AnalysisTab` 内部通过 `useEffect` 监听 `visible` prop 变化来触发。

**验收**: TASK-155

---

### UX-003 ｜ P2 — 切换需求骨架屏
切换需求时右侧显示骨架屏（标题块 + 内容块的灰色占位），并取消上一次未完成的请求（AbortController）。

**验收**: TASK-156

---

### UX-004 ｜ P2 — RAG 相关度展示优化
将原始小数（0.85）改为语义标签（高相关/中相关/低相关）+ 色彩编码，低相关结果自动折叠。

**验收**: TASK-157

---

### UX-005 ｜ P2 — 分析台快捷筛选
在左侧面板搜索框下方增加优先级（P0/P1/P2/P3）+ 分析状态（未分析/分析中/已完成）的 pill 筛选器，与文本搜索叠加（交集）生效。

**验收**: TASK-158

---

### UX-006 ｜ P3 — 场景地图批量确认 missing 节点
在场景地图顶部工具栏增加「批量确认所有 missing 节点」按钮，带二次确认弹窗。

**验收**: TASK-159

---

## 三、AI 生成质量

### AI-001 ｜ P2 — 风险项与测试点关联
在 `test_points` 表中增加 `source_risk_id` 外键，前端测试点卡片显示「源自：[风险描述摘要]」徽章，支持点击查看原始风险。

**验收**: TASK-160

---

### AI-002 ｜ P2 — 用例质量反馈机制
在用例卡片增加 👍/👎 操作（ThumbsUp/ThumbsDown Lucide 图标），👎 时弹出原因标签选择，反馈数据持久化，为后续 RAG 排序权重提供数据基础。

**验收**: TASK-161

---

### AI-003 ｜ P3 — 测试点预估用例数回填
生成完成后将实际用例数回填到 TestPoint 记录，历史已生成的测试点显示实际数而非预估数。

**验收**: TASK-162

---

## 优先级汇总

| 优先级 | Task ID | 类型 | 标题 |
|---|---|---|---|
| P0 安全 | TASK-151 | Bug | Files API bucket 白名单 |
| P1 | TASK-150 | Bug | 设计 Token 违规 |
| P1 | TASK-154 | 改进 | 工作台全选测试点 |
| P1 | TASK-155 | Bug | onStartAnalysis 竞态 |
| P2 | TASK-152 | Bug | 三 Tab 懒加载 |
| P2 | TASK-153 | Bug | extractAstText 位置 |
| P2 | TASK-156 | 改进 | 切换需求骨架屏 |
| P2 | TASK-157 | 改进 | RAG 相关度展示 |
| P2 | TASK-158 | 改进 | 分析台快捷筛选 |
| P2 | TASK-160 | 改进 | 风险项与测试点关联 |
| P2 | TASK-161 | 改进 | 用例质量反馈 |
| P3 | TASK-159 | 改进 | 批量确认 missing 节点 |
| P3 | TASK-162 | 改进 | 预估用例数回填 |
