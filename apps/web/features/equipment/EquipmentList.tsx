'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Equipment, Site } from '@workreport/shared-types';

export function EquipmentList() {
  const { data: sites } = useQuery({ queryKey: ['sites'], queryFn: () => apiFetch<Site[]>('/sites') });
  const siteId = sites?.[0]?.id;

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', siteId],
    queryFn: () => apiFetch<Equipment[]>(`/equipment?siteId=${siteId}`),
    enabled: !!siteId,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand">설비 관리</h1>
      <p className="text-sm text-gray-500">
        첫 번째 현장({sites?.[0]?.name ?? '-'})의 설비 목록입니다. (baseline: 현장 선택 UI는 다음 단계에서 추가)
      </p>
      {isLoading && <p className="text-sm text-gray-500">불러오는 중...</p>}
      <table className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
        <thead className="bg-gray-100 text-left text-gray-600">
          <tr>
            <th className="px-4 py-2">유형</th>
            <th className="px-4 py-2">일련번호</th>
            <th className="px-4 py-2">QR 코드</th>
          </tr>
        </thead>
        <tbody>
          {equipment?.map((eq) => (
            <tr key={eq.id} className="border-t border-gray-100">
              <td className="px-4 py-2 font-medium">{eq.type}</td>
              <td className="px-4 py-2 text-gray-600">{eq.serialNumber ?? '-'}</td>
              <td className="px-4 py-2 text-gray-600">{eq.qrCode ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
