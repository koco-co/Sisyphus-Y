'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Modal, message, Popconfirm, Skeleton, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/* ── Page ── */

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => apiClient.get('/products'),
  });

  const createMutation = useMutation({
    mutationFn: (values: { name: string; slug: string; description?: string }) =>
      apiClient.post('/products', values),
    onSuccess: () => {
      message.success('子产品创建成功');
      setCreateOpen(false);
      createForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['products'] });
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
      slug?: string;
      description?: string;
    }) => apiClient.patch(`/products/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      setEditItem(null);
      editForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => message.error('更新失败，请重试'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/products/${id}`),
    onSuccess: () => {
      message.success('已删除');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => message.error('删除失败'),
  });

  const filtered = (products ?? []).filter(
    (p) =>
      !searchText ||
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchText.toLowerCase()),
  );

  const columns: ColumnsType<Product> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/iterations?productId=${record.id}`);
          }}
          className="btn btn-link"
          style={{ fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}
        >
          {name}
        </button>
      ),
    },
    {
      title: '标识',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => (
        <span className="mono" style={{ color: 'var(--text3)' }}>
          {slug}
        </span>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string | null) => desc || <span style={{ color: 'var(--text3)' }}>—</span>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (val: string) => {
        try {
          return <span className="mono">{new Date(val).toLocaleString('zh-CN')}</span>;
        } catch {
          return val;
        }
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
              editForm.setFieldsValue({
                name: record.name,
                slug: record.slug,
                description: record.description,
              });
            }}
            title="编辑"
          >
            <Pencil size={14} />
          </button>
          <Popconfirm
            title="确定删除此子产品？"
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
            <div className="page-watermark">SISYPHUS · 子产品管理</div>
            <h1>子产品管理</h1>
            <div className="sub">管理所有子产品，点击名称查看迭代</div>
          </div>
          <div className="spacer" />
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text3)',
              }}
            />
            <input
              className="input"
              placeholder="搜索子产品..."
              style={{ width: 220, paddingLeft: 32 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={14} /> 新建子产品
          </button>
        </div>

        {/* ── Table ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: 24 }}>
              <Skeleton active paragraph={{ rows: 6 }} title={false} />
            </div>
          ) : (
            <Table<Product>
              columns={columns}
              dataSource={filtered}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: false,
                showTotal: (total) => `共 ${total} 条`,
              }}
              locale={{ emptyText: '暂无子产品，点击右上角新建' }}
              onRow={(record) => ({
                style: { cursor: 'pointer' },
                onClick: () => router.push(`/iterations?productId=${record.id}`),
              })}
            />
          )}
        </div>
      </div>

      {/* ── Create modal ── */}
      <Modal
        title="新建子产品"
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
          onFinish={(v) => createMutation.mutate(v)}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：离线开发平台" />
          </Form.Item>
          <Form.Item name="slug" label="标识" rules={[{ required: true, message: '请输入标识' }]}>
            <Input placeholder="例如：offline-dev" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="项目简介（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Edit modal ── */}
      <Modal
        title="编辑子产品"
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
          onFinish={(v) => editItem && updateMutation.mutate({ id: editItem.id, ...v })}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="标识" rules={[{ required: true, message: '请输入标识' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
