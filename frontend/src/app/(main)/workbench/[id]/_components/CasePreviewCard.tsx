import { StatusPill } from '@/components/ui';

interface CasePreviewCardProps {
  caseId: string;
  title: string;
  priority: string;
  caseType: string;
  status: string;
  stepsCount: number;
  onAccept?: () => void;
}

export function CasePreviewCard({ caseId, title, priority, caseType, status, stepsCount, onAccept }: CasePreviewCardProps) {
  return (
    <div className="bg-bg2 border border-border rounded-lg p-3 mb-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <StatusPill variant={priority === 'P0' ? 'red' : priority === 'P1' ? 'amber' : 'gray'}>{priority}</StatusPill>
        <StatusPill variant={caseType === 'normal' ? 'green' : caseType === 'exception' ? 'red' : 'blue'}>{caseType}</StatusPill>
      </div>
      <div className="text-[12.5px] font-medium text-text mb-1">{title}</div>
      <div className="flex items-center gap-2 text-[10.5px] text-text3 font-mono">
        <span>{caseId}</span>
        <span>·</span>
        <span>{stepsCount} 步骤</span>
      </div>
      {status === 'draft' && onAccept && (
        <button type="button" onClick={onAccept} className="mt-2 w-full text-center py-1 rounded-md text-[11px] font-medium bg-accent text-black hover:bg-accent2 transition-colors">
          ✓ 接受用例
        </button>
      )}
      {status === 'reviewed' && (
        <div className="mt-2 text-center py-1 text-[11px] text-accent font-mono">✓ 已接受</div>
      )}
    </div>
  );
}
