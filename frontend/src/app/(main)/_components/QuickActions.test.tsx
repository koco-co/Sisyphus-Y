import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

test('QuickActions sends users to the analysis hub instead of legacy diagnosis route', async () => {
  const module = await import('./QuickActions');
  const QuickActions = module.default;

  const html = renderToStaticMarkup(<QuickActions />);

  expect(html).toContain('href="/analysis"');
  expect(html).not.toContain('href="/diagnosis"');
});
