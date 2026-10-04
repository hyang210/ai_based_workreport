import { IsEnum, IsOptional, IsUrl, IsUUID } from 'class-validator';
import { AttachmentType } from '@prisma/client';

// 파일 자체는 presigned URL로 Object Storage에 먼저 업로드되고,
// 이 엔드포인트는 메타데이터(fileUrl)만 확정한다 (설계서 5.1 / 8장 API 원칙).
export class CreateAttachmentDto {
  @IsOptional()
  @IsUUID()
  clientUuid?: string;

  @IsEnum(AttachmentType)
  type: AttachmentType;

  // 우리 저장소 URL인지는 서비스에서 한 번 더 확인한다 (AttachmentsService.isOwnFileUrl).
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  fileUrl: string;
}
