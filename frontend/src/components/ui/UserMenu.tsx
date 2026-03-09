'use client';

import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-bg2 transition-colors"
        onClick={() => setOpen(!open)}
        aria-label="用户菜单"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="w-7 h-7 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-accent" />
        </div>
        <span className="text-[12px] text-text2 hidden sm:inline">管理员</span>
        <ChevronDown className="w-3 h-3 text-text3" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-48 bg-bg1 border border-border rounded-lg shadow-lg z-50 overflow-hidden" role="menu">
          <div className="px-4 py-3 border-b border-border">
            <div className="text-[13px] font-medium text-text">管理员</div>
            <div className="text-[11px] text-text3 mt-0.5">admin@sisyphus.dev</div>
          </div>

          <div className="py-1">
            <Link
              href="/settings"
              className="flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-text2 hover:bg-bg2 transition-colors"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <Settings className="w-3.5 h-3.5" />
              系统设置
            </Link>
            <button
              type="button"
              className="flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-red hover:bg-red/5 transition-colors w-full text-left"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                // TODO: integrate with auth store logout
                window.location.href = '/login';
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
