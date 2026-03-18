'use client';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Iteration, Product, Requirement } from '@/lib/api';
import { productsApi } from '@/lib/api';

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
}

export function RequirementCascader({ value, onChange }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);

  const [productId, setProductId] = useState<string>('');
  const [iterationId, setIterationId] = useState<string>('');

  useEffect(() => {
    productsApi.list().then((res) => {
      setProducts(res as Product[]);
    });
  }, []);

  useEffect(() => {
    setIterations([]);
    setRequirements([]);
    setIterationId('');
    onChange(null);
    if (!productId) return;
    productsApi.listIterations(productId).then((res) => {
      setIterations(res as Iteration[]);
    });
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setRequirements([]);
    onChange(null);
    if (!productId || !iterationId) return;
    productsApi.listRequirements(productId, iterationId).then((res) => {
      setRequirements(res as Requirement[]);
    });
  }, [iterationId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-sy-text-3">
        三级联动选择
      </label>

      {/* Product */}
      <div className="relative">
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="w-full appearance-none rounded-md border border-sy-border bg-sy-bg-2 px-3 py-1.5 pr-8 text-[12px] text-sy-text outline-none focus:border-sy-accent/50"
        >
          <option value="">选择子产品…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sy-text-3" />
      </div>

      {/* Iteration */}
      <div className="relative">
        <select
          value={iterationId}
          onChange={(e) => setIterationId(e.target.value)}
          disabled={!productId}
          className="w-full appearance-none rounded-md border border-sy-border bg-sy-bg-2 px-3 py-1.5 pr-8 text-[12px] text-sy-text outline-none focus:border-sy-accent/50 disabled:opacity-40"
        >
          <option value="">选择迭代…</option>
          {iterations.map((it) => (
            <option key={it.id} value={it.id}>
              {it.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sy-text-3" />
      </div>

      {/* Requirement */}
      <div className="relative">
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={!iterationId}
          className="w-full appearance-none rounded-md border border-sy-border bg-sy-bg-2 px-3 py-1.5 pr-8 text-[12px] text-sy-text outline-none focus:border-sy-accent/50 disabled:opacity-40"
        >
          <option value="">选择需求…</option>
          {requirements.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sy-text-3" />
      </div>

      {/* UUID 回显 */}
      {value && (
        <p className="truncate rounded bg-sy-bg-3 px-2 py-1 font-mono text-[10px] text-sy-text-3">
          {value}
        </p>
      )}
    </div>
  );
}
