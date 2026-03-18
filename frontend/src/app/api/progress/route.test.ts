import { expect, test } from "vitest";

test("GET maps delivery acceptance progress into acceptance, issue and verification tracks", async () => {
  const originalCwd = process.cwd();
  process.chdir("/Users/poco/Projects/Sisyphus-Y");

  const module = await import("./route");
  const response = await module.GET();

  process.chdir(originalCwd);

  expect(response.status).toBe(200);

  const data = await response.json();
  expect(data.mode).toBe("delivery-acceptance");
  expect(Array.isArray(data.phases)).toBe(true);

  const phaseNames = data.phases.map((phase: { name: string }) => phase.name);
  expect(phaseNames).toContain("验收任务");
  expect(phaseNames).toContain("发现的问题");
  expect(phaseNames).toContain("修复验证");

  const issuePhase = data.phases.find(
    (phase: { id: string }) => phase.id === "issue",
  );
  expect(issuePhase).toBeDefined();
  expect(
    issuePhase.modules.some(
      (mod: { name: string; tasks?: Array<{ id: string; type?: string }> }) =>
        mod.name === "用例生成" &&
        mod.tasks?.some(
          (task) => task.id === "ISSUE-004" && task.type === "critical",
        ),
    ),
  ).toBe(true);

  const acceptancePhase = data.phases.find(
    (phase: { id: string }) => phase.id === "acceptance",
  );
  expect(acceptancePhase).toBeDefined();
  expect(
    acceptancePhase.modules.some((mod: { tasks?: Array<{ id: string }> }) =>
      mod.tasks?.some((task) => task.id === "TASK-169"),
    ),
  ).toBe(true);

  expect(
    data.phases.some((phase: { modules: Array<{ status: string }> }) =>
      phase.modules.some(
        (module) =>
          module.status === "partial" || module.status === "in_progress",
      ),
    ),
  ).toBe(true);
});
