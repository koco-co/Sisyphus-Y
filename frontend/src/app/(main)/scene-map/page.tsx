'use client';

import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Loader2,
  Map as MapIcon,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { StreamCursor } from '@/components/workspace/StreamCursor';
import { useRequirementTree } from '@/hooks/useRequirementTree';
import { useSceneMap } from '@/hooks/useSceneMap';
import type { Requirement } from '@/lib/api';
import { ConfirmAllButton } from './_components/ConfirmAllButton';
import { GranularityBanner } from './_components/GranularityBanner';
import { PendingAlerts } from './_components/PendingAlerts';
import { ProcessBar } from './_components/ProcessBar';
import { SceneMapView } from './_components/SceneMapView';
import { TestPointDetail } from './_components/TestPointDetail';
import { TestPointList } from './_components/TestPointList';

export default function SceneMapPage() {
  const tree = useRequirementTree();
  const sm = useSceneMap();

  const handleSelectReq = async (req: Requirement) => {
    tree.selectRequirement(req);
    await sm.selectRequirement(req.id, req.title || req.req_id || '');
  };

  const selectedPoint = sm.testPoints.find((p) => p.id === sm.selectedPointId) ?? null;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 49px)' }}>
      {/* Process Bar */}
      <ProcessBar currentStep={sm.currentStep} />

      {/* Three Column Layout */}
      <div
        className="flex-1 grid overflow-hidden min-h-0"
        style={{ gridTemplateColumns: '280px 1fr 380px' }}
      >
        {/* ── Left Column ── */}
        <div className="border-r border-sy-border bg-sy-bg-1 flex flex-col overflow-hidden">
          {/* Requirement tree */}
          <div className="col-header">
            <MapIcon size={14} className="text-sy-accent" />
            <span>需求导航</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 min-h-0">
            {tree.products.map((product) => (
              <div key={product.id}>
                <button
                  type="button"
                  onClick={() => tree.toggleProduct(product.id)}
                  aria-expanded={tree.expandedProducts.has(product.id)}
                  className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-md text-[13px] text-sy-text hover:bg-sy-bg-2 transition-colors cursor-pointer"
                >
                  {tree.expandedProducts.has(product.id) ? (
                    <ChevronDown size={14} className="text-sy-text-3" />
                  ) : (
                    <ChevronRight size={14} className="text-sy-text-3" />
                  )}
                  <FolderOpen size={14} className="text-sy-accent" />
                  <span className="truncate">{product.name}</span>
                </button>

                {tree.expandedProducts.has(product.id) &&
                  (tree.iterations[product.id] || []).map((iter) => (
                    <div key={iter.id} className="ml-5">
                      <button
                        type="button"
                        onClick={() => tree.toggleIteration(product.id, iter.id)}
                        aria-expanded={tree.expandedIterations.has(iter.id)}
                        className="flex items-center gap-1.5 w-full px-2.5 py-1 rounded-md text-[12px] text-sy-text-2 hover:bg-sy-bg-2 transition-colors cursor-pointer"
                      >
                        {tree.expandedIterations.has(iter.id) ? (
                          <ChevronDown size={12} className="text-sy-text-3" />
                        ) : (
                          <ChevronRight size={12} className="text-sy-text-3" />
                        )}
                        <RefreshCw size={12} className="text-sy-text-3" />
                        <span className="truncate">{iter.name}</span>
                      </button>

                      {tree.expandedIterations.has(iter.id) &&
                        (tree.requirements[iter.id] || []).map((req) => (
                          <button
                            type="button"
                            key={req.id}
                            onClick={() => handleSelectReq(req)}
                            className={`flex items-center gap-1.5 w-full ml-5 px-2.5 py-1 rounded-md text-[12px] transition-colors cursor-pointer ${
                              sm.selectedReqId === req.id
                                ? 'bg-sy-accent/10 text-sy-accent border border-sy-accent/20'
                                : 'text-sy-text-2 hover:bg-sy-bg-2 border border-transparent'
                            }`}
                          >
                            <FileText size={12} />
                            <span className="truncate">{req.title || req.req_id}</span>
                          </button>
                        ))}
                    </div>
                  ))}
              </div>
            ))}
          </div>

          {/* Test Point List (shown when requirement is selected) */}
          {sm.selectedReqId && (
            <div className="border-t border-sy-border flex-1 min-h-0 overflow-hidden flex flex-col">
              <TestPointList
                testPoints={sm.testPoints}
                selectedPointId={sm.selectedPointId}
                checkedPointIds={sm.checkedPointIds}
                searchQuery={sm.searchQuery}
                isLocked={sm.isLocked}
                stats={sm.stats}
                onSelectPoint={(id) => sm.selectPoint(id)}
                onToggleCheck={(id) => sm.toggleCheckPoint(id)}
                onSearchChange={(q) => sm.setSearchQuery(q)}
                onAddPoint={sm.addPoint}
              />
            </div>
          )}
        </div>

        {/* ── Center Column ── */}
        <div className="bg-sy-bg flex flex-col overflow-hidden">
          {sm.selectedReqId ? (
            <>
              {/* AI Generate button */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-sy-border bg-sy-bg-1">
                <button
                  type="button"
                  onClick={sm.generateTestPoints}
                  disabled={sm.sse.isStreaming || sm.isLocked}
                  aria-busy={sm.sse.isStreaming}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12.5px] font-semibold bg-sy-accent text-black disabled:opacity-50 hover:bg-sy-accent-2 transition-colors"
                >
                  {sm.sse.isStreaming ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {sm.sse.isStreaming ? '生成中...' : 'AI 生成测试点'}
                </button>

                {sm.selectedReqTitle && (
                  <span className="text-[12px] text-sy-text-3 truncate">{sm.selectedReqTitle}</span>
                )}
              </div>

              {/* Granularity Banner */}
              <GranularityBanner warnings={sm.granularityWarnings} />

              {/* Pending Alerts */}
              <PendingAlerts
                testPoints={sm.testPoints}
                isLocked={sm.isLocked}
                onConfirm={sm.confirmPoint}
                onIgnore={sm.ignorePoint}
                onSelect={(id) => sm.selectPoint(id)}
              />

              {/* Stream output */}
              {sm.sse.content && (
                <div className="mx-4 mt-3 p-3 rounded-lg bg-sy-bg-2 border border-sy-border text-[12.5px] text-sy-text leading-relaxed">
                  <div className="flex items-center gap-2 mb-2 text-[11px] text-sy-text-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-sy-accent animate-pulse" />
                    <span>AI 正在生成测试点...</span>
                  </div>
                  <div className="font-mono text-[11.5px] text-sy-text-2 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {sm.sse.content
                      .replace(/```json\n?/g, '')
                      .replace(/```\s*$/g, '')
                      .trim()
                      .split('\n')
                      .filter((line) => {
                        const trimmed = line.trim();
                        const keyMatch = trimmed.match(/"title":\s*"([^"]+)"/);
                        return keyMatch !== null;
                      })
                      .map((line, i) => {
                        const m = line.match(/"title":\s*"([^"]+)"/);
                        return m ? (
                          <div key={`tp-${i}`} className="flex items-center gap-1.5 py-0.5">
                            <span className="w-1 h-1 rounded-full bg-sy-accent/60 flex-shrink-0" />
                            <span>{m[1]}</span>
                          </div>
                        ) : null;
                      })}
                    {sm.sse.isStreaming && <StreamCursor />}
                  </div>
                </div>
              )}

              {sm.sse.error && (
                <div className="mx-4 mt-3 p-3 rounded-lg bg-sy-danger/8 border border-sy-danger/25 text-[12.5px] text-sy-danger">
                  生成失败: {sm.sse.error}
                </div>
              )}

              {/* Detail panel */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {!sm.sse.content && sm.testPoints.length === 0 && !sm.sse.isStreaming ? (
                  <div className="flex flex-col items-center justify-center h-full text-sy-text-3">
                    <Sparkles size={48} className="opacity-20 mb-4" />
                    <p className="text-[14px]">点击「AI 生成测试点」开始分析</p>
                    <p className="text-[12px] opacity-60 mt-1">
                      AI 将解析需求文档，提取测试场景与测试点
                    </p>
                  </div>
                ) : (
                  <TestPointDetail
                    point={selectedPoint}
                    isLocked={sm.isLocked}
                    onUpdate={sm.updatePoint}
                    onConfirm={sm.confirmPoint}
                    onDelete={sm.deletePoint}
                  />
                )}
              </div>

              {/* Confirm All Button */}
              <ConfirmAllButton
                total={sm.stats.total}
                confirmed={sm.stats.confirmed}
                unhandledMissing={sm.stats.unhandledMissing}
                isLocked={sm.isLocked}
                onConfirmAll={sm.confirmAll}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-sy-text-3">
              <MapIcon size={64} className="opacity-15 mb-4" />
              <p className="text-[16px] font-medium">请从左侧选择一个需求</p>
              <p className="text-[13px] opacity-60 mt-1">查看或生成测试场景地图</p>
            </div>
          )}
        </div>

        {/* ── Right Column ── */}
        <div className="border-l border-sy-border bg-sy-bg-1 overflow-hidden">
          <SceneMapView
            testPoints={sm.testPoints}
            selectedPointId={sm.selectedPointId}
            onSelectPoint={(id) => sm.selectPoint(id)}
            requirementId={sm.selectedReqId}
            stats={sm.stats}
          />
        </div>
      </div>
    </div>
  );
}
