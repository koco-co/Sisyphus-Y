import { render, screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  describe('default rendering', () => {
    it('renders default icon with 48px size', () => {
      render(<EmptyState />);

      const icon = document.querySelector('.lucide-inbox');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('w-12', 'h-12');
    });

    it('renders default title "这里还没有内容"', () => {
      render(<EmptyState />);

      expect(screen.getByText('这里还没有内容')).toBeInTheDocument();
    });
  });

  describe('custom props', () => {
    it('renders custom title', () => {
      render(<EmptyState title="暂无用例" />);

      expect(screen.getByText('暂无用例')).toBeInTheDocument();
    });

    it('renders custom description', () => {
      render(<EmptyState description="请先创建测试用例" />);

      expect(screen.getByText('请先创建测试用例')).toBeInTheDocument();
    });

    it('renders custom icon', () => {
      render(<EmptyState icon={<Inbox className="w-8 h-8" />} />);

      const icon = document.querySelector('.lucide-inbox');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('w-8', 'h-8');
    });

    it('renders action button when provided', () => {
      render(<EmptyState action={<button type="button">新建用例</button>} />);

      expect(screen.getByRole('button', { name: '新建用例' })).toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('applies custom className', () => {
      const { container } = render(<EmptyState className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
