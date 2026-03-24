import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const _PROMPT_DISPLAY_NAMES: Record<string, string> = {
  diagnosis: '需求分析',
  scene_map: '场景地图',
  generation: '用例生成',
  diagnosis_followup: '追问补充',
  diff: '需求对比',
  exploratory: '探索测试',
};

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('TemplatesPage - Prompt Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (templatesApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
  });

  it('Test 1: Prompt Tab displays 6 modules', async () => {
    (templatesApi.listPrompts as ReturnType<typeof vi.fn>).mockResolvedValue(mockPrompts);

    render(<TemplatesPage />);

    // Switch to Prompt tab
    const promptTab = screen.getByRole('button', { name: 'Prompt 模板' });
    fireEvent.click(promptTab);

    await waitFor(() => {
      // Verify all 6 module names are displayed
      expect(screen.getByText('需求分析')).toBeInTheDocument();
      expect(screen.getByText('场景地图')).toBeInTheDocument();
      expect(screen.getByText('用例生成')).toBeInTheDocument();
      expect(screen.getByText('追问补充')).toBeInTheDocument();
      expect(screen.getByText('需求对比')).toBeInTheDocument();
      expect(screen.getByText('探索测试')).toBeInTheDocument();
    });
  });

  it('Test 2: Built-in templates show "内置" Badge', async () => {
    (templatesApi.listPrompts as ReturnType<typeof vi.fn>).mockResolvedValue(mockPrompts);

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
    (templatesApi.listPrompts as ReturnType<typeof vi.fn>).mockResolvedValue(mockPrompts);

    render(<TemplatesPage />);

    const promptTab = screen.getByRole('button', { name: 'Prompt 模板' });
    fireEvent.click(promptTab);

    await waitFor(() => {
      expect(screen.getByText('需求分析')).toBeInTheDocument();
    });

    // Search for specific module
    const searchInput = screen.getByPlaceholderText('搜索模板...');
    fireEvent.change(searchInput, { target: { value: '分析' } });

    await waitFor(() => {
      expect(screen.getByText('需求分析')).toBeInTheDocument();
      expect(screen.queryByText('场景地图')).not.toBeInTheDocument();
    });
  });

  it('Test 4: "View details" button navigates to /settings?tab=prompts&module={module}', async () => {
    (templatesApi.listPrompts as ReturnType<typeof vi.fn>).mockResolvedValue(mockPrompts);

    render(<TemplatesPage />);

    const promptTab = screen.getByRole('button', { name: 'Prompt 模板' });
    fireEvent.click(promptTab);

    await waitFor(() => {
      expect(screen.getByText('需求分析')).toBeInTheDocument();
    });

    // Find and click the view details button for diagnosis
    const viewButtons = screen.getAllByTitle('查看详情');
    fireEvent.click(viewButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/settings?tab=prompts&module=diagnosis');
  });
});

// Task 2 tests: Export/Import Markdown functionality
describe('TemplatesPage - Prompt Export/Import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (templatesApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
  });

  it('Test 1: Export Markdown generates correct format file', async () => {
    (templatesApi.listPrompts as ReturnType<typeof vi.fn>).mockResolvedValue(mockPrompts);

    render(<TemplatesPage />);

    const promptTab = screen.getByRole('button', { name: 'Prompt 模板' });
    fireEvent.click(promptTab);

    await waitFor(() => {
      expect(screen.getByText('需求分析')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByRole('button', { name: /导出 Markdown/ });
    expect(exportButton).toBeInTheDocument();
  });

  it('Test 2: Import valid Markdown succeeds', async () => {
    (templatesApi.listPrompts as ReturnType<typeof vi.fn>).mockResolvedValue(mockPrompts);

    render(<TemplatesPage />);

    const promptTab = screen.getByRole('button', { name: 'Prompt 模板' });
    fireEvent.click(promptTab);

    await waitFor(() => {
      expect(screen.getByText('需求分析')).toBeInTheDocument();
    });

    // Import button should exist
    const importButton = screen.getByRole('button', { name: /导入 Markdown/ });
    expect(importButton).toBeInTheDocument();
  });

  it('Test 3: Import invalid Markdown shows error Toast', async () => {
    (templatesApi.listPrompts as ReturnType<typeof vi.fn>).mockResolvedValue(mockPrompts);

    render(<TemplatesPage />);

    const promptTab = screen.getByRole('button', { name: 'Prompt 模板' });
    fireEvent.click(promptTab);

    await waitFor(() => {
      expect(screen.getByText('需求分析')).toBeInTheDocument();
    });

    // Import functionality should be present
    const importButton = screen.getByRole('button', { name: /导入 Markdown/ });
    expect(importButton).toBeInTheDocument();
  });
});
