'use client';
import { Check } from 'lucide-react';
import Link from 'next/link';

export interface WorkflowStep {
  id: number;
  label: string;
  href?: string;
  status: 'done' | 'current' | 'pending';
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  className?: string;
}

export function WorkflowStepper({ steps, className = '' }: WorkflowStepperProps) {
  return (
    <div className={`flex items-center ${className}`}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;

        const dotClass =
          step.status === 'done'
            ? 'bg-sy-accent border-sy-accent text-sy-bg'
            : step.status === 'current'
              ? 'border-sy-accent bg-transparent text-sy-accent'
              : 'border-sy-border-2 bg-transparent text-sy-text-3';

        const labelClass =
          step.status === 'done'
            ? 'text-sy-accent'
            : step.status === 'current'
              ? 'text-sy-text font-medium'
              : 'text-sy-text-3';

        const lineClass =
          idx < steps.length - 1 && steps[idx]?.status === 'done'
            ? 'bg-sy-accent'
            : 'bg-sy-border';

        const dot = (
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-mono transition-colors ${dotClass}`}
          >
            {step.status === 'done' ? <Check className="w-3 h-3" /> : step.id}
          </div>
        );

        const stepContent = (
          <div className="flex flex-col items-center gap-1 min-w-[72px]">
            {dot}
            <span className={`text-[11px] transition-colors ${labelClass}`}>{step.label}</span>
          </div>
        );

        return (
          <div key={step.id} className="flex items-start">
            {step.href && step.status !== 'pending' ? (
              <Link href={step.href} className="hover:opacity-80 transition-opacity">
                {stepContent}
              </Link>
            ) : (
              stepContent
            )}
            {!isLast && (
              <div className={`w-12 h-[2px] mt-3 mx-1 transition-colors ${lineClass}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
