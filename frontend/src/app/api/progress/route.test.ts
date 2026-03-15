import { expect, test } from 'bun:test';

test('GET maps current progress.json categories into readable phases and supported statuses', async () => {
  const module = await import('./route');
  const response = await module.GET();

  expect(response.status).toBe(200);

  const data = await response.json();
  expect(Array.isArray(data.phases)).toBe(true);
  expect(data.phases.some((phase: { name: string }) => phase.name === '基础设施')).toBe(true);
  expect(
    data.phases.some((phase: { modules: Array<{ status: string }> }) =>
      phase.modules.some((module) => module.status === 'done'),
    ),
  ).toBe(true);
  expect(
    data.phases.some((phase: { modules: Array<{ status: string }> }) =>
      phase.modules.some((module) => module.status === 'partial'),
    ),
  ).toBe(true);
});
