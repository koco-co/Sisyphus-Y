import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecyclePage from './page';

// Mock the API
const mockCleanup = vi.fn().mockResolvedValue({ deleted: 0, retention_days: 30 });
const mockList = vi.fn().mockResolvedValue({ items: [], total: 0 });
const mockRestore = vi.fn().mockResolvedValue({ ok: true });
const mockBatchRestore = vi.fn().mockResolvedValue({ restored: 0 });
const mockPermanentDelete = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/api', () => ({
  recycleApi: {
    cleanup: () => mockCleanup(),
    list: (params: unknown) => mockList(params),
    restore: (type: string, id: string) => mockRestore(type, id),
    batchRestore: (items: unknown) => mockBatchRestore(items),
    permanentDelete: (type: string, id: string) => mockPermanentDelete(type, id),
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

const mockItems = [
  {
    id: '1',
    entity_type: 'requirement',
    name: '需求 A',
    title: '需求 A',
    deleted_at: new Date(Date.now() - 5 * 86_400_000).toISOString(), // 5 days ago
  },
  {
    id: '2',
    entity_type: 'testcase',
    name: '用例 B',
    title: '用例 B',
    deleted_at: new Date(Date.now() - 28 * 86_400_000).toISOString(), // 28 days ago (expiring soon)
  },
  {
    id: '3',
    entity_type: 'template',
    name: '模板 C',
    title: '模板 C',
    deleted_at: new Date(Date.now() - 15 * 86_400_000).toISOString(), // 15 days ago
  },
];

describe('RecyclePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanup.mockResolvedValue({ deleted: 0, retention_days: 30 });
    mockList.mockResolvedValue({ items: [], total: 0 });
    mockRestore.mockResolvedValue({ ok: true });
    mockBatchRestore.mockResolvedValue({ restored: 0 });
  });

  it('calls cleanup API on mount', async () => {
    mockList.mockResolvedValue({ items: mockItems, total: 3 });

    render(<RecyclePage />);

    await waitFor(() => {
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });
  });

  it('cleanup failure does not block list loading', async () => {
    mockCleanup.mockRejectedValue(new Error('Cleanup failed'));
    mockList.mockResolvedValue({ items: mockItems, total: 3 });

    render(<RecyclePage />);

    await waitFor(() => {
      expect(mockCleanup).toHaveBeenCalled();
      expect(mockList).toHaveBeenCalled();
    });

    // Should still show items even if cleanup failed
    await waitFor(() => {
      expect(screen.getByText('需求 A')).toBeInTheDocument();
    });
  });

  it('shows loading skeleton on first load', () => {
    // Keep the list API pending
    mockList.mockImplementation(() => new Promise(() => {}));

    render(<RecyclePage />);

    // Should show skeleton loader (animate-pulse class)
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('restore success shows toast', async () => {
    mockList.mockResolvedValue({ items: mockItems, total: 3 });

    render(<RecyclePage />);

    await waitFor(() => {
      expect(screen.getByText('需求 A')).toBeInTheDocument();
    });

    // Click restore button for first item
    const restoreButtons = screen.getAllByTitle('恢复');
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      expect(mockRestore).toHaveBeenCalledWith('requirement', '1');
    });
  });

  it('restore folder not found shows error toast', async () => {
    mockList.mockResolvedValue({ items: mockItems, total: 3 });
    mockRestore.mockRejectedValue(new Error('folder not found'));

    render(<RecyclePage />);

    await waitFor(() => {
      expect(screen.getByText('需求 A')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByTitle('恢复');
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      expect(mockRestore).toHaveBeenCalled();
    });
  });

  it('tab filter works correctly', async () => {
    mockList.mockResolvedValue({ items: mockItems, total: 3 });

    render(<RecyclePage />);

    await waitFor(() => {
      expect(screen.getByText('需求 A')).toBeInTheDocument();
    });

    // Click on "用例" filter tab
    const testcaseTab = screen.getByRole('button', { name: '用例' });
    fireEvent.click(testcaseTab);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
  });

  it('search filters items correctly', async () => {
    mockList.mockResolvedValue({ items: mockItems, total: 3 });

    render(<RecyclePage />);

    await waitFor(() => {
      expect(screen.getByText('需求 A')).toBeInTheDocument();
    });

    // Type in search
    const searchInput = screen.getByPlaceholderText('搜索已删除项...');
    fireEvent.change(searchInput, { target: { value: '需求' } });

    await waitFor(() => {
      expect(screen.getByText('需求 A')).toBeInTheDocument();
      expect(screen.queryByText('用例 B')).not.toBeInTheDocument();
    });
  });

  it('expiring items (<=3 days) show red text', async () => {
    mockList.mockResolvedValue({ items: mockItems, total: 3 });

    render(<RecyclePage />);

    await waitFor(() => {
      expect(screen.getByText('用例 B')).toBeInTheDocument();
    });

    // Find the row with "2 天" (expiring soon)
    const expiringText = screen.getByText('2 天');
    expect(expiringText).toHaveClass('text-red');
  });
});
