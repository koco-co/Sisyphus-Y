'use client';

export function CaseSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items are static
          key={i}
          className="bg-bg2 border border-border rounded-lg p-3 animate-pulse"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-12 h-4 rounded bg-bg3" />
            <div className="w-8 h-4 rounded bg-bg3" />
          </div>
          <div className="h-4 rounded bg-bg3 w-3/4 mb-2" />
          <div className="space-y-1.5">
            <div className="h-3 rounded bg-bg3 w-full" />
            <div className="h-3 rounded bg-bg3 w-5/6" />
            <div className="h-3 rounded bg-bg3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
