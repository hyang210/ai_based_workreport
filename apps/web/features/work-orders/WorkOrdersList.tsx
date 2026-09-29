'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Equipment, Site, WorkOrder } from '@workreport/shared-types';

const STATUS_LABEL: Record<string, string> = {
  OPEN: '대기',
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export function WorkOrdersList() {
  const router = useRouter();
  const [siteChoice, setSiteChoice] = useState('');
  const [equipmentId, setEquipmentId] = useState('');

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders'],
    queryFn: () => apiFetch<WorkOrder[]>('/work-orders'),
  });
  const { data: sites } = useQuery({ queryKey: ['sites'], queryFn: () => apiFetch<Site[]>('/sites') });
  const siteId = siteChoice || sites?.[0]?.id || '';
  const { data: equipment } = useQuery({
    queryKey: ['equipment', siteId],
    queryFn: () => apiFetch<Equipment[]>(`/equipment?siteId=${siteId}`),
    enabled: !!siteId,
  });

  // clientUuid는 모바일 앱이 오프라인에서 만드는 값과 같은 역할(멱등 키)이다.
  const create = useMutation({
    mutationFn: () =>
      apiFetch<WorkOrder>('/work-orders', {
        method: 'POST',
        body: JSON.stringify({ clientUuid: crypto.randomUUID(), siteId, ...(equipmentId ? { equipmentId } : {}) }),
      }),
    onSuccess: (wo) => router.push(`/work-orders/${wo.id}`),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand">작업 관리</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-4"
      >
        <select
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          value={siteId}
          onChange={(e) => {
            setSiteChoice(e.target.value);
            setEquipmentId('');
          }}
        >
          {sites?.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          value={equipmentId}
          onChange={(e) => setEquipmentId(e.target.value)}
        >
          <option value="">설비 선택 안 함</option>
          {equipment?.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.type} {eq.serialNumber ?? ''}
            </option>
          ))}
        </select>
        <button
          disabled={!siteId || create.isPending}
          className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-50"
        >
          작업 생성
        </button>
        {create.error && <span className="text-sm text-red-600">{(create.error as Error).message}</span>}
      </form>
      {isLoading && <p className="text-sm text-gray-500">불러오는 중...</p>}
      <table className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
        <thead className="bg-gray-100 text-left text-gray-600">
          <tr>
            <th className="px-4 py-2">현장</th>
            <th className="px-4 py-2">설비</th>
            <th className="px-4 py-2">상태</th>
            <th className="px-4 py-2">생성일</th>
          </tr>
        </thead>
        <tbody>
          {workOrders?.map((wo) => (
            <tr key={wo.id} className="border-t border-gray-100">
              <td className="px-4 py-2 font-medium">
                <Link href={`/work-orders/${wo.id}`} className="text-brand hover:underline">
                  {wo.site?.name ?? '-'}
                </Link>
              </td>
              <td className="px-4 py-2 text-gray-600">{wo.equipment?.type ?? '-'}</td>
              <td className="px-4 py-2">
                <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_COLOR[wo.status]}`}>
                  {STATUS_LABEL[wo.status]}
                </span>
              </td>
              <td className="px-4 py-2 text-gray-500">{new Date(wo.createdAt).toLocaleDateString('ko-KR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
