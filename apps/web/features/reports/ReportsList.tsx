'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { REPORT_STATUS_LABEL } from '@/lib/labels';
import type { Report } from '@workreport/shared-types';

export function ReportsList() {
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiFetch<Report[]>('/reports'),
  });

  const draft = useMutation({
    mutationFn: (id: string) => apiFetch(`/reports/${id}/ai-draft`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  const approve = useMutation({
    mutationFn: (id: string) => apiFetch(`/reports/${id}/approve`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  const generate = useMutation({
    mutationFn: (id: string) => apiFetch(`/reports/${id}/generate`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand">보고서 검토</h1>
      <p className="text-sm text-gray-500">
        AI 초안 확인 → 승인 → 회사 양식 PDF 생성까지의 흐름입니다 (설계서 4.1 관리자 화면 원칙).
      </p>
      {isLoading && <p className="text-sm text-gray-500">불러오는 중...</p>}
      {[draft, approve, generate].map((m, i) =>
        m.error ? (
          <p key={i} className="text-sm text-red-600">
            {(m.error as Error).message}
          </p>
        ) : null,
      )}
      <table className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
        <thead className="bg-gray-100 text-left text-gray-600">
          <tr>
            <th className="px-4 py-2">템플릿</th>
            <th className="px-4 py-2">상태</th>
            <th className="px-4 py-2">PDF</th>
            <th className="px-4 py-2 text-right">액션</th>
          </tr>
        </thead>
        <tbody>
          {reports?.map((report) => (
            <tr key={report.id} className="border-t border-gray-100">
              <td className="px-4 py-2 font-medium">
                <Link href={`/reports/${report.id}`} className="text-brand hover:underline">
                  {report.template?.name ?? '-'}
                </Link>
              </td>
              <td className="px-4 py-2 text-gray-600">{REPORT_STATUS_LABEL[report.status]}</td>
              <td className="px-4 py-2">
                {report.pdfUrl ? (
                  <a href={report.pdfUrl} target="_blank" className="text-brand underline">
                    다운로드
                  </a>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="space-x-2 px-4 py-2 text-right">
                <button
                  onClick={() => draft.mutate(report.id)}
                  disabled={draft.isPending}
                  className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  AI 초안
                </button>
                <button
                  onClick={() => approve.mutate(report.id)}
                  disabled={approve.isPending}
                  className="rounded border border-brand px-3 py-1 text-xs font-medium text-brand hover:bg-brand hover:text-white disabled:opacity-50"
                >
                  승인
                </button>
                <button
                  onClick={() => generate.mutate(report.id)}
                  disabled={generate.isPending}
                  className="rounded bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-brand-light disabled:opacity-50"
                >
                  PDF 생성
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
