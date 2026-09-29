import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/lib/query-provider';
import { NavBar } from '@/features/dashboard/NavBar';

export const metadata: Metadata = {
  title: 'WorkReport AI',
  description: 'Offline-first 현장 업무기록 및 보고서 자동화 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>
          <NavBar />
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
