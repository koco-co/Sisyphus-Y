import Link from "next/link";

export default function TestPlanCompatibilityPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-49px)] max-w-3xl flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-sy-border bg-sy-bg-1 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-sy-text-3">
          Deprecated Route
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-sy-text">
          测试计划模块已下线
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-6 text-sy-text-2">
          当前版本不再维护独立的“测试计划”页面。原有规划动作已经收敛到分析台、工作台和用例库主链路中，避免与现行交付流程脱节。
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Link
            href="/analysis"
            className="rounded-xl border border-sy-border bg-sy-bg px-4 py-3 text-sm text-sy-text transition-colors hover:border-sy-accent/35 hover:text-sy-accent"
          >
            前往分析台
          </Link>
          <Link
            href="/workbench"
            className="rounded-xl border border-sy-accent/35 bg-sy-accent/10 px-4 py-3 text-sm font-medium text-sy-accent transition-colors hover:bg-sy-accent/15"
          >
            前往工作台
          </Link>
          <Link
            href="/testcases"
            className="rounded-xl border border-sy-border bg-sy-bg px-4 py-3 text-sm text-sy-text transition-colors hover:border-sy-accent/35 hover:text-sy-accent"
          >
            前往用例库
          </Link>
        </div>
      </div>
    </div>
  );
}
