---
phase: 06
plan: 00
type: execute
wave: 0
depends_on: []
files_modified: []
autonomous: true
requirements: []
user_setup: []
must_haves:
  truths:
    - "测试脚手架文件存在且可执行"
    - "前端单元测试框架配置正确"
    - "后端测试框架配置正确"
  artifacts:
    - path: "frontend/src/app/(main)/diagnosis/_components/__tests__/RequirementDetailTab.test.tsx"
      provides: "Markdown 渲染测试基线"
    - path: "backend/tests/unit/test_files/__init__.py"
      provides: "files API 测试目录"
  key_links: []
---

<objective>
创建 Phase 6 的 Wave 0 测试脚手架，为后续实现提供 RED 基线测试。

Purpose: TDD 模式要求先有失败测试，确保实现后测试变绿
Output: 测试文件骨架，测试运行返回预期失败
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/06-chrome-users-poco-documents-dtstack-xmindcase-dataassets-story-story-15602-md/06-CONTEXT.md
@.planning/phases/06-chrome-users-poco-documents-dtstack-xmindcase-dataassets-story-story-15602-md/06-RESEARCH.md
</context>

<interfaces>
<!-- Key types and contracts from codebase -->

From frontend/src/app/(main)/settings/_components/TestStandardEditor.tsx:
```tsx
import ReactMarkdown from 'react-markdown';
// Markdown 渲染样式模式:
// className="prose-sm text-text2 text-[13px] leading-relaxed
//   [&_h1]:text-text [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-4
//   [&_h2]:text-text [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2
//   [&_ul]:pl-5 [&_ul]:list-disc [&_li]:mb-1
//   [&_code]:font-mono [&_code]:text-accent [&_code]:bg-bg3 [&_code]:px-1 [&_code]:rounded"
```

