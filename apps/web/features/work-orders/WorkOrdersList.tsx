'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { WorkOrder } from '@workreport/shared-types';

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
  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders'],
    queryFn: () => apiFetch<WorkOrder[]>('/work-orders'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand">작업 관리</h1>
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
              <td className="px-4 py-2 font-medium">{wo.site?.name ?? '-'}</td>
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
