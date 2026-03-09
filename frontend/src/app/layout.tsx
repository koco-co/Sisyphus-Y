import type { Metadata } from 'next';
import { AntdProvider } from '@/components/providers/AntdProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import './globals.css';

export const metadata: Metadata = { title: 'TestGen Pro' };

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <QueryProvider>
          <AntdProvider>{children}</AntdProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
