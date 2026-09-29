'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { ATTACHMENT_LABEL, REPORT_STATUS_LABEL } from '@/lib/labels';
import type { Report, ReportTemplate, WorkOrder } from '@workreport/shared-types';

export function WorkOrderDetail({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [photoType, setPhotoType] = useState('PHOTO_AFTER');
  const [photoUrl, setPhotoUrl] = useState('');
  const [templateChoice, setTemplateChoice] = useState('');

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => apiFetch<WorkOrder>(`/work-orders/${id}`),
  });
  const { data: templates } = useQuery({ queryKey: ['templates'], queryFn: () => apiFetch<ReportTemplate[]>('/templates') });
  const templateId = templateChoice || templates?.[0]?.id || '';

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['work-order', id] });

  const addRecord = useMutation({
    mutationFn: () => apiFetch(`/work-orders/${id}/records`, { method: 'POST', body: JSON.stringify({ description: text }) }),
    onSuccess: () => {
      setText('');
      refresh();
    },
  });

  // 파일 저장소(S3 호환)를 붙이기 전까지는 사진 URL을 직접 넣어 첨부 상태만 검증한다.
  const addAttachment = useMutation({
    mutationFn: () =>
      apiFetch(`/work-orders/${id}/attachments`, {
        method: 'POST',
        body: JSON.stringify({ type: photoType, fileUrl: photoUrl }),
      }),
    onSuccess: () => {
      setPhotoUrl('');
      refresh();
    },
  });

  const createReport = useMutation({
    mutationFn: () => apiFetch<Report>('/reports', { method: 'POST', body: JSON.stringify({ workOrderId: id, templateId }) }),
    onSuccess: (report) => router.push(`/reports/${report.id}`),
  });

  if (isLoading) return <p className="text-sm text-gray-500">불러오는 중...</p>;
  if (error || !order) return <p className="text-sm text-red-600">{(error as Error)?.message ?? '작업을 찾을 수 없습니다.'}</p>;

  const records = order.workRecords ?? [];
  const attachments = order.attachments ?? [];
  const reports = order.reports ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/work-orders" className="text-sm text-gray-500 hover:underline">
          ← 작업 목록
        </Link>
        <h1 className="mt-1 text-xl font-bold text-brand">
          {order.site?.name} · {order.equipment?.type ?? '설비 없음'}
        </h1>
      </div>

      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold">현장 기록</h2>
        <ul className="space-y-1 text-sm text-gray-700">
          {records.length === 0 && <li className="text-gray-400">아직 기록이 없습니다.</li>}
          {records.map((r) => (
            <li key={r.id}>· {[r.description, r.issue, r.action, r.result].filter(Boolean).join(' ')}</li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addRecord.mutate();
          }}
          className="flex gap-2"
        >
          <textarea
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
            rows={2}
            placeholder="예: 3층 냉방기 소음 점검. 팬 모터 고정 나사가 풀려 있어 조인 후 시험 운전함"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
          <button
            disabled={addRecord.isPending}
            className="self-start rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-50"
          >
            기록 추가
          </button>
        </form>
        {addRecord.error && <p className="text-sm text-red-600">{(addRecord.error as Error).message}</p>}
      </section>

      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold">사진 첨부</h2>
        <ul className="space-y-1 text-sm text-gray-700">
          {attachments.length === 0 && <li className="text-gray-400">첨부된 사진이 없습니다.</li>}
          {attachments.map((a) => (
            <li key={a.id}>
              · {ATTACHMENT_LABEL[a.type] ?? a.type} — <span className="text-gray-500">{a.fileUrl}</span>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addAttachment.mutate();
          }}
          className="flex flex-wrap gap-2"
        >
          <select className="rounded border border-gray-300 px-3 py-2 text-sm" value={photoType} onChange={(e) => setPhotoType(e.target.value)}>
            {Object.entries(ATTACHMENT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="사진 URL (파일 저장소 연결 전 임시 입력)"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            required
          />
          <button
            disabled={addAttachment.isPending}
            className="rounded border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-50"
          >
            첨부
          </button>
        </form>
        {addAttachment.error && <p className="text-sm text-red-600">{(addAttachment.error as Error).message}</p>}
      </section>

      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold">보고서</h2>
        <ul className="space-y-1 text-sm">
          {reports.length === 0 && <li className="text-gray-400">아직 보고서가 없습니다.</li>}
          {reports.map((r) => (
            <li key={r.id}>
              <Link href={`/reports/${r.id}`} className="text-brand hover:underline">
                {templates?.find((t) => t.id === r.templateId)?.name ?? '보고서'} — {REPORT_STATUS_LABEL[r.status]}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <select className="rounded border border-gray-300 px-3 py-2 text-sm" value={templateId} onChange={(e) => setTemplateChoice(e.target.value)}>
            {templates?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => createReport.mutate()}
            disabled={!templateId || createReport.isPending}
            className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-50"
          >
            보고서 만들기
          </button>
        </div>
        {createReport.error && <p className="text-sm text-red-600">{(createReport.error as Error).message}</p>}
      </section>
    </div>
  );
}