From backend/app/engine/uda/image_handler.py:
```python
async def archive_image(file_bytes: bytes, original_filename: str, requirement_id: str | None = None) -> str:
    # 返回 "{BUCKET_NAME}/images/{req_id}/{hash}{ext}"

def get_image_url(object_path: str, expires_hours: int = 24) -> str:
    # 返回 presigned URL

# URL 替换模式: 外链图片 URL 被替换为 "/api/files/{BUCKET_NAME}/images/..."
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: 创建 Markdown 渲染测试脚手架</name>
  <files>frontend/src/app/(main)/diagnosis/_components/__tests__/RequirementDetailTab.test.tsx</files>
  <read_first>
    - frontend/src/app/(main)/diagnosis/_components/RequirementDetailTab.tsx
    - frontend/src/app/(main)/settings/_components/TestStandardEditor.tsx
    - frontend/vitest.config.ts
  </read_first>
  <behavior>
    - Test 1: 渲染 Markdown 标题为 h1 元素
    - Test 2: 渲染 Markdown 列表为 ul/li 元素
    - Test 3: 渲染 Markdown 图片为 img 元素
    - Test 4: 渲染 Markdown 链接为 a 元素
    - Test 5: 渲染 Markdown 代码块为 code 元素
  </behavior>
  <action>
    创建测试文件 `frontend/src/app/(main)/diagnosis/_components/__tests__/RequirementDetailTab.test.tsx`:

    1. 导入必要的测试工具：
       - `import { render, screen } from '@testing-library/react'`
       - `import { describe, it, expect } from 'vitest'`

    2. 创建测试用例（目前会失败，因为 RequirementDetailTab 使用 whitespace-pre-wrap）：

    ```tsx
    import { render, screen } from '@testing-library/react';
    import { describe, it, expect } from 'vitest';
    import { RequirementDetailTab } from '../RequirementDetailTab';

    // Mock useRequirement hook
    vi.mock('@/hooks/useRequirement', () => ({
      useRequirement: () => ({
        requirement: {
          id: 'test-req-id',
          title: '测试需求',
          content: '# 标题\n\n- 列表项1\n- 列表项2\n\n![图片](https://example.com/img.png)\n\n[链接](https://example.com)\n\n`代码`',
          content_ast: { raw_text: '# 标题\n\n- 列表项1\n- 列表项2\n\n![图片](https://example.com/img.png)\n\n[链接](https://example.com)\n\n`代码`' },
        },
        requirementLoading: false,
        updateContent: vi.fn(),
        updating: false,
      }),
    }));

    describe('RequirementDetailTab Markdown Rendering', () => {
      it('renders h1 element for markdown heading', () => {
        render(<RequirementDetailTab reqId="test-req-id" onStartAnalysis={() => {}} />);
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });

      it('renders ul/li elements for markdown list', () => {
        render(<RequirementDetailTab reqId="test-req-id" onStartAnalysis={() => {}} />);
        expect(screen.getByRole('list')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
      });

      it('renders img element for markdown image', () => {
        render(<RequirementDetailTab reqId="test-req-id" onStartAnalysis={() => {}} />);
        expect(screen.getByRole('img')).toBeInTheDocument();
      });

      it('renders link element for markdown link', () => {
        render(<RequirementDetailTab reqId="test-req-id" onStartAnalysis={() => {}} />);
        expect(screen.getByRole('link')).toBeInTheDocument();
      });

      it('renders code element for markdown inline code', () => {
        render(<RequirementDetailTab reqId="test-req-id" onStartAnalysis={() => {}} />);
        expect(screen.getByText('代码').closest('code')).toBeInTheDocument();
      });
    });
    ```

    3. 确保测试文件可以被 vitest 发现（匹配 `**/*.test.{ts,tsx}` 模式）

    4. 先不创建 `__tests__` 目录，直接运行测试确认失败（RED 阶段）
  </action>
  <verify>
    <automated>cd /Users/poco/Projects/Sisyphus-case-platform/frontend && bunx vitest run src/app/\(main\)/diagnosis/_components/__tests__/RequirementDetailTab.test.tsx --reporter=basic 2>&1 | head -50</automated>
  </verify>
  <done>
    - 测试文件存在于 `frontend/src/app/(main)/diagnosis/_components/__tests__/RequirementDetailTab.test.tsx`
    - 运行测试返回失败（因为当前实现使用 whitespace-pre-wrap，不是 Markdown 渲染）
    - 测试输出包含 "FAIL" 或类似失败标记
  </done>
</task>

<task type="auto">
  <name>Task 2: 创建 files API 测试目录</name>
  <files>backend/tests/unit/test_files/__init__.py, backend/tests/unit/test_files/test_router.py</files>
  <read_first>
    - backend/app/engine/uda/image_handler.py
    - backend/app/main.py
    - backend/tests/conftest.py
  </read_first>
  <behavior>
    - Test 1: GET /api/files/{bucket}/{path} 返回 302 重定向
    - Test 2: GET /api/files/invalid 返回 404
  </behavior>
  <action>
    创建测试目录和测试文件:

    1. 创建 `backend/tests/unit/test_files/__init__.py`（空文件）

    2. 创建 `backend/tests/unit/test_files/test_router.py`:

    ```python
    """Unit tests for files API endpoint."""

    import pytest
    from unittest.mock import patch, MagicMock

    @pytest.mark.asyncio
    async def test_serve_file_returns_redirect():
        """Test that /api/files/{bucket}/{path} returns 302 redirect."""
        from fastapi.testclient import TestClient
        from app.main import app

        with patch("app.modules.files.router.get_image_url") as mock_get_url:
            mock_get_url.return_value = "https://minio.example.com/presigned-url"

            client = TestClient(app)
            response = client.get("/api/files/sisyphus-images/images/test/image.png", follow_redirects=False)

            assert response.status_code == 302
            mock_get_url.assert_called_once_with("sisyphus-images/images/test/image.png", expires_hours=24)

    @pytest.mark.asyncio
    async def test_serve_file_not_found():
        """Test that /api/files/invalid returns 404."""
        from fastapi.testclient import TestClient
        from app.main import app

        with patch("app.modules.files.router.get_image_url") as mock_get_url:
            mock_get_url.side_effect = Exception("File not found")

            client = TestClient(app)
            response = client.get("/api/files/invalid/path")

            assert response.status_code == 404
    ```

    3. 注意：测试会失败因为 `app.modules.files` 模块尚不存在
  </action>
  <verify>
    <automated>cd /Users/poco/Projects/Sisyphus-case-platform/backend && uv run pytest tests/unit/test_files/ -v 2>&1 | head -30</automated>
  </verify>
  <done>
    - 测试文件存在于 `backend/tests/unit/test_files/test_router.py`
    - 运行测试返回失败（因为 files 模块尚不存在）
    - 测试输出包含 "ModuleNotFoundError" 或 "FAILED"
  </done>
</task>

</tasks>

<verification>
- 前端测试文件存在且测试失败（RED）
- 后端测试目录存在且测试失败（RED）
- 测试框架配置正确
</verification>

<success_criteria>
- `frontend/src/app/(main)/diagnosis/_components/__tests__/RequirementDetailTab.test.tsx` 存在
- `backend/tests/unit/test_files/test_router.py` 存在
- 运行前端测试返回失败（Markdown 渲染尚未实现）
- 运行后端测试返回失败（files 模块尚未实现）
</success_criteria>

<output>
After completion, create `.planning/phases/06-chrome-users-poco-documents-dtstack-xmindcase-dataassets-story-story-15602-md/06-00-SUMMARY.md`
</output>
