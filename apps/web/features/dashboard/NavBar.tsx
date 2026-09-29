'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clearToken, getUserEmail } from '@/lib/api-client';

const links = [
  { href: '/', label: '대시보드' },
  { href: '/sites', label: '현장' },
  { href: '/equipment', label: '설비' },
  { href: '/work-orders', label: '작업' },
  { href: '/templates', label: '템플릿' },
  { href: '/reports', label: '보고서' },
];

export function NavBar() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  // 화면을 이동할 때마다(로그인 직후 포함) 저장된 토큰에서 로그인 상태를 다시 읽는다.
  useEffect(() => setEmail(getUserEmail()), [pathname]);

  function logout() {
    clearToken();
    // 전체 새로고침으로 이동해 이전 사용자의 캐시된 데이터(TanStack Query)도 함께 비운다.
    window.location.assign('/');
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
        <span className="text-lg font-bold text-brand">WorkReport AI</span>
        <nav className="flex gap-4 text-sm text-gray-600">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {email ? (
            <>
              <span className="text-gray-500">{email}</span>
              <button onClick={logout} className="rounded border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-100">
                로그아웃
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded border border-brand px-3 py-1 text-brand hover:bg-brand hover:text-white">
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
