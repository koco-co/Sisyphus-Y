'use client';

import { CheckCircle, Loader2, Plug, XCircle } from 'lucide-react';
import { useState } from 'react';

interface ConnectionTestButtonProps {
  testUrl: string;
  label?: string;
  className?: string;
  maxRetries?: number;
  retryDelay?: number;
}

type TestStatus = 'idle' | 'testing' | 'retrying' | 'ok' | 'error';

export function ConnectionTestButton({
  testUrl,
  label = '测试连接',
  className = '',
  maxRetries = 1,
  retryDelay = 1000,
}: ConnectionTestButtonProps) {
  const [status, setStatus] = useState<TestStatus>('idle');
  const [message, setMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const executeTest = async (): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(testUrl, { method: 'POST' });
    const data = await res.json();

    if (data.status === 'ok') {
      return { success: true, message: data.response_preview || '连接成功' };
    }
    return { success: false, message: data.error || '连接失败' };
  };

  const handleTest = async () => {
    setStatus('testing');
    setMessage('');
    setRetryCount(0);

    let lastError = '未知错误';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        setStatus('retrying');
        setRetryCount(attempt);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }

      try {
        const result = await executeTest();
        if (result.success) {
          setStatus('ok');
          setMessage(result.message);
          setTimeout(() => {
            setStatus('idle');
            setMessage('');
            setRetryCount(0);
          }, 5000);
          return;
        }
        lastError = result.message;
      } catch (e) {
        lastError = e instanceof Error ? e.message : '网络错误';
      }
    }

    setStatus('error');
    setMessage(lastError);
    setTimeout(() => {
      setStatus('idle');
      setMessage('');
      setRetryCount(0);
    }, 5000);
  };

  const iconMap = {
    idle: <Plug className="w-3.5 h-3.5" />,
    testing: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    retrying: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    ok: <CheckCircle className="w-3.5 h-3.5 text-sy-accent" />,
    error: <XCircle className="w-3.5 h-3.5 text-sy-danger" />,
  };

  const labelMap = {
    idle: label,
    testing: '测试中...',
    retrying: `重试中 (${retryCount}/${maxRetries})...`,
    ok: '连接成功',
    error: '连接失败',
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        className="btn btn-sm btn-outline flex items-center gap-1.5"
        onClick={() => void handleTest()}
        disabled={status === 'testing' || status === 'retrying'}
      >
        {iconMap[status]}
        <span className="text-[12px]">{labelMap[status]}</span>
      </button>
      {message && (
        <p
          className={`text-[11px] truncate max-w-[240px] ${status === 'ok' ? 'text-sy-accent' : 'text-sy-danger'}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
