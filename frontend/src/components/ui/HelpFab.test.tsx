import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

test('HelpFab renders a floating bottom-right help button', async () => {
  const module = await import('./HelpFab');
  const HelpFab = module.HelpFab;
  const html = renderToStaticMarkup(<HelpFab />);

  expect(html).toContain('fixed');
  expect(html).toContain('bottom-6');
  expect(html).toContain('right-6');
});

test('HelpFab contains menu with correct options when opened', async () => {
  const module = await import('./HelpFab');
  const HelpFab = module.HelpFab;
  const html = renderToStaticMarkup(<HelpFab />);

  // Menu items are rendered in the DOM (hidden via CSS or conditional)
  expect(html).toContain('重新查看引导');
  expect(html).toContain('快捷键');
  expect(html).toContain('反馈问题');
});

test('HelpFab button has correct aria-label', async () => {
  const module = await import('./HelpFab');
  const HelpFab = module.HelpFab;
  const html = renderToStaticMarkup(<HelpFab />);

  expect(html).toContain('aria-label="打开帮助菜单"');
});
