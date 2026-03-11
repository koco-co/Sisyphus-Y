'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DatePicker, Empty, Form, Input, Modal, message, Popconfirm, Skeleton, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowLeft, Calendar, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

/* ── Inline API client ── */

const apiClient = {
  async get<T>(url: string): Promise<T> {
    const res = await fetch(`http://localhost:8000/api${url}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },
  async post<T>(url: string, data?: unknown): Promise<T> {
    const res = await fetch(`http://localhost:8000/api${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },
  async patch<T>(url: string, data?: unknown): Promise<T> {
    const res = await fetch(`http://localhost:8000/api${url}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },
  async delete(url: string): Promise<void> {
    const res = await fetch(`http://localhost:8000/api${url}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
  },
};

/* ── Types ── */

interface Iteration {
  id: string;
  product_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  planning: { label: '规划中', cls: 'pill-gray' },
  active: { label: '进行中', cls: 'pill-green' },
  completed: { label: '已完成', cls: 'pill-blue' },
  archived: { label: '已归档', cls: 'pill-amber' },
};

/* ── Page ── */

function IterationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Iteration | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data: product } = useQuery<Product | null>({
    queryKey: ['product', productId],
    queryFn: () =>
      apiClient
        .get(`/products`)
        .then((list: unknown) => (list as Product[]).find((p) => p.id === productId) ?? null),
    enabled: !!productId,
  });

  const { data: iterations, isLoading } = useQuery<Iteration[]>({
    queryKey: ['iterations', productId],
    queryFn: () => apiClient.get(`/products/${productId}/iterations`),
    enabled: !!productId,
  });

  const createMutation = useMutation({
    mutationFn: (values: { name: string; product_id: string; start_date?: string; end_date?: string }) =>
      apiClient.post(`/products/${productId}/iterations`, values),
    onSuccess: () => {
      message.success('迭代创建成功');
      setCreateOpen(false);
      createForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['iterations', productId] });
    },
    onError: () => message.error('创建失败，请重试'),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      start_date?: string;
      end_date?: string;
      status?: string;
    }) => apiClient.patch(`/products/iterations/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      setEditItem(null);
      editForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['iterations', productId] });
    },
    onError: () => message.error('更新失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/products/iterations/${id}`),
    onSuccess: () => {
      message.success('已删除');
      queryClient.invalidateQueries({ queryKey: ['iterations', productId] });
    },
    onError: () => message.error('删除失败'),
  });

  if (!productId) {
    return (
      <div className="no-sidebar">
        <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 80 }}>
          <Empty description="请先选择一个子产品">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push('/products')}
            >
              前往子产品管理
            </button>
          </Empty>
        </div>
      </div>
    );
  }

  const handleCreateFinish = (values: Record<string, unknown>) => {
    const payload: { name: string; product_id: string; start_date?: string; end_date?: string } = {
      name: values.name as string,
      product_id: productId!,
    };
    if (values.start_date)
      payload.start_date = (values.start_date as { format: (f: string) => string }).format(
        'YYYY-MM-DD',
      );
    if (values.end_date)
      payload.end_date = (values.end_date as { format: (f: string) => string }).format(
        'YYYY-MM-DD',
      );
    createMutation.mutate(payload);
  };

  const handleEditFinish = (values: Record<string, unknown>) => {
    if (!editItem) return;
    const payload: { id: string; name?: string; start_date?: string; end_date?: string } = {
      id: editItem.id,
      name: values.name as string,
    };
    if (values.start_date)
      payload.start_date = (values.start_date as { format: (f: string) => string }).format(
        'YYYY-MM-DD',
      );
    if (values.end_date)
      payload.end_date = (values.end_date as { format: (f: string) => string }).format(
        'YYYY-MM-DD',
      );
    updateMutation.mutate(payload);
  };

  const columns: ColumnsType<Iteration> = [
    {
      title: '迭代名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/requirements?iterationId=${record.id}`);
          }}
          className="btn btn-link"
          style={{ fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}
        >
          {name}
        </button>
      ),
    },
    {
      title: '开始日期',
      dataIndex: 'start_date',
      key: 'start_date',
      width: 140,
      render: (val: string | null) =>
        val ? (
          <span className="mono">{val}</span>
        ) : (
          <span style={{ color: 'var(--text3)' }}>—</span>
        ),
    },
    {
      title: '结束日期',
      dataIndex: 'end_date',
      key: 'end_date',
      width: 140,
      render: (val: string | null) =>
        val ? (
          <span className="mono">{val}</span>
        ) : (
          <span style={{ color: 'var(--text3)' }}>—</span>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const s = STATUS_MAP[status] ?? { label: status, cls: 'pill-gray' };
        return <span className={`pill ${s.cls}`}>{s.label}</span>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditItem(record);
              editForm.setFieldsValue({ name: record.name });
            }}
            title="编辑"
          >
            <Pencil size={14} />
          </button>
          <Popconfirm
            title="确定删除此迭代？"
            onConfirm={(e) => {
              e?.stopPropagation();
              deleteMutation.mutate(record.id);
            }}
            onCancel={(e) => e?.stopPropagation()}
            okText="删除"
            cancelText="取消"
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={(e) => e.stopPropagation()}
              title="删除"
            >
              <Trash2 size={14} style={{ color: 'var(--red)' }} />
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="no-sidebar">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* ── Top bar ── */}
        <div className="topbar">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => router.push('/products')}
                title="返回子产品列表"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="page-watermark">SISYPHUS · 迭代管理</div>
            </div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={20} />
              {product?.name ?? '子产品'} — 迭代列表
            </h1>
            <div className="sub">管理此子产品下的所有迭代，点击迭代名称查看需求</div>
          </div>
          <div className="spacer" />
          <button
            type="button"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={14} /> 新建迭代
          </button>
        </div>

        {/* ── Table ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: 24 }}>
              <Skeleton active paragraph={{ rows: 5 }} title={false} />
            </div>
          ) : (
            <Table<Iteration>
              columns={columns}
              dataSource={iterations ?? []}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: false,
                showTotal: (total) => `共 ${total} 条`,
              }}
              locale={{ emptyText: '暂无迭代，点击右上角新建' }}
              onRow={(record) => ({
                style: { cursor: 'pointer' },
                onClick: () => router.push(`/requirements?iterationId=${record.id}`),
              })}
            />
          )}
        </div>
      </div>

      {/* ── Create modal ── */}
      <Modal
        title="新建迭代"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateFinish}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="迭代名称"
            rules={[{ required: true, message: '请输入迭代名称' }]}
          >
            <Input placeholder="例如：Sprint 24-W05" />
          </Form.Item>
          <Form.Item name="start_date" label="开始日期">
            <DatePicker style={{ width: '100%' }} placeholder="选择开始日期" />
          </Form.Item>
          <Form.Item name="end_date" label="结束日期">
            <DatePicker style={{ width: '100%' }} placeholder="选择结束日期" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Edit modal ── */}
      <Modal
        title="编辑迭代"
        open={!!editItem}
        onCancel={() => {
          setEditItem(null);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditFinish}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="迭代名称"
            rules={[{ required: true, message: '请输入迭代名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="start_date" label="开始日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="end_date" label="结束日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default function IterationsPage() {
  return (
    <Suspense
      fallback={
        <div className="no-sidebar">
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="card">
              <Skeleton active paragraph={{ rows: 6 }} title={false} />
            </div>
          </div>
        </div>
      }
    >
      <IterationsContent />
    </Suspense>
  );
}
