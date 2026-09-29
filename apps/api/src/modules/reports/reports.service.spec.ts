import { BadRequestException, ConflictException } from '@nestjs/common';
import { ReportsService } from './reports.service';

jest.mock('@prisma/client', () => ({ PrismaClient: class {} }));

const fields = [
  { fieldKey: 'issue', fieldType: 'text', required: true },
  { fieldKey: 'after_photos', fieldType: 'photo', required: true },
];
const report = (over: any = {}) => ({
  id: 'r1',
  status: 'AI_GENERATED',
  content: { issue: '나사 풀림', action: '조임', result: '정상' },
  workOrder: { id: 'wo-1', equipmentId: 'eq-1', attachments: [{ type: 'PHOTO_AFTER' }], workRecords: [] },
  template: { templateFields: fields },
  ...over,
});

function setup(r: any) {
  const prisma: any = {
    report: { update: jest.fn(async ({ data }: any) => ({ ...r, ...data })) },
    aiGeneration: { create: jest.fn() },
  };
  const equipment: any = { recordHistory: jest.fn(), buildContext: jest.fn(async () => '- 2026-08-12 베어링 교체') };
  const audit: any = { log: jest.fn() };
  const ai: any = { structure: jest.fn(async () => ({ model: 'm', output: { description: 'd', issue: null, action: null, result: null } })) };
  const service = new ReportsService(prisma, {} as any, {} as any, audit, ai, equipment);
  jest.spyOn(service, 'findOne').mockResolvedValue(r);
  return { service, prisma, equipment, audit, ai };
}

describe('ReportsService', () => {
  it('필수 항목이 비어 있으면 승인을 막고 누락 필드를 알려준다', async () => {
    const { service, prisma } = setup(report({ workOrder: { ...report().workOrder, attachments: [] } }));
    await expect(service.approve('c1', 'r1', 'u1')).rejects.toThrow(/after_photos/);
    expect(prisma.report.update).not.toHaveBeenCalled();
  });

  it('AI 초안 전(DRAFT)에는 승인할 수 없다', async () => {
    const { service } = setup(report({ status: 'DRAFT' }));
    await expect(service.approve('c1', 'r1', 'u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('누락이 없으면 승인하고, 작업 결과를 설비 이력으로 남기고, 감사 로그를 쓴다', async () => {
    const { service, equipment, audit } = setup(report());
    await service.approve('c1', 'r1', 'u1');
    expect(equipment.recordHistory).toHaveBeenCalledWith('eq-1', 'wo-1', '나사 풀림 → 조임 → 정상', expect.any(Date));
    expect(audit.log).toHaveBeenCalledWith('c1', 'u1', 'approve', 'report', 'r1');
  });

  it('AI 초안은 설비 이력 Context를 붙여 구조화하고 결과와 생성 이력을 저장한다', async () => {
    const r = report({ status: 'DRAFT', content: null, workOrder: { ...report().workOrder, workRecords: [{ description: '소음 점검' }] } });
    const { service, prisma, ai } = setup(r);
    await service.draftWithAi('c1', 'r1');
    expect(ai.structure).toHaveBeenCalledWith({ text: '소음 점검', equipmentContext: '- 2026-08-12 베어링 교체' });
    expect(prisma.aiGeneration.create).toHaveBeenCalled();
    expect(prisma.report.update.mock.calls[0][0].data.status).toBe('AI_GENERATED');
  });

  it('작업 기록이 없으면 초안을 만들지 않는다', async () => {
    const { service } = setup(report({ status: 'DRAFT' }));
    await expect(service.draftWithAi('c1', 'r1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('승인된 보고서는 내용을 수정할 수 없고, 템플릿에 없는 필드도 거부한다', async () => {
    await expect(setup(report({ status: 'APPROVED' })).service.updateContent('c1', 'r1', { issue: 'x' })).rejects.toBeInstanceOf(ConflictException);
    await expect(setup(report()).service.updateContent('c1', 'r1', { bogus: 'x' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('승인 전에는 PDF를 만들 수 없다', async () => {
    await expect(setup(report({ status: 'REVIEW' })).service.generatePdf('c1', 'r1')).rejects.toBeInstanceOf(ConflictException);
  });
});
