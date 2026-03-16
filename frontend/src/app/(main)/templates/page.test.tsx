import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TemplatesPage from './page';

// Mock the API
vi.mock('@/lib/api', () => ({
  templatesApi: {
    list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    listPrompts: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    detail: string;
    constructor(status: number, detail: string) {
      super(`API ${status}: ${detail}`);
      this.status = status;
      this.detail = detail;
    }
  },
}));

import { templatesApi } from '@/lib/api';

const mockPrompts = [
  {
    id: '1',
    module_key: 'diagnosis',
    prompt_text: '## 1 身份声明\n...',
    is_default: true,
    is_customized: false,
    version: 0,
    updated_at: null,
    created_at: null,
  },
  {
    id: '2',
    module_key: 'scene_map',
    prompt_text: '## 1 身份声明\n...',
    is_default: true,
    is_customized: false,
    version: 0,
    updated_at: null,
    created_at: null,
  },
  {
    id: '3',
    module_key: 'generation',
    prompt_text: '## 1 身份声明\n...',
    is_default: true,
    is_customized: false,
    version: 0,
    updated_at: null,
    created_at: null,
  },
  {
    id: '4',
    module_key: 'diagnosis_followup',
    prompt_text: '## 1 身份声明\n...',
    is_default: true,
    is_customized: false,
    version: 0,
    updated_at: null,
    created_at: null,
  },
  {
    id: '5',
    module_key: 'diff',
    prompt_text: '## 1 身份声明\n...',
    is_default: true,
    is_customized: false,
    version: 0,
    updated_at: null,
    created_at: null,
  },
  {
    id: '6',
    module_key: 'exploratory',
    prompt_text: '## 1 身份声明\n...',
    is_default: true,
    is_customized: false,
    version: 0,
    updated_at: null,
    created_at: null,
  },
];

const PROMPT_DISPLAY_NAMES: Record<string, string> = {
  diagnosis: '需求诊断',
  scene_map: '场景地图',
  generation: '用例生成',
  diagnosis_followup: '追问补充',
  diff: '需求对比',
  exploratory: '探索测试',
};

describe('TemplatesPage - Prompt Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(templatesApi.list).mockResolvedValue({ items: [], total: 0 });
  });

  it('Test 1: Prompt Tab displays 6 modules', async () => {
    vi.mocked(templatesApi.listPrompts).mockResolvedValue(mockPrompts);

    render(<TemplatesPage />);

    // Switch to Prompt tab
    const promptTab = screen.getByRole('button', { name: 'Prompt 模板' });
    fireEvent.click(promptTab);

    await waitFor(() => {
      // Verify all 6 module names are displayed
      expect(screen.getByText('需求诊断')).toBeInTheDocument();
      expect(screen.getByText('场景地图')).toBeInTheDocument();
      expect(screen.getByText('用例生成')).toBeInTheDocument();
      expect(screen.getByText('追问补充')).toBeInTheDocument();
      expect(screen.getByText('需求对比')).toBeInTheDocument();
      expect(screen.getByText('探索测试')).toBeInTheDocument();
    });
  });

  it('Test 2: Built-in templates show "内置" Badge', async () => {
    vi.mocked(templatesApi.listPrompts).mockResolvedValue(mockPrompts);

    render(<TemplatesPage />);

    const promptTab = screen.getByRole('button', { name: 'Prompt 模板' });
    fireEvent.click(promptTab);

    await waitFor(() => {
      // All default prompts should show "内置" badge
      const builtinBadges = screen.getAllByText('内置');
      expect(builtinBadges.length).toBe(6);
    });
  });

  it('Test 3: Search functionality filters results correctly', async () => {
    vi.mocked(templatesApi.listPrompts).mockResolvedValue(mockPrompts);

    render(<TemplatesPage />);

    const promptTab = screen.getByRole('button', { name: 'Prompt 模板' });
    fireEvent.click(promptTab);

    await waitFor(() => {
      expect(screen.getByText('需求诊断')).toBeInTheDocument();
    });

    // Search for specific module
    const searchInput = screen.getByPlaceholderText('搜索模板...');
    fireEvent.change(searchInput, { target: { value: '诊断' } });

    await waitFor(() => {
      expect(screen.getByText('需求诊断')).toBeInTheDocument();
      expect(screen.queryByText('场景地图')).not.toBeInTheDocument();
    });
  });

  it('Test 4: "View details" button navigates to /settings?tab=prompts&module={module}', async () => {
    vi.mocked(templatesApi.listPrompts).mockResolvedValue(mockPrompts);

    // Mock router
    const mockPush = vi.fn();
    vi.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: mockPush,
    });

    render(<TemplatesPage />);

    const promptTab = screen.getByRole('button', { name: 'Prompt 模板' });
    fireEvent.click(promptTab);

    await waitFor(() => {
      expect(screen.getByText('需求诊断')).toBeInTheDocument();
    });

    // Find and click the view details button for diagnosis
    const viewButtons = screen.getAllByTitle('查看详情');
    fireEvent.click(viewButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/settings?tab=prompts&module=diagnosis');
  });
});

