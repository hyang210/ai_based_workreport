'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, openFile } from '@/lib/api-client';
import { fieldLabel, REPORT_STATUS_LABEL } from '@/lib/labels';
import type { Attachment, MissingFieldsResult, Report } from '@workreport/shared-types';

// 서버 규칙과 동일 (reports.service.ts): 이 상태에서만 수정·승인할 수 있다.
const EDITABLE = ['DRAFT', 'AI_GENERATED', 'REVIEW'];
const APPROVABLE = ['AI_GENERATED', 'REVIEW'];

const PHOTO_TYPE: Record<string, string> = {
  before_photos: 'PHOTO_BEFORE',
  after_photos: 'PHOTO_AFTER',
  photos: 'PHOTO_GENERAL',
};

function photoCount(fieldKey: string, attachments: Attachment[]) {
  const type = PHOTO_TYPE[fieldKey];
  return attachments.filter((a) => (type ? a.type === type : a.type.startsWith('PHOTO'))).length;
}

export function ReportDetail({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', id],
    queryFn: () => apiFetch<Report>(`/reports/${id}`),
  });
  const { data: missing } = useQuery({
    queryKey: ['report-missing', id],
    queryFn: () => apiFetch<MissingFieldsResult>(`/reports/${id}/missing-fields`),
  });

  // 서버의 저장된 내용을 편집 상태로 불러온다 (AI 초안 생성·저장 뒤에 갱신됨).
  useEffect(() => {
    if (!report) return;
    setDraft(Object.fromEntries(Object.entries(report.content ?? {}).map(([k, v]) => [k, v ?? ''])));
    setDirty(false);
  }, [report]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['report', id] });
    queryClient.invalidateQueries({ queryKey: ['report-missing', id] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  };

  const fields = [...(report?.template?.templateFields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const textKeys = fields.filter((f) => f.fieldType !== 'photo').map((f) => f.fieldKey);
  const content = () => Object.fromEntries(textKeys.map((k) => [k, draft[k] ?? '']));
  const save = () => apiFetch(`/reports/${id}/content`, { method: 'PATCH', body: JSON.stringify({ content: content() }) });

  const aiDraft = useMutation({ mutationFn: () => apiFetch(`/reports/${id}/ai-draft`, { method: 'POST' }), onSuccess: refresh });
  const saveMutation = useMutation({ mutationFn: save, onSuccess: refresh });
  // 승인 직전에 수정 중인 내용이 있으면 먼저 저장해서, 서버가 최신 내용으로 누락을 검사하게 한다.
  const approve = useMutation({
    mutationFn: async () => {
      if (dirty) await save();
      return apiFetch(`/reports/${id}/approve`, { method: 'POST' });
    },
    onSettled: refresh,
  });
  const generate = useMutation({ mutationFn: () => apiFetch(`/reports/${id}/generate`, { method: 'POST' }), onSuccess: refresh });
  const workOrderId = report?.workOrderId;
  const remove = useMutation({
    mutationFn: () => apiFetch(`/reports/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['report', id] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
      router.push(`/work-orders/${workOrderId}`);
    },
  });

  if (isLoading) return <p className="text-sm text-gray-500">불러오는 중...</p>;
  if (error || !report) return <p className="text-sm text-red-600">{(error as Error)?.message ?? '보고서를 찾을 수 없습니다.'}</p>;

  const editable = EDITABLE.includes(report.status);
  const attachments = report.workOrder?.attachments ?? [];
  const missingKeys = new Set(missing?.missing ?? []);
  const actionError = [aiDraft, saveMutation, approve, generate, remove].find((m) => m.error)?.error as Error | undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/work-orders/${report.workOrderId}`} className="text-sm text-gray-500 hover:underline">
          ← 작업으로 돌아가기
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-bold text-brand">{report.template?.name}</h1>
          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{REPORT_STATUS_LABEL[report.status]}</span>
        </div>
        <p className="text-sm text-gray-500">
          {report.workOrder?.site?.name} · v{report.version}
        </p>
      </div>

      {missing && (
        <div className={`rounded-lg border p-3 text-sm ${missing.isComplete ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          {missing.isComplete
            ? '필수 항목이 모두 채워졌습니다. 승인할 수 있어요.'
            : `누락된 필수 항목: ${missing.missing.map(fieldLabel).join(', ')} (저장된 내용 기준)`}
        </div>
      )}

      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        {fields.map((f) => {
          const isMissing = missingKeys.has(f.fieldKey);
          const mark = f.required ? <span className="text-red-500"> *</span> : null;
          if (f.fieldType === 'photo') {
            const count = photoCount(f.fieldKey, attachments);
            return (
              <div key={f.fieldKey}>
                <p className="text-sm font-medium text-gray-700">
                  {fieldLabel(f.fieldKey)}
                  {mark}
                </p>
                <p className={`text-sm ${isMissing ? 'text-red-600' : 'text-gray-600'}`}>
                  {count > 0 ? `${count}장 첨부됨` : '첨부된 사진이 없습니다'} ·{' '}
                  <Link href={`/work-orders/${report.workOrderId}`} className="text-brand hover:underline">
                    작업에서 첨부
                  </Link>
                </p>
              </div>
            );
          }
          return (
            <div key={f.fieldKey}>
              <label className="text-sm font-medium text-gray-700">
                {fieldLabel(f.fieldKey)}
                {mark}
              </label>
              <textarea
                className={`mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-50 ${isMissing ? 'border-red-300' : 'border-gray-300'}`}
                rows={2}
                disabled={!editable}
                value={draft[f.fieldKey] ?? ''}
                onChange={(e) => {
                  setDraft({ ...draft, [f.fieldKey]: e.target.value });
                  setDirty(true);
                }}
              />
            </div>
          );
        })}
      </section>

      {actionError && <p className="text-sm text-red-600">{actionError.message}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => aiDraft.mutate()}
          disabled={!editable || aiDraft.isPending}
          className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          {aiDraft.isPending ? '생성 중...' : 'AI 초안 생성'}
        </button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!editable || !dirty || saveMutation.isPending}
          className="rounded border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand hover:text-white disabled:opacity-50"
        >
          저장
        </button>
        <button
          onClick={() => approve.mutate()}
          disabled={!APPROVABLE.includes(report.status) || approve.isPending}
          className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-50"
        >
          승인
        </button>
        <button
          onClick={() => generate.mutate()}
          disabled={!['APPROVED', 'GENERATED'].includes(report.status) || generate.isPending}
          className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-50"
        >
          PDF 생성
        </button>
        {editable && (
          <button
            onClick={() => window.confirm('이 보고서를 삭제할까요? 되돌릴 수 없습니다.') && remove.mutate()}
            disabled={remove.isPending}
            className="ml-auto rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            보고서 삭제
          </button>
        )}
        {report.pdfUrl && (
          <button type="button" onClick={() => openFile(report.pdfUrl!).catch((e) => alert(e.message))} className="text-sm text-brand underline">
            PDF 열기
          </button>
        )}
      </div>
    </div>
  );
}
