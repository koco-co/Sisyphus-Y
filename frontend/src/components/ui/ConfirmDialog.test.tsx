import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  describe('basic rendering', () => {
    it('renders with default props', () => {
      render(<ConfirmDialog open={true} onConfirm={() => {}} onCancel={() => {}} />);

      expect(screen.getByText('确认操作')).toBeInTheDocument();
      expect(screen.getByText('此操作不可撤销，确认继续？')).toBeInTheDocument();
      expect(screen.getByText('确认')).toBeInTheDocument();
      expect(screen.getByText('取消')).toBeInTheDocument();
    });

    it('renders with custom title and description', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          title="Custom Title"
          description="Custom description"
        />,
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom description')).toBeInTheDocument();
    });
  });

  describe('simple variant', () => {
    it('shows recycle bin hint when variant is simple', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          variant="simple"
          itemName="测试用例"
        />,
      );

      expect(screen.getByText(/删除后可在回收站中找回/)).toBeInTheDocument();
    });

    it('shows custom description when provided (simple variant)', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          variant="simple"
          itemName="测试用例"
          description="Custom simple description"
        />,
      );

      expect(screen.getByText('Custom simple description')).toBeInTheDocument();
      expect(screen.queryByText(/删除后可在回收站中找回/)).not.toBeInTheDocument();
    });
  });

  describe('cascade variant', () => {
    it('shows impact count when variant is cascade', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          variant="cascade"
          itemName="需求文档"
          impactCount={5}
        />,
      );

      expect(screen.getByText(/将同时删除 5 条关联用例/)).toBeInTheDocument();
      expect(screen.getByText(/此操作不可撤销/)).toBeInTheDocument();
    });

    it('confirm button has sy-danger style when variant is cascade', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          variant="cascade"
          itemName="需求文档"
          impactCount={3}
          confirmText="删除"
        />,
      );

      const confirmButton = screen.getByText('删除').closest('button');
      expect(confirmButton).toHaveClass('bg-sy-danger');
    });

    it('shows custom description when provided (cascade variant)', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          variant="cascade"
          itemName="需求文档"
          impactCount={5}
          description="Custom cascade description"
        />,
      );

      expect(screen.getByText('Custom cascade description')).toBeInTheDocument();
      expect(screen.queryByText(/将同时删除/)).not.toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls onConfirm when confirm button is clicked', () => {
      const onConfirm = vi.fn();
      render(<ConfirmDialog open={true} onConfirm={onConfirm} onCancel={() => {}} />);

      fireEvent.click(screen.getByText('确认'));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog open={true} onConfirm={() => {}} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('取消'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
