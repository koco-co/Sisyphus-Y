'use client';

import { Bot, Check, Star, Zap } from 'lucide-react';
import { useState } from 'react';

interface ModelInfo {
  name: string;
  provider: string;
  id: string;
  speed: number;
  quality: number;
  cost: number;
  scene: string;
  active: boolean;
}

const models: ModelInfo[] = [
  {
    name: 'GLM-4-Flash',
    provider: '智谱AI',
    id: 'glm-4-flash',
    speed: 5,
    quality: 4,
    cost: 5,
    scene: '需求诊断 / 苏格拉底追问',
    active: true,
  },
  {
    name: 'Qwen-Max',
    provider: '阿里云',
    id: 'qwen-max',
    speed: 3,
    quality: 5,
    cost: 3,
    scene: '复杂用例 CoT 生成',
    active: true,
  },
  {
    name: 'GPT-4o',
    provider: 'OpenAI',
    id: 'gpt-4o-2024-08-06',
    speed: 3,
    quality: 5,
    cost: 2,
    scene: '备用模型',
    active: false,
  },
];

interface SliderParam {
  label: string;
  key: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  fmt: (v: number) => string;
}

const sliderParams: SliderParam[] = [
  {
    label: 'Temperature',
    key: 'temperature',
    min: 0,
    max: 2,
    step: 0.1,
    initial: 0.7,
    fmt: (v) => v.toFixed(1),
  },
  {
    label: 'Max Tokens',
    key: 'maxTokens',
    min: 256,
    max: 8192,
    step: 256,
    initial: 4096,
    fmt: (v) => String(v),
  },
  {
    label: 'Top-P',
    key: 'topP',
    min: 0,
    max: 1,
    step: 0.05,
    initial: 0.95,
    fmt: (v) => v.toFixed(2),
  },
  {
    label: '并发数',
    key: 'concurrency',
    min: 1,
    max: 10,
    step: 1,
    initial: 3,
    fmt: (v) => String(v),
  },
];

const starKeys = ['s1', 's2', 's3', 's4', 's5'] as const;

function StarsRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11.5px] text-text3 w-9">{label}</span>
      <span className="flex gap-0.5">
        {starKeys.map((key, i) => (
          <Star
            key={`${label}-${key}`}
            className={`w-3 h-3 ${i < count ? 'text-accent fill-accent' : 'text-text3/30'}`}
          />
        ))}
      </span>
    </div>
  );
}

export function AIModelSettings() {
  const [activeModel, setActiveModel] = useState('GLM-4-Flash');
  const [paramVals, setParamVals] = useState<Record<string, number>>(
    Object.fromEntries(sliderParams.map((p) => [p.key, p.initial])),
  );

  return (
    <div>
      <div className="sec-header">
        <Bot className="w-4 h-4 text-accent" />
        <span className="sec-title">AI 模型配置</span>
      </div>

      <div className="grid-3 mb-6">
        {models.map((m) => (
          <button
            type="button"
            key={m.name}
            className={`model-card text-left w-full relative ${activeModel === m.name ? 'active' : ''}`}
            onClick={() => setActiveModel(m.name)}
          >
            {activeModel === m.name && (
              <div className="absolute top-3 right-3">
                <Check className="w-4 h-4 text-accent" />
              </div>
            )}
            <div className="mb-2.5">
              <div className="text-sm font-semibold text-text">{m.name}</div>
              <div className="text-[11.5px] text-text3 mt-0.5">{m.provider}</div>
            </div>
            <div className="flex flex-col gap-1.5 mb-2.5">
              <StarsRow label="速度" count={m.speed} />
              <StarsRow label="质量" count={m.quality} />
              <StarsRow label="成本" count={m.cost} />
            </div>
            <div className="text-[11px] text-text3 mb-2">{m.scene}</div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10.5px] text-text3">{m.id}</span>
              {m.active && <span className="pill pill-green text-[10px]">启用</span>}
            </div>
          </button>
        ))}
      </div>

      <hr className="divider" />

      <div className="sec-header">
        <Zap className="w-4 h-4 text-accent" />
        <span className="sec-title">参数调整</span>
      </div>
      <div className="card flex flex-col gap-5">
        {sliderParams.map((p) => (
          <div key={p.key}>
            <div className="flex justify-between mb-1.5">
              <span className="text-[12.5px] text-text2">{p.label}</span>
              <span className="font-mono text-xs text-accent">{p.fmt(paramVals[p.key])}</span>
            </div>
            <input
              type="range"
              min={p.min}
              max={p.max}
              step={p.step}
              value={paramVals[p.key]}
              onChange={(e) =>
                setParamVals((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))
              }
              className="w-full accent-accent"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
