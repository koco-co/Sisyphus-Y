"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navTabs = [
  { href: "/", label: "① 项目列表" },
  { href: "/requirements", label: "② 需求卡片" },
  { href: "/diagnosis", label: "③ 健康诊断" },
  { href: "/scene-map", label: "④ 测试点确认" },
  { href: "/workbench", label: "⑤ 生成工作台" },
  { href: "/testcases", label: "⑥ 用例管理" },
  { href: "/diff", label: "⑦ Diff 视图" },
  { href: "/analytics", label: "⑧ 质量看板" },
  { href: "/settings", label: "⑨ 系统设置" },
  { href: "/knowledge", label: "⑩ 知识库" },
  { href: "/templates", label: "⑪ 模板库" },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      <nav className="top-nav">
        <span className="nav-title">Sisyphus</span>
        {navTabs.map((t) => {
          const isActive =
            t.href === "/"
              ? pathname === "/"
              : pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`tab${isActive ? " active" : ""}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </>
  );
}
