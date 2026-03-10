'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { authApi, getApiErrorMessage } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await authApi.login({ username: username.trim(), password });
      login(
        result.access_token,
        {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role ?? 'user',
          full_name: result.user.full_name ?? null,
        },
        remember,
      );
      router.push('/');
    } catch (error) {
      setError(getApiErrorMessage(error, '登录失败，请检查用户名和密码'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-accent tracking-wide">Sisyphus</h1>
          <p className="text-text3 text-[13px] mt-2">AI 驱动的智能测试用例平台</p>
        </div>

        {/* Login Card */}
        <div className="card p-6">
          <h2 className="text-[15px] font-semibold text-text mb-5">登录</h2>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-md bg-red/8 border border-red/20 text-red text-[12.5px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-[12.5px] text-text2 mb-1.5 font-medium"
              >
                用户名
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="input w-full"
                autoComplete="username"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-[12.5px] text-text2 mb-1.5 font-medium"
              >
                密码
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="input w-full pr-10"
                  autoComplete="current-password"
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer" htmlFor="login-remember">
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border accent-accent"
                />
                <span className="text-[12px] text-text3">记住我</span>
              </label>
              <button
                type="button"
                className="text-[12px] text-accent hover:text-accent2 transition-colors"
              >
                忘记密码？
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-2.5 mt-1 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登 录'
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-[12px] text-text3">
            还没有账号？{' '}
            <Link href="/register" className="text-accent hover:text-accent2 transition-colors">
              立即注册
            </Link>
          </div>
        </div>

        <p className="text-center text-[11px] text-text3/50 mt-6">Sisyphus Case Platform · v0.2</p>
      </div>
    </div>
  );
}
