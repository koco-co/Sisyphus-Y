'use client';

import { AlertTriangle, Check, Database, Loader2, RefreshCw, Save, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { ConnectionTestButton } from '@/components/ui/ConnectionTestButton';

interface VectorModelSettingsProps {
  vectorConfig: {
    provider?: string;
    model?: string;
    dimensions?: number;
    collection?: string;
  } | null;
  onSave: (config: Record<string, unknown>) => Promise<boolean>;
  saving?: boolean;
}

const vectorProviders = [
  { id: 'qdrant', name: 'Qdrant', desc: '本地/自建向量库' },
  { id: 'dashscope', name: '阿里 DashScope', desc: 'text-embedding-v3' },
];

export function VectorModelSettings({
  vectorConfig,
  onSave,
  saving = false,
}: VectorModelSettingsProps) {
  const savedDimensions = useRef(vectorConfig?.dimensions || 1024);
  const [provider, setProvider] = useState(vectorConfig?.provider || 'qdrant');
  const [model, setModel] = useState(vectorConfig?.model || 'text-embedding-v3');
  const [dimensions, setDimensions] = useState(vectorConfig?.dimensions || 1024);
  const [collection, setCollection] = useState(vectorConfig?.collection || 'knowledge_chunks');
  const [saved, setSaved] = useState(false);
  const [showRebuildConfirm, setShowRebuildConfirm] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildMsg, setRebuildMsg] = useState('');

  const dimensionsChanged = dimensions !== savedDimensions.current;

  const doSave = async () => {
    const ok = await onSave({
      vector_config: { provider, model, dimensions, collection },
    });
    if (ok) {
      savedDimensions.current = dimensions;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleSave = async () => {
    if (dimensionsChanged) {
      setShowRebuildConfirm(true);
    } else {
      await doSave();
    }
  };

  const handleConfirmRebuild = async () => {
    setShowRebuildConfirm(false);
    setRebuilding(true);
    setRebuildMsg('');
    try {
      const res = await fetch('/api/knowledge/rebuild-vector-index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dimensions, collection }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; docs_queued?: number };
      if (data.ok) {
        setRebuildMsg(`✓ 已排队重建 ${data.docs_queued ?? 0} 篇文档`);
        await doSave();
      } else {
        setRebuildMsg('重建失败，请检查向量库连接');
      }
    } catch {
      setRebuildMsg('请求失败，请检查服务状态');
    } finally {
      setRebuilding(false);
      setTimeout(() => setRebuildMsg(''), 5000);
    }
  };

  return (
    <div>
      <div className="sec-header">
        <Database className="w-4 h-4 text-sy-purple" />
        <span className="sec-title">向量模型配置</span>
      </div>

      <div className="card flex flex-col gap-4">
        <div>
          <span className="text-[12px] text-sy-text-2 mb-1 block">向量库提供者</span>
          <div className="flex gap-2">
            {vectorProviders.map((vp) => (
              <button
                key={vp.id}
                type="button"
                className={`px-3 py-1.5 rounded-md text-[12px] border transition-all ${
                  provider === vp.id
                    ? 'border-sy-purple/50 bg-sy-purple/10 text-sy-purple'
                    : 'border-sy-border bg-sy-bg-2 text-sy-text-3 hover:text-sy-text-2'
                }`}
                onClick={() => setProvider(vp.id)}
              >
                {vp.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="vec-model" className="text-[12px] text-sy-text-2 mb-1 block">
            Embedding 模型
          </label>
          <input
            id="vec-model"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md bg-sy-bg-2 border border-sy-border text-[12.5px] text-sy-text focus:border-sy-accent/50 outline-none"
            placeholder="e.g. text-embedding-v3"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="vec-dims" className="text-[12px] text-sy-text-2 mb-1 block">
              维度
              {dimensionsChanged && (
                <span className="ml-1.5 text-sy-warn text-[10px]">（已修改，保存时需重建）</span>
              )}
            </label>
            <input
              id="vec-dims"
              type="number"
              value={dimensions}
              onChange={(e) => setDimensions(Number(e.target.value))}
              className={`w-full px-3 py-1.5 rounded-md bg-sy-bg-2 border text-[12.5px] text-sy-text font-mono outline-none transition-colors ${
                dimensionsChanged ? 'border-sy-warn/50' : 'border-sy-border'
              }`}
              min={128}
              max={4096}
              step={128}
            />
          </div>
          <div>
            <label htmlFor="vec-collection" className="text-[12px] text-sy-text-2 mb-1 block">
              Collection
            </label>
            <input
              id="vec-collection"
              type="text"
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md bg-sy-bg-2 border border-sy-border text-[12.5px] text-sy-text font-mono outline-none"
            />
          </div>
        </div>

        {rebuildMsg && <p className="text-[11.5px] text-sy-accent">{rebuildMsg}</p>}

        <div className="flex items-center justify-between pt-2">
          <ConnectionTestButton testUrl="/api/ai-config/test-embedding" label="测试向量连接" />
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => void handleSave()}
            disabled={saving || rebuilding}
          >
            {rebuilding ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saved ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {rebuilding ? '重建中...' : saved ? '已保存' : saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* 维度变更确认弹窗 */}
      {showRebuildConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-sy-bg-1 border border-sy-border rounded-xl p-6 w-[420px] shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-sy-warn mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[14px] font-semibold text-sy-text mb-1">确认重建向量索引</h3>
                <p className="text-[12.5px] text-sy-text-2 leading-relaxed">
                  向量维度从{' '}
                  <span className="font-mono text-sy-warn">{savedDimensions.current}</span> 改为{' '}
                  <span className="font-mono text-sy-warn">{dimensions}</span>
                  ，需要重建 Qdrant collection，所有已索引文档将重新向量化。
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setShowRebuildConfirm(false)}
              >
                <X className="w-3.5 h-3.5" />
                取消
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => void handleConfirmRebuild()}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                确认重建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
