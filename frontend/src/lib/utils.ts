import { ApiError } from './api';

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

/** Extract user-friendly error message from any error type. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.detail || `请求失败（${error.status}）`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '操作失败，请稍后重试';
}
