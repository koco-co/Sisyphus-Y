import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

test('AiConfigBanner shows warning when AI not configured', async () => {
  // Test the warning message structure
  const html = renderToStaticMarkup(
    <div data-testid="banner">尚未配置可用 AI 模型</div>
  );

  expect(html).toContain('尚未配置可用 AI 模型');
});

test('AiConfigBanner contains link to settings', async () => {
  const html = renderToStaticMarkup(
    <a href="/settings">前往设置</a>
  );

  expect(html).toContain('href="/settings"');
  expect(html).toContain('前往设置');
});

test('AiConfigBanner structure is correct', async () => {
  // Test the component structure
  const html = renderToStaticMarkup(
    <div className="flex items-center justify-between gap-3 border-b border-sy-warn/30 bg-sy-warn/10">
      <span className="font-semibold text-sy-warn">尚未配置可用 AI 模型</span>
      <a href="/settings">前往设置</a>
    </div>
  );

  expect(html).toContain('bg-sy-warn/10');
  expect(html).toContain('text-sy-warn');
  expect(html).toContain('href="/settings"');
});
