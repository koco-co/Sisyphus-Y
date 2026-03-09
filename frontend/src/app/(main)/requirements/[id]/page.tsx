'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { StatusPill, StatCard } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

interface Requirement {
  id: string;
  iteration_id: string;
  req_id: string;
  title: string;
  content_ast: { content?: string };
  frontmatter: { priority?: string; owner?: string } | null;
  status: string;
  version: number;
}

const statusConfig: Record<string, { variant: 'green' | 'amber' | 'gray' | 'blue'; label: string }> = {
  draft: { variant: 'gray', label: '草稿' },
  confirmed: { variant: 'green', label: '已确认' },
  diagnosed: { variant: 'blue', label: '已诊断' },
  generating: { variant: 'amber', label: '生成中' },
  completed: { variant: 'green', label: '已完成' },
};

export default function RequirementDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: req } = useQuery({
    queryKey: ['requirement', id],
    queryFn: () => apiClient<Requirement>(`/products/requirements/${id}`),
  });

  const { data: sceneMap } = useQuery({
    queryKey: ['scene-map', id],
    queryFn: () => apiClient<{ test_points: { id: string }[] }>(`/scene-map/${id}`),
    retry: false,
  });

  const { data: testcases = [] } = useQuery({
    queryKey: ['testcases-for-req', id],
    queryFn: () => apiClient<{ id: string }[]>(`/testcases?requirement_id=${id}`),
  });

  const status = statusConfig[req?.status ?? 'draft'] ?? statusConfig.draft;
  const priority = req?.frontmatter?.priority ?? 'P1';

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-text3 text-[11px] font-mono mb-1">{req?.req_id ?? '...'}</div>
          <h1 className="font-display font-bold text-[20px]">{req?.title ?? '加载中...'}</h1>
          <div className="flex items-center gap-2 mt-2">
            <StatusPill variant={status.variant}>{status.label}</StatusPill>
            <StatusPill variant={priority === 'P0' ? 'red' : priority === 'P1' ? 'amber' : 'gray'}>{priority}</StatusPill>
            <span className="text-text3 text-[11px]">v{req?.version ?? 1}</span>
          </div>
        </div>
        <Link href={`/diagnosis/${id}`}>
          <button type="button" className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[12.5px] font-semibold bg-accent text-black hover:bg-accent2 transition-colors">
            🩺 开始健康诊断
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-6">
        {/* Main content */}
        <div>
          {/* Meta info */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-bg1 border border-border rounded-lg p-3">
              <div className="text-[10px] text-text3 uppercase tracking-wide">负责人</div>
              <div className="text-[13px] font-medium mt-1">{req?.frontmatter?.owner ?? '未指定'}</div>
            </div>
            <div className="bg-bg1 border border-border rounded-lg p-3">
              <div className="text-[10px] text-text3 uppercase tracking-wide">版本</div>
              <div className="text-[13px] font-mono font-medium mt-1">v{req?.version ?? 1}</div>
            </div>
            <div className="bg-bg1 border border-border rounded-lg p-3">
              <div className="text-[10px] text-text3 uppercase tracking-wide">状态</div>
              <div className="text-[13px] font-medium mt-1">{status.label}</div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-bg1 border border-border rounded-[10px] p-5">
            <div className="text-[12px] font-semibold text-text3 uppercase tracking-wide mb-3">需求内容</div>
            <textarea
              readOnly
              value={req?.content_ast?.content ?? '暂无内容'}
              className="w-full min-h-[300px] bg-bg2 border border-border rounded-lg p-4 text-[13px] text-text leading-relaxed resize-y outline-none font-mono"
            />
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <StatCard
            value={sceneMap?.test_points?.length ?? 0}
            label="关联测试点"
            highlighted={!!sceneMap?.test_points?.length}
          />
          <StatCard
            value={testcases.length}
            label="关联用例"
          />

          <div className="bg-bg1 border border-border rounded-[10px] p-4">
            <div className="text-[12px] font-semibold mb-3">快速操作</div>
            <div className="space-y-2">
              <Link href={`/diagnosis/${id}`} className="block">
                <button type="button" className="w-full text-left px-3 py-2 rounded-md text-[12px] bg-bg2 border border-border text-text2 hover:text-text hover:border-border2 transition-colors">
                  🩺 健康诊断
                </button>
              </Link>
              <Link href={`/scene-map/${id}`} className="block">
                <button type="button" className="w-full text-left px-3 py-2 rounded-md text-[12px] bg-bg2 border border-border text-text2 hover:text-text hover:border-border2 transition-colors">
                  🌳 测试点确认
                </button>
              </Link>
              <Link href={`/workbench/${id}`} className="block">
                <button type="button" className="w-full text-left px-3 py-2 rounded-md text-[12px] bg-bg2 border border-border text-text2 hover:text-text hover:border-border2 transition-colors">
                  ⚡ 生成工作台
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
