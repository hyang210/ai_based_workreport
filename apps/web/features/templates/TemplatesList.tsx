'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { ReportTemplate } from '@workreport/shared-types';

export function TemplatesList() {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => apiFetch<ReportTemplate[]>('/templates'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand">템플릿 관리</h1>
      <p className="text-sm text-gray-500">
        회사별 보고서 필드/섹션/순서를 정의합니다. 템플릿은 DB에 JSON으로 저장되어 코드 배포 없이 회사마다 다른 양식을 지원합니다 (설계서 6.3).
      </p>
      {isLoading && <p className="text-sm text-gray-500">불러오는 중...</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {templates?.map((tpl) => (
          <div key={tpl.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{tpl.name}</h2>
              <span className="text-xs text-gray-400">v{tpl.version}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">{tpl.reportType}</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {tpl.sections?.sections?.map((section) => (
                <li key={section.title}>
                  <span className="font-medium">{section.title}</span> — {section.fields.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
