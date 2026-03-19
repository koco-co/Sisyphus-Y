import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TestPlanCompatibilityPage from "./page";

mock.module("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

test("test plan compatibility page renders migration guidance instead of a broken page", () => {
  const html = renderToStaticMarkup(<TestPlanCompatibilityPage />);

  expect(html).toContain("测试计划模块已下线");
  expect(html).toContain('href="/analysis"');
  expect(html).toContain('href="/workbench"');
  expect(html).toContain('href="/testcases"');
});
