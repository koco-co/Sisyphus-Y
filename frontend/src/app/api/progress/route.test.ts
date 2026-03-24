import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

test('GET maps delivery acceptance progress into acceptance, issue and verification tracks', async () => {
  const originalCwd = process.cwd();
  process.chdir('/Users/poco/Projects/Sisyphus-Y');

  const module = await import('./route');
  const response = await module.GET();

  process.chdir(originalCwd);

  expect(response.status).toBe(200);

  const data = await response.json();
  expect(data.mode).toBe('delivery-acceptance');
  expect(Array.isArray(data.phases)).toBe(true);

  const phaseNames = data.phases.map((phase: { name: string }) => phase.name);
  expect(phaseNames).toContain('验收任务');
  expect(phaseNames).toContain('发现的问题');
  expect(phaseNames).toContain('修复验证');

  const issuePhase = data.phases.find((phase: { id: string }) => phase.id === 'issue');
  expect(issuePhase).toBeDefined();
  expect(
    issuePhase.modules.some(
      (mod: { name: string; tasks?: Array<{ id: string; type?: string }> }) =>
        mod.name === '用例生成' &&
        mod.tasks?.some((task) => task.id === 'ISSUE-004' && task.type === 'critical'),
    ),
  ).toBe(true);

  const acceptancePhase = data.phases.find((phase: { id: string }) => phase.id === 'acceptance');
  expect(acceptancePhase).toBeDefined();
  expect(
    acceptancePhase.modules.some((mod: { tasks?: Array<{ id: string }> }) =>
      mod.tasks?.some((task) => task.id === 'TASK-169'),
    ),
  ).toBe(true);

  expect(
    data.phases.some((phase: { modules: Array<{ status: string }> }) =>
      phase.modules.some(
        (module) => module.status === 'partial' || module.status === 'in_progress',
      ),
    ),
  ).toBe(true);

  // liveStats key is always present (may be null if backend unavailable)
  expect('liveStats' in data).toBe(true);
});

test('PATCH updates a task status and returns ok', async () => {
  // Use a temp directory copy so we never touch the real progress.json
  const tmpDir = await mkdtemp(join(tmpdir(), 'progress-test-'));
  try {
    await copyFile(
      join('/Users/poco/Projects/Sisyphus-Y', 'progress.json'),
      join(tmpDir, 'progress.json'),
    );

    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    // Re-import fresh module in temp context
    const routeModule = await import('./route');

    // Find a pending task to toggle
    const getResp = await routeModule.GET();
    const getJson = await getResp.json();
    const firstPendingTask = getJson.phases
      .flatMap((p: { modules: Array<{ tasks?: Array<{ id: string; status: string }> }> }) =>
        p.modules.flatMap((m) => m.tasks ?? []),
      )
      .find((t: { status: string }) => t.status === 'pending');

    if (!firstPendingTask) {
      process.chdir(originalCwd);
      return; // no pending task — skip
    }

    const patchReq = new Request('http://localhost/api/progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: firstPendingTask.id, status: 'passed' }),
    });

    const patchResp = await routeModule.PATCH(patchReq);
    const patchJson = await patchResp.json();

    process.chdir(originalCwd);

    expect(patchResp.status).toBe(200);
    expect(patchJson.ok).toBe(true);
    expect(patchJson.taskId).toBe(firstPendingTask.id);
    expect(patchJson.status).toBe('passed');
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test('PATCH returns 400 for invalid status', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'progress-test-'));
  try {
    await copyFile(
      join('/Users/poco/Projects/Sisyphus-Y', 'progress.json'),
      join(tmpDir, 'progress.json'),
    );

    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    const routeModule = await import('./route');

    const req = new Request('http://localhost/api/progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 'TASK-001', status: 'unknown_status' }),
    });

    const resp = await routeModule.PATCH(req);
    process.chdir(originalCwd);

    expect(resp.status).toBe(400);
    const json = await resp.json();
    expect(json.error).toMatch(/Invalid status/);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
