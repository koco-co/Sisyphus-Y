'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { authApi, getApiErrorMessage } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthSession();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) {
      setError('请填写所有必填字段');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }
    if (form.password.length < 6) {
      setError('密码长度不能少于 6 位');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      const auth = await authApi.login({
        username: form.username.trim(),
        password: form.password,
      });
      login(auth.access_token, {
        id: auth.user.id,
        username: auth.user.username,
        email: auth.user.email,
        role: auth.user.role ?? 'user',
        full_name: auth.user.full_name ?? null,
      });
      router.push('/');
    } catch (error) {
      setError(getApiErrorMessage(error, '注册失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-sy-accent tracking-wide">Sisyphus</h1>
          <p className="text-text3 text-[13px] mt-2">AI 驱动的智能测试用例平台</p>
        </div>

        {/* Register Card */}
        <div className="card p-6">
          <h2 className="text-[15px] font-semibold text-text mb-5">注册</h2>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-md bg-sy-danger/8 border border-sy-danger/20 text-sy-danger text-[12.5px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="reg-username"
                className="block text-[12.5px] text-text2 mb-1.5 font-medium"
              >
                用户名
              </label>
              <input
                id="reg-username"
                type="text"
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
                placeholder="请输入用户名"
                className="input w-full"
                autoComplete="username"
              />
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-[12.5px] text-text2 mb-1.5 font-medium"
              >
                邮箱
              </label>
              <input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="请输入邮箱地址"
                className="input w-full"
                autoComplete="email"
              />
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="block text-[12.5px] text-text2 mb-1.5 font-medium"
              >
                密码
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="至少 6 位"
                  className="input w-full pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text3 hover:text-text2 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-confirm"
                className="block text-[12.5px] text-text2 mb-1.5 font-medium"
              >
                确认密码
              </label>
              <input
                id="reg-confirm"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                placeholder="再次输入密码"
                className="input w-full"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-2.5 mt-1 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  注册中...
                </>
              ) : (
                '注 册'
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-[12px] text-text3">
            已有账号？{' '}
            <Link href="/login" className="text-sy-accent hover:text-sy-accent-2 transition-colors">
              立即登录
            </Link>
          </div>
        </div>

        <p className="text-center text-[11px] text-text3/50 mt-6">Sisyphus Case Platform · v0.2</p>
      </div>
    </div>
  );
}
