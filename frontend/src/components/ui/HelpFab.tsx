'use client';

import { CircleHelp, Keyboard, MessageCircle, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { OnboardingGuideModal } from './OnboardingGuide';

interface HelpFabProps {
  onShowOnboarding?: () => void;
}

export function HelpFab({ onShowOnboarding }: HelpFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleShowOnboarding = useCallback(() => {
    if (onShowOnboarding) {
      onShowOnboarding();
    } else {
      setShowOnboarding(true);
    }
    setIsOpen(false);
  }, [onShowOnboarding]);

  const handleShowShortcuts = useCallback(() => {
    // TODO: 显示快捷键弹窗
    setIsOpen(false);
  }, []);

  const handleFeedback = useCallback(() => {
    window.open('https://github.com/issue/new', '_blank');
    setIsOpen(false);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const menuItems = [
    {
      icon: RotateCcw,
      label: '重新查看引导',
      onClick: handleShowOnboarding,
    },
    {
      icon: Keyboard,
      label: '快捷键',
      onClick: handleShowShortcuts,
    },
    {
      icon: MessageCircle,
      label: '反馈问题',
      onClick: handleFeedback,
    },
  ];

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        {/* Menu */}
        <div
          className={`absolute bottom-14 right-0 bg-sy-bg-1 border border-sy-border rounded-lg shadow-lg overflow-hidden min-w-[160px] transition-all ${
            isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
          }`}
        >
          {menuItems.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={item.onClick}
              className="flex items-center gap-3 w-full px-4 py-3 text-sy-text hover:bg-sy-bg-2 transition-colors"
            >
              <item.icon className="w-4 h-4 text-sy-text-2" />
              <span className="text-[13px]">{item.label}</span>
            </button>
          ))}
        </div>

        {/* FAB button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-sy-accent hover:bg-sy-accent-2 text-white shadow-lg"
          aria-label={isOpen ? '关闭帮助菜单' : '打开帮助菜单'}
        >
          {isOpen ? <X className="w-6 h-6" /> : <CircleHelp className="w-6 h-6" />}
        </button>
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && <OnboardingGuideModal onClose={() => setShowOnboarding(false)} />}
    </>
  );
}
