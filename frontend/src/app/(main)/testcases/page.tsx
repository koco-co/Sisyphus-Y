'use client';
import { useQuery } from '@tanstack/react-query';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { StatusPill } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

interface TestCase {
  id: string;
  case_id: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2';
  case_type: string;
  status: string;
  source: string;
}

const priorityVariant = { P0: 'red', P1: 'amber', P2: 'gray' } as const;
const statusVariant = { draft: 'gray', reviewed: 'green', pending_review: 'amber' } as const;
const statusLabel: Record<string, string> = { draft: '草稿', reviewed: '已评审', pending_review: '待复核' };

export default function TestCasesPage() {
  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['testcases'],
    queryFn: () => apiClient<TestCase[]>('/testcases?page_size=50'),
  });

  const columns: ColumnsType<TestCase> = [
    { title: '用例 ID', dataIndex: 'case_id', key: 'case_id', width: 120, render: (v: string) => <span className="font-mono text-[11px] text-text3">{v}</span> },
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80, render: (v: string) => <StatusPill variant={priorityVariant[v as keyof typeof priorityVariant] ?? 'gray'}>{v}</StatusPill> },
    { title: '类型', dataIndex: 'case_type', key: 'case_type', width: 80, render: (v: string) => <span className="text-text3 text-[12px]">{v}</span> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (v: string) => <StatusPill variant={statusVariant[v as keyof typeof statusVariant] ?? 'gray'}>{statusLabel[v] ?? v}</StatusPill> },
    { title: '来源', dataIndex: 'source', key: 'source', width: 70, render: (v: string) => <span className="text-text3 text-[12px]">{v === 'ai' ? '🤖 AI' : '✏️ 手动'}</span> },
    { title: '操作', key: 'action', width: 120, render: () => (
      <div className="flex gap-2">
        <button type="button" className="text-[11.5px] text-text3 hover:text-accent transition-colors">✏️ 编辑</button>
        <button type="button" className="text-[11.5px] text-text3 hover:text-text transition-colors">👁 查看</button>
      </div>
    )},
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h1 className="font-display font-bold text-[20px]">用例管理</h1>
          <div className="text-text3 text-[12px]">{cases.length} 条用例</div>
        </div>
        <div className="flex-1" />
        <input className="bg-bg2 border border-border rounded-md px-3 py-1.5 text-[13px] text-text outline-none focus:border-accent w-[200px] placeholder:text-text3" placeholder="🔍  搜索用例..." />
        <button type="button" className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12.5px] font-semibold bg-accent text-black border border-accent hover:bg-accent2 transition-colors">
          ＋ 手动添加
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['全部', 'P0', 'P1', 'P2'].map((f) => (
          <button type="button" key={f} className="px-3 py-1 rounded-md text-[11.5px] border border-border text-text3 hover:border-border2 hover:text-text transition-colors">{f}</button>
        ))}
        <div className="w-px bg-border mx-1" />
        {['正常', '异常', '边界', '并发'].map((f) => (
          <button type="button" key={f} className="px-3 py-1 rounded-md text-[11.5px] border border-border text-text3 hover:border-border2 hover:text-text transition-colors">{f}</button>
        ))}
      </div>

      <div className="bg-bg1 border border-border rounded-[10px] overflow-hidden">
        <Table
          dataSource={cases}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, size: 'small' }}
          size="small"
        />
      </div>
    </div>
  );
}
