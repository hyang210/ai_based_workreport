'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import type { Report, WorkOrder } from '@workreport/shared-types';

export function DashboardHome() {
  const { data: workOrders } = useQuery({ queryKey: ['work-orders'], queryFn: () => apiFetch<WorkOrder[]>('/work-orders') });
  const { data: reports } = useQuery({ queryKey: ['reports'], queryFn: () => apiFetch<Report[]>('/reports') });

  const openCount = workOrders?.filter((w) => w.status === 'OPEN' || w.status === 'IN_PROGRESS').length ?? 0;
  const needsReviewCount = reports?.filter((r) => r.status === 'AI_GENERATED' || r.status === 'REVIEW').length ?? 0;

  const cards = [
    { label: '진행중인 작업', value: openCount, href: '/work-orders' },
    { label: '검토 필요 보고서', value: needsReviewCount, href: '/reports' },
    { label: '전체 보고서', value: reports?.length ?? 0, href: '/reports' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-brand">대시보드</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-lg border border-gray-200 bg-white p-6 transition hover:border-brand hover:shadow-sm"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-brand">{card.value}</p>
          </Link>
        ))}
      </div>
      <p className="text-sm text-gray-400">
        설계서 4.1 "관리자 화면 원칙" 흐름: 대시보드 → 검토 필요 보고서 → AI 초안 확인 → 템플릿 관리 → PDF 생성/다운로드
      </p>
    </div>
  );
}
