'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { ApiError, authApi, getApiErrorMessage } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError('');
    setPasswordError('');
    let hasFieldError = false;
    if (!username.trim()) {
      setUsernameError('请输入用户名');
      hasFieldError = true;
    }
    if (!password.trim()) {
      setPasswordError('请输入密码');
      hasFieldError = true;
    }
    if (hasFieldError) return;
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
      if (error instanceof ApiError && error.status === 401) {
        setError('用户名或密码错误，请重试');
      } else {
        setError(getApiErrorMessage(error, '登录失败，请稍后重试'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-sy-accent tracking-wide">Sisyphus-Y</h1>
          <p className="text-text3 text-[13px] mt-2">AI 驱动的智能测试用例平台</p>
        </div>

        {/* Login Card */}
        <div className="card p-6">
          <h2 className="text-[15px] font-semibold text-text mb-5">登录</h2>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-md bg-sy-danger/8 border border-sy-danger/20 text-sy-danger text-[12.5px]">
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
                onChange={(e) => { setUsername(e.target.value); setUsernameError(''); }}
                placeholder="请输入用户名"
                className={`input w-full${usernameError ? ' border-sy-danger/60' : ''}`}
                autoComplete="username"
              />
              {usernameError && (
                <p className="mt-1 text-[11.5px] text-sy-danger">{usernameError}</p>
              )}
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
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  placeholder="请输入密码"
                  className={`input w-full pr-10${passwordError ? ' border-sy-danger/60' : ''}`}
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
              {passwordError && (
                <p className="mt-1 text-[11.5px] text-sy-danger">{passwordError}</p>
              )}
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
                className="text-[12px] text-sy-accent hover:text-sy-accent-2 transition-colors"
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
            <Link
              href="/register"
              className="text-sy-accent hover:text-sy-accent-2 transition-colors"
            >
              立即注册
            </Link>
          </div>
        </div>

        <p className="text-center text-[11px] text-text3/50 mt-6">Sisyphus-Y · v2.0</p>
      </div>
    </div>
  );
}
