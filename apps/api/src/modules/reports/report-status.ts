import type { ReportStatus } from '@prisma/client';

// 승인 이후의 보고서는 증빙 문서다. 이런 보고서가 걸린 작업·현장·템플릿은 내용이 바뀌거나 지워지면 안 된다 (설계서 3.4).
export const LOCKED_REPORT_STATUSES: ReportStatus[] = ['APPROVED', 'GENERATED', 'SENT'];

export function isLockedReport(status: string): boolean {
  return (LOCKED_REPORT_STATUSES as string[]).includes(status);
}
