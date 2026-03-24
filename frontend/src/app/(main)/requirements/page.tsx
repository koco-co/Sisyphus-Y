'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  ClipboardList,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  Target,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Iteration, Product, Requirement } from '@/types/api';
import { UploadRequirementDialog } from './_components/UploadRequirementDialog';

const statusMap: Record<string, { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'pill-gray' },
  reviewed: { label: '已评审', cls: 'pill-green' },
  diagnosed: { label: '已分析', cls: 'pill-blue' },
};

export default function RequirementsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedIterationId, setSelectedIterationId] = useState<string | null>(null);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient<Product[]>('/products'),
  });

  // Auto-select first product
  useEffect(() => {
    if (products?.length && !selectedProductId) setSelectedProductId(products[0].id);
  }, [products, selectedProductId]);

  const { data: iterations } = useQuery({
    queryKey: ['iterations', selectedProductId],
    queryFn: () => apiClient<Iteration[]>(`/products/${selectedProductId}/iterations`),
    enabled: !!selectedProductId,
  });

  // Auto-select first iteration
  useEffect(() => {
    if (iterations?.length && !selectedIterationId) setSelectedIterationId(iterations[0].id);
  }, [iterations, selectedIterationId]);

  const {
    data: requirements,
    isLoading: reqLoading,
    error: reqError,
  } = useQuery({
    queryKey: ['requirements', selectedProductId, selectedIterationId],
    queryFn: () =>
      apiClient<Requirement[]>(
        `/products/${selectedProductId}/iterations/${selectedIterationId}/requirements`,
      ),
    enabled: !!selectedProductId && !!selectedIterationId,
  });

  const displayReqs = requirements ?? [];
  const isEmpty = !selectedProductId || (!reqLoading && displayReqs.length === 0 && !reqError);

  return (
    <>
      <UploadRequirementDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        productId={selectedProductId ?? undefined}
        iterationId={selectedIterationId ?? undefined}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['requirements'] })}
      />

      <div className="sidebar-panel">
        <div className="sb-section">
          <div className="sb-label">子产品</div>
          {productsLoading ? (
            <div className="sb-item">
              <Loader2 size={14} /> 加载中...
            </div>
          ) : products?.length ? (
            products.map((p) => (
              <button
                type="button"
                key={p.id}
                className={`sb-item${selectedProductId === p.id ? ' active' : ''}`}
                onClick={() => {
                  setSelectedProductId(p.id);
                  setSelectedIterationId(null);
                }}
                style={{ cursor: 'pointer' }}
              >
                <Zap size={14} />
                {p.name}
              </button>
            ))
          ) : (
            <>
              <div className="sb-item active">
                <Zap size={14} />
                离线开发平台<span className="sb-count">25</span>
              </div>
              <div className="sb-item">
                <FolderOpen size={14} />
                数据资产管理<span className="sb-count">12</span>
              </div>
            </>
          )}
        </div>
        <hr className="divider" style={{ margin: '4px 0' }} />
        <div className="sb-section">
          <div className="sb-label">迭代</div>
          {iterations?.length ? (
            iterations.map((it) => (
              <button
                type="button"
                key={it.id}
                className={`sb-item${selectedIterationId === it.id ? ' active' : ''}`}
                onClick={() => setSelectedIterationId(it.id)}
                style={{ cursor: 'pointer' }}
              >
                <Calendar size={14} />
                {it.name}
                <span className="sb-count">{it.status}</span>
              </button>
            ))
          ) : (
            <div className="sb-item">
              <Calendar size={14} />
              暂无迭代
            </div>
          )}
        </div>
        <hr className="divider" style={{ margin: '4px 0' }} />
        <div className="sb-section">
          <div className="sb-label">需求列表</div>
          {displayReqs.map((r) => (
            <button
              type="button"
              key={r.id}
              className="sb-item"
              style={{ cursor: 'pointer' }}
              onClick={() => router.push(`/workbench?reqId=${r.id}`)}
            >
              <span
                className="sb-dot"
                style={{
                  background:
                    r.status === 'reviewed'
                      ? '#00d9a3'
                      : r.status === 'diagnosed'
                        ? '#3b82f6'
                        : '#566577',
                }}
              />
              <span style={{ flex: 1, fontSize: 12 }}>{r.title}</span>
              <span className="sb-count">{r.req_id}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="main-with-sidebar">
        <div className="topbar">
          <div>
            <div className="page-watermark">
              {products?.[0]?.name ?? '子产品'} ·{' '}
              {iterations?.find((i) => i.id === selectedIterationId)?.name ?? '迭代'}
            </div>
            <h1>需求卡片</h1>
            <div className="sub">{displayReqs.length} 条需求 · 选择需求查看详情</div>
          </div>
          <div className="spacer" />
          <button type="button" className="btn btn-primary" onClick={() => setDialogOpen(true)}>
            <Plus size={14} /> 新建需求
          </button>
        </div>

        {reqLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Loader2 size={24} className="spin" />
          </div>
        ) : reqError ? (
          <div className="card" style={{ color: '#f43f5e', padding: 24 }}>
            加载需求失败: {String(reqError)}
          </div>
        ) : isEmpty ? (
          <div
            className="card"
            style={{
              minHeight: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#566577',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <FileText size={36} style={{ margin: '0 auto 8px' }} />
              <div>暂无需求</div>
              <div style={{ fontSize: 11.5, marginTop: 4 }}>点击「新建需求」按钮开始录入</div>
            </div>
          </div>
        ) : (
          <div className="grid-3">
            {displayReqs.map((r) => {
              const _isReal = 'id' in r && 'req_id' in r;
              const reqId = (r as Requirement).req_id;
              const title = r.title;
              const st = r.status;
              const statusInfo = statusMap[st] ?? {
                label: st,
                cls: 'pill-gray',
              };
              const cardKey = (r as Requirement).id;
              const handleOpen = () => {
                router.push(`/workbench?reqId=${(r as Requirement).id}`);
              };

              return (
                <button
                  type="button"
                  key={cardKey}
                  className="card card-hover"
                  style={{ cursor: 'pointer' }}
                  onClick={handleOpen}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <span className="mono" style={{ fontSize: 11, color: '#00d9a3' }}>
                      {reqId}
                    </span>
                    <span className={`pill ${statusInfo.cls}`}>{statusInfo.label}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>{title}</div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      fontSize: 11.5,
                      color: '#566577',
                    }}
                  >
                    <span>
                      <Target size={12} /> 测试点
                    </span>
                    <span>
                      <ClipboardList size={12} /> 用例
                    </span>
                  </div>
                  <div className="progress-bar" style={{ marginTop: 10, height: 3 }}>
                    <div className="progress-fill" style={{ width: '0%' }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 32 }}>
          <div className="sec-header">
            <span className="sec-title">需求详情预览</span>
            <span style={{ fontSize: 11.5, color: '#566577' }}>选择需求查看完整内容</span>
          </div>
          <div
            className="card"
            style={{
              minHeight: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#566577',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>
                <FileText size={36} />
              </div>
              <div>点击需求卡片进入工作台</div>
              <div style={{ fontSize: 11.5, marginTop: 4 }}>
                支持富文本编辑、前置条件标注、验收标准管理
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
