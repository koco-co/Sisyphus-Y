'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import {
  LayoutGrid,
  FileText,
  HeartPulse,
  GitBranch,
  Wand2,
  ClipboardList,
  GitCompareArrows,
  BarChart3,
  Settings,
  BookOpen,
  LayoutTemplate,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

const navTabs = [
  { href: '/', label: '项目列表', icon: LayoutGrid },
  { href: '/requirements', label: '需求卡片', icon: FileText },
  { href: '/diagnosis', label: '健康诊断', icon: HeartPulse },
  { href: '/scene-map', label: '测试点确认', icon: GitBranch },
  { href: '/workbench', label: '生成工作台', icon: Wand2 },
  { href: '/testcases', label: '用例管理', icon: ClipboardList },
  { href: '/diff', label: 'Diff 视图', icon: GitCompareArrows },
  { href: '/analytics', label: '质量看板', icon: BarChart3 },
  { href: '/settings', label: '系统设置', icon: Settings },
  { href: '/knowledge', label: '知识库', icon: BookOpen },
  { href: '/templates', label: '模板库', icon: LayoutTemplate },
];

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="theme-toggle" />;

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  return (
    <button className="theme-toggle" onClick={cycleTheme} title={`当前: ${theme === 'system' ? '跟随系统' : theme === 'dark' ? '深色' : '浅色'}`}>
      {resolvedTheme === 'dark' ? <Moon /> : theme === 'system' ? <Monitor /> : <Sun />}
    </button>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <nav className="top-nav">
        <span className="nav-title">Sisyphus</span>
        {navTabs.map((t) => {
          const Icon = t.icon;
          const isActive =
            t.href === '/'
              ? pathname === '/'
              : pathname === t.href || pathname.startsWith(t.href + '/');
          return (
            <Link key={t.href} href={t.href} className={`tab${isActive ? ' active' : ''}`}>
              <Icon />
              {t.label}
            </Link>
          );
        })}
        <div className="nav-actions">
          <ThemeToggle />
        </div>
      </nav>
      {children}
    </>
  );
}
