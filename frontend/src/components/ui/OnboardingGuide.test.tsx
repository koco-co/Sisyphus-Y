import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

test('OnboardingGuideButton renders a floating bottom-right help button', async () => {
  const module = await import('./OnboardingGuide');
  const OnboardingGuideButton = module.OnboardingGuideButton;
  const html = renderToStaticMarkup(<OnboardingGuideButton />);

  expect(html).toContain('aria-label="帮助与引导"');
  expect(html).toContain('fixed');
  expect(html).toContain('bottom-6');
  expect(html).toContain('right-6');
});

test('shouldAutoOpenOnboarding returns true only when the guide has not been seen', async () => {
  const module = await import('./OnboardingGuide');
  const shouldAutoOpenOnboarding = module.shouldAutoOpenOnboarding;
  const unseenStorage = {
    getItem: () => null,
  };
  const seenStorage = {
    getItem: () => '1',
  };

  expect(shouldAutoOpenOnboarding(unseenStorage, '/')).toBe(true);
  expect(shouldAutoOpenOnboarding(seenStorage, '/')).toBe(false);
});

test('shouldAutoOpenOnboarding stays disabled on task pages even when unseen', async () => {
  const module = await import('./OnboardingGuide');
  const shouldAutoOpenOnboarding = module.shouldAutoOpenOnboarding;
  const unseenStorage = {
    getItem: () => null,
  };

  expect(shouldAutoOpenOnboarding(unseenStorage, '/diagnosis')).toBe(false);
  expect(shouldAutoOpenOnboarding(unseenStorage, '/workbench')).toBe(false);
});
