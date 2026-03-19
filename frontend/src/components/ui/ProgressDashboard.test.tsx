import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProgressDashboard from "./ProgressDashboard";

const progressPayload = {
  mode: "delivery-acceptance",
  version: "2.1.0",
  lastUpdated: "2026-03-18T12:00:00+08:00",
  liveStats: null,
  phases: [
    {
      id: "acceptance",
      name: "验收任务",
      status: "in_progress",
      modules: [
        {
          id: "workbench",
          name: "工作台",
          status: "in_progress",
          tasks: [{ id: "TASK-001", name: "主流程验收", status: "done" }],
        },
      ],
    },
  ],
};

const progressPayloadWithLiveStats = {
  ...progressPayload,
  liveStats: {
    requirement_count: 12,
    testcase_count: 108,
    coverage_rate: 87,
    weekly_cases: 23,
    pending_diagnosis: 3,
    selected_iteration_name: "迭代 v1.0",
  },
};

describe("ProgressDashboard", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => progressPayload,
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("prefetches progress data on mount and shows phases after opening the panel", async () => {
    render(<ProgressDashboard />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/progress");
    });

    fireEvent.click(screen.getByRole("button", { name: "打开测试进度大盘" }));

    expect(await screen.findByText("验收任务")).toBeInTheDocument();
    expect(screen.getByText("总体交付进度")).toBeInTheDocument();
  });

  it("refreshes progress data again when the panel is opened", async () => {
    render(<ProgressDashboard />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "打开测试进度大盘" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it("shows live stats section when liveStats is present", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => progressPayloadWithLiveStats,
    });

    render(<ProgressDashboard />);
    fireEvent.click(
      await screen.findByRole("button", { name: "打开测试进度大盘" }),
    );

    expect(await screen.findByText("实时统计")).toBeInTheDocument();
    expect(screen.getByText("需求")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("108")).toBeInTheDocument();
    expect(screen.getByText("87%")).toBeInTheDocument();
  });

  it("does not show live stats section when liveStats is null", async () => {
    render(<ProgressDashboard />);
    fireEvent.click(
      await screen.findByRole("button", { name: "打开测试进度大盘" }),
    );

    await screen.findByText("验收任务");
    expect(screen.queryByText("实时统计")).not.toBeInTheDocument();
  });

  it("clicking a task status icon sends PATCH and refreshes", async () => {
    // Expanding the workbench module to see task row
    render(<ProgressDashboard />);
    fireEvent.click(
      await screen.findByRole("button", { name: "打开测试进度大盘" }),
    );
    await screen.findByText("验收任务");

    // Expand the module row to reveal tasks
    const moduleBtn = screen.getByText("工作台").closest("button");
    if (moduleBtn) fireEvent.click(moduleBtn);

    // The task icon button should appear
    const taskStatusBtn = await screen.findByTitle("点击切换状态");

    // Now click to toggle
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => progressPayload,
    });

    fireEvent.click(taskStatusBtn);

    await waitFor(() => {
      const calls = fetchMock.mock.calls;
      const patchCall = calls.find(
        (c) => c[0] === "/api/progress" && c[1]?.method === "PATCH",
      );
      expect(patchCall).toBeDefined();
    });
  });

  it("manual refresh button triggers a new fetch", async () => {
    render(<ProgressDashboard />);
    fireEvent.click(
      await screen.findByRole("button", { name: "打开测试进度大盘" }),
    );
    await screen.findByText("验收任务");

    const callsBefore = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
