'use client';

import { AlertTriangle, Check } from 'lucide-react';
import type { ColumnMapping } from './types';
import { REQUIRED_FIELDS, TARGET_FIELDS } from './types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface FieldMappingStepProps {
  columns: string[];
  mappings: ColumnMapping[];
  onMappingChange: (idx: number, target: string | null) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FieldMappingStep({ columns, mappings, onMappingChange }: FieldMappingStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-sy-warn/30 bg-sy-warn/5 px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sy-warn" />
          <p className="text-[12.5px] text-sy-warn">
            未识别为标准格式。请手动映射列名到字段。
            <span className="ml-1 text-sy-text-3">
              带 <span className="font-semibold text-sy-danger">*</span> 为必填字段
            </span>
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-sy-border">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-sy-border bg-sy-bg-2">
              <th className="px-4 py-2.5 text-left font-medium text-sy-text-2">文件列名</th>
              <th className="px-4 py-2.5 text-left font-medium text-sy-text-2">映射到字段</th>
              <th className="px-4 py-2.5 text-left font-medium text-sy-text-2">状态</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col, idx) => {
              const mapping = mappings[idx];
              const isMappedRequired = mapping?.target && REQUIRED_FIELDS.includes(mapping.target);
              return (
                <tr key={col} className="border-b border-sy-border last:border-0">
                  <td className="px-4 py-2.5 font-mono text-sy-text">{col}</td>
                  <td className="px-4 py-2.5">
                    <select
                      value={mapping?.target ?? ''}
                      onChange={(e) => onMappingChange(idx, e.target.value || null)}
                      className="w-full rounded-md border border-sy-border bg-sy-bg-2 px-2 py-1 text-[12px] text-sy-text focus:border-sy-accent focus:outline-none"
                    >
                      <option value="">— 忽略此列 —</option>
                      {TARGET_FIELDS.map((f) => {
                        const isReq = REQUIRED_FIELDS.includes(f.value);
                        return (
                          <option key={f.value} value={f.value}>
                            {isReq ? `* ${f.label}` : f.label}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    {mapping?.target ? (
                      <span
                        className={[
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px]',
                          isMappedRequired
                            ? 'bg-sy-accent/10 text-sy-accent'
                            : 'bg-sy-bg-3 text-sy-text-3',
                        ].join(' ')}
                      >
                        {isMappedRequired && <Check className="h-2.5 w-2.5" />}
                        {isMappedRequired ? '必填' : '可选'}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-sy-text-3">忽略</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* TC-08: required fields validation hint */}
      <div className="flex flex-wrap gap-2">
        {REQUIRED_FIELDS.map((rf) => {
          const isMapped = mappings.some((m) => m.target === rf);
          const fieldLabel = TARGET_FIELDS.find((f) => f.value === rf)?.label ?? rf;
          return (
            <span
              key={rf}
              className={[
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px]',
                isMapped ? 'bg-sy-accent/10 text-sy-accent' : 'bg-sy-danger/10 text-sy-danger',
              ].join(' ')}
            >
              {isMapped ? <Check className="h-2.5 w-2.5" /> : <span className="font-bold">*</span>}
              {fieldLabel}
            </span>
          );
        })}
      </div>
    </div>
  );
}
