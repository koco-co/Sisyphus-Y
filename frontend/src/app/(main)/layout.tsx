'use client';
import {
  BookOpen,
  ClipboardList,
  FolderSearch,
  GitCompareArrows,
  LayoutDashboard,
  LayoutTemplate,
  Settings,
  Trash2,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GlobalSearch, SearchTrigger } from '@/components/ui/GlobalSearch';
import { OnboardingGuideButton } from '@/components/ui/OnboardingGuide';
import ProgressDashboard from '@/components/ui/ProgressDashboard';
import { UserMenu } from '@/components/ui/UserMenu';
import { NotificationBell } from './_components/NotificationBell';
import { PageTransition } from './_components/PageTransition';

const mainNav = [
  { href: '/', label: '仪表盘', icon: LayoutDashboard },
  { href: '/analysis', label: '分析台', icon: FolderSearch },
  { href: '/workbench', label: '工作台', icon: Wand2 },
  { href: '/diff', label: '需求Diff', icon: GitCompareArrows },
  { href: '/testcases', label: '用例库', icon: ClipboardList },
];

const resourceNav = [
  { href: '/templates', label: '模板库', icon: LayoutTemplate },
  { href: '/knowledge', label: '知识库', icon: BookOpen },
  { href: '/recycle', label: '回收站', icon: Trash2 },
];

function isNavActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/analysis') {
    return (
      pathname.startsWith('/analysis') ||
      pathname.startsWith('/diagnosis') ||
      pathname.startsWith('/scene-map') ||
      pathname.startsWith('/requirements') ||
      pathname.startsWith('/coverage')
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* ── Sidebar ── */}
      <aside className="sidebar-main">
        {/* Logo */}
        <div className="sidebar-logo">
          <span className="sidebar-logo-name">Sisyphus-Y</span>
          <span className="pill pill-green" style={{ fontSize: 10 }}>
            v2.0
          </span>
        </div>

        {/* Nav scroll area */}
        <div className="sidebar-scroll">
          {/* Core */}
          <div className="sidebar-section-label">核心功能</div>
          {mainNav.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`sidebar-item${isNavActive(t.href, pathname) ? ' active' : ''}`}
              >
                <Icon />
                {t.label}
              </Link>
            );
          })}

          <div className="sidebar-divider" />

          {/* Resources */}
          <div className="sidebar-section-label">资源管理</div>
          {resourceNav.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`sidebar-item${isNavActive(t.href, pathname) ? ' active' : ''}`}
              >
                <Icon />
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* Footer: Settings + actions */}
        <div className="sidebar-footer">
          <Link
            href="/settings"
            className={`sidebar-item${pathname.startsWith('/settings') ? ' active' : ''}`}
            style={{ flex: 1, marginBottom: 0 }}
          >
            <Settings />
            设置
          </Link>
          <SearchTrigger />
          <NotificationBell />
          <UserMenu />
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto h-screen">
        <PageTransition>{children}</PageTransition>
      </main>

      <OnboardingGuideButton />
      <ProgressDashboard />
      <GlobalSearch />
    </div>
  );
}
