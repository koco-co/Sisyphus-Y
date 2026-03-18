import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProgressDashboard from './ProgressDashboard';

const progressPayload = {
  mode: 'delivery-acceptance',
  version: '2.1.0',
  lastUpdated: '2026-03-18T12:00:00+08:00',
  phases: [
    {
      id: 'acceptance',
      name: '验收任务',
      status: 'in_progress',
      modules: [
        {
          id: 'workbench',
          name: '工作台',
          status: 'in_progress',
          tasks: [{ id: 'TASK-001', name: '主流程验收', status: 'done' }],
        },
      ],
    },
  ],
};

describe('ProgressDashboard', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => progressPayload,
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('prefetches progress data on mount and shows phases after opening the panel', async () => {
    render(<ProgressDashboard />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/progress');
    });

    fireEvent.click(screen.getByRole('button', { name: '打开测试进度大盘' }));

    expect(await screen.findByText('验收任务')).toBeInTheDocument();
    expect(screen.getByText('总体交付进度')).toBeInTheDocument();
  });

  it('refreshes progress data again when the panel is opened', async () => {
    render(<ProgressDashboard />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: '打开测试进度大盘' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});