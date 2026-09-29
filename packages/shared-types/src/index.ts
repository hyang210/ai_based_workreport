// Prisma 스키마(apps/api/prisma/schema.prisma)의 도메인 모델을 프론트엔드에서
// 쓰기 위한 순수 타입 정의. @prisma/client에 의존하지 않도록 독립적으로 유지한다.

export type UserRole = 'ADMIN' | 'MANAGER' | 'WORKER';

export type WorkOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type ReportStatus = 'DRAFT' | 'AI_GENERATED' | 'REVIEW' | 'APPROVED' | 'GENERATED' | 'SENT';

export type AttachmentType = 'PHOTO_BEFORE' | 'PHOTO_AFTER' | 'PHOTO_GENERAL' | 'VOICE' | 'DOCUMENT';

export interface Company {
  id: string;
  name: string;
  businessNumber?: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  companyId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface Site {
  id: string;
  companyId: string;
  name: string;
  address?: string | null;
  customerName?: string | null;
  createdAt: string;
}

export interface Equipment {
  id: string;
  siteId: string;
  type: string;
  serialNumber?: string | null;
  qrCode?: string | null;
  history?: EquipmentHistory[];
}

export interface EquipmentHistory {
  id: string;
  equipmentId: string;
  workOrderId?: string | null;
  summary: string;
  occurredAt: string;
}

export interface WorkOrder {
  id: string;
  siteId: string;
  equipmentId?: string | null;
  assignedUserId?: string | null;
  status: WorkOrderStatus;
  clientUuid: string;
  scheduledAt?: string | null;
  createdAt: string;
  site?: Site;
  equipment?: Equipment;
  workRecords?: WorkRecord[];
  attachments?: Attachment[];
}

export interface WorkRecord {
  id: string;
  workOrderId: string;
  description?: string | null;
  issue?: string | null;
  action?: string | null;
  result?: string | null;
}

export interface Attachment {
  id: string;
  workOrderId: string;
  type: AttachmentType;
  fileUrl: string;
  createdAt: string;
}

export interface TemplateField {
  id: string;
  templateId: string;
  fieldKey: string;
  fieldType: string;
  required: boolean;
  sortOrder: number;
}

export interface TemplateSection {
  title: string;
  fields: string[];
}

export interface ReportTemplate {
  id: string;
  companyId: string;
  name: string;
  reportType: string;
  version: number;
  sections: { template: string; sections: TemplateSection[] };
  templateFields?: TemplateField[];
}

export interface Report {
  id: string;
  workOrderId: string;
  templateId: string;
  status: ReportStatus;
  content?: Record<string, string | null> | null;
  pdfUrl?: string | null;
  version: number;
  createdAt: string;
  workOrder?: WorkOrder;
  template?: ReportTemplate;
}

export interface MissingFieldsResult {
  reportId: string;
  missing: string[];
  isComplete: boolean;
}
