import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RequirementDetailTab } from '../RequirementDetailTab';

// Mock useRequirement hook
vi.mock('@/hooks/useRequirement', () => ({
  useRequirement: () => ({
    requirement: {
      id: 'test-req-id',
      title: '测试需求',
      content:
        '# 标题\n\n- 列表项1\n- 列表项2\n\n![图片](https://example.com/img.png)\n\n[链接](https://example.com)\n\n`代码`',
      content_ast: {
        raw_text:
          '# 标题\n\n- 列表项1\n- 列表项2\n\n![图片](https://example.com/img.png)\n\n[链接](https://example.com)\n\n`代码`',
      },
    },
    requirementLoading: false,
    updateContent: vi.fn(),
    updating: false,
  }),
}));

describe('RequirementDetailTab Markdown Rendering', () => {
  it('renders h1 element for markdown heading', () => {
    render(<RequirementDetailTab reqId="test-req-id" onStartAnalysis={() => {}} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders ul/li elements for markdown list', () => {
    render(<RequirementDetailTab reqId="test-req-id" onStartAnalysis={() => {}} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders img element for markdown image', () => {
    render(<RequirementDetailTab reqId="test-req-id" onStartAnalysis={() => {}} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders link element for markdown link', () => {
    render(<RequirementDetailTab reqId="test-req-id" onStartAnalysis={() => {}} />);
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('renders code element for markdown inline code', () => {
    render(<RequirementDetailTab reqId="test-req-id" onStartAnalysis={() => {}} />);
    expect(screen.getByText('代码').closest('code')).toBeInTheDocument();
  });
});
