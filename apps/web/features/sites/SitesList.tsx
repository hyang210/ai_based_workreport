'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Site } from '@workreport/shared-types';

export function SitesList() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const { data: sites, isLoading, error } = useQuery({
    queryKey: ['sites'],
    queryFn: () => apiFetch<Site[]>('/sites'),
  });

  const createSite = useMutation({
    mutationFn: (payload: { name: string; address?: string }) =>
      apiFetch<Site>('/sites', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setName('');
      setAddress('');
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-brand">현장 관리</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createSite.mutate({ name, address });
        }}
        className="flex gap-2 rounded-lg border border-gray-200 bg-white p-4"
      >
        <input
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="현장명"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="주소"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light">
          현장 생성
        </button>
      </form>

      {isLoading && <p className="text-sm text-gray-500">불러오는 중...</p>}
      {error && <p className="text-sm text-red-600">{(error as Error).message}</p>}

      <table className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
        <thead className="bg-gray-100 text-left text-gray-600">
          <tr>
            <th className="px-4 py-2">현장명</th>
            <th className="px-4 py-2">주소</th>
            <th className="px-4 py-2">고객사</th>
          </tr>
        </thead>
        <tbody>
          {sites?.map((site) => (
            <tr key={site.id} className="border-t border-gray-100">
              <td className="px-4 py-2 font-medium">{site.name}</td>
              <td className="px-4 py-2 text-gray-600">{site.address ?? '-'}</td>
              <td className="px-4 py-2 text-gray-600">{site.customerName ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
