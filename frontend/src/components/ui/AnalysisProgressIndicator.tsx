'use client';

import { CheckCircle, Loader2, ShieldAlert, Sparkles } from 'lucide-react';

export type AnalysisPhase = 'idle' | 'analyzing' | 'generating_risks' | 'done';

interface AnalysisProgressIndicatorProps {
  phase: AnalysisPhase;
  className?: string;
}

const PHASE_CONFIG: Record<
  AnalysisPhase,
  {
    label: string;
    icon: typeof Loader2;
    iconClass: string;
    barWidth: string;
    showSpinner: boolean;
  }
> = {
  idle: {
    label: '',
    icon: Loader2,
    iconClass: '',
    barWidth: '0%',
    showSpinner: false,
  },
  analyzing: {
    label: '分析需求中...',
    icon: Sparkles,
    iconClass: 'text-sy-accent',
    barWidth: '33%',
    showSpinner: true,
  },
  generating_risks: {
    label: '生成风险清单...',
    icon: ShieldAlert,
    iconClass: 'text-sy-warn',
    barWidth: '66%',
    showSpinner: true,
  },
  done: {
    label: '分析完成',
    icon: CheckCircle,
    iconClass: 'text-sy-accent',
    barWidth: '100%',
    showSpinner: false,
  },
};

export function AnalysisProgressIndicator({
  phase,
  className = '',
}: AnalysisProgressIndicatorProps) {
  if (phase === 'idle') return null;

  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 bg-sy-bg-1 border-b border-sy-border ${className}`}
    >
      {/* Progress bar background */}
      <div className="flex-1 flex items-center gap-2.5">
        <div className="relative h-1.5 flex-1 bg-sy-bg-3 rounded-full overflow-hidden">
          {/* Animated progress bar */}
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-sy-accent to-sy-accent/70 rounded-full transition-all duration-500 ease-out"
            style={{ width: config.barWidth }}
          />
          {/* Pulse animation overlay */}
          {config.showSpinner && (
            <div
              className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-sy-accent/30 to-transparent animate-pulse"
              style={{ left: config.barWidth }}
            />
          )}
        </div>
      </div>

      {/* Phase label with icon */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {config.showSpinner ? (
          <Loader2 className={`w-3.5 h-3.5 animate-spin ${config.iconClass}`} />
        ) : (
          <Icon className={`w-3.5 h-3.5 ${config.iconClass}`} />
        )}
        <span className="text-[11.5px] font-medium text-sy-text-2">{config.label}</span>
      </div>
    </div>
  );
}