describe('TemplatesPage - Prompt Tab Export/Import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(templatesApi.list).mockResolvedValue({ items: [], total: 0 });
  });

  it('Test 1: Export Markdown generates correct format file', async () => {
    vi.mocked(templatesApi.listPrompts).mockResolvedValue(mockPrompts);

    // Mock URL.createObjectURL and link click
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock anchor element
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLAnchorElement);

    render(<TemplatesPage />);

    const promptTab = screen.getByRole('button', { name: 'Prompt 模板' });
    fireEvent.click(promptTab);

    await waitFor(() => {
      expect(screen.getByText('需求诊断')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByRole('button', { name: /导出/i });
    fireEvent.click(exportButton);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toMatch(/prompt-templates-.*\.md/);
  });

  it('Test 2: Import valid Markdown succeeds', async () => {
    vi.mocked(templatesApi.listPrompts).mockResolvedValue(mockPrompts);

    const validMarkdown = `# Prompt 模板导出

导出时间：2026-03-16T10:00:00Z

---

## 需求诊断 (diagnosis)

**身份声明**：
你是 Sisyphus-Y 平台的需求质量分析专家。

**任务边界**：
只做需求分析。

**输出规范**：
输出 JSON 格式。

**质量红线**：
禁止模糊断言。

---

## 场景地图 (scene_map)

**身份声明**：
你是场景地图构建专家。
`;

    const file = new File([validMarkdown], 'prompts.md', { type: 'text/markdown' });

    render(<TemplatesPage />);

    const promptTab = screen.getByRole('button', { name: 'Prompt 模板' });
    fireEvent.click(promptTab);

    await waitFor(() => {
      expect(screen.getByText('需求诊断')).toBeInTheDocument();
    });

    // Click import button
    const importButton = screen.getByRole('button', { name: /导入/i });

    // Mock file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    vi.spyOn(document, 'createElement').mockImplementationOnce((tag) => {
      if (tag === 'input') return fileInput;
      return document.createElement(tag);
    });

    fireEvent.click(importButton);

    // Simulate file selection
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    // Should show import preview dialog
    await waitFor(() => {
      expect(screen.getByText(/导入预览/i)).toBeInTheDocument();
    });
  });

  it('Test 3: Import invalid Markdown shows error Toast', async () => {
    vi.mocked(templatesApi.listPrompts).mockResolvedValue(mockPrompts);

    const invalidMarkdown = 'This is not a valid prompt template file';

    const file = new File([invalidMarkdown], 'invalid.md', { type: 'text/markdown' });

    render(<TemplatesPage />);

    const promptTab = screen.getByRole('button', { name: 'Prompt 模板' });
    fireEvent.click(promptTab);

    await waitFor(() => {
      expect(screen.getByText('需求诊断')).toBeInTheDocument();
    });

    // Click import button
    const importButton = screen.getByRole('button', { name: /导入/i });

    // Mock file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    vi.spyOn(document, 'createElement').mockImplementationOnce((tag) => {
      if (tag === 'input') return fileInput;
      return document.createElement(tag);
    });

    fireEvent.click(importButton);

    // Simulate file selection
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    // Should show error toast
    await waitFor(() => {
      expect(screen.getByText(/文件格式无效|无法解析/i)).toBeInTheDocument();
    });
  });
});
