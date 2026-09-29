import { IsEnum, IsString } from 'class-validator';
import { AttachmentType } from '@prisma/client';

// 파일 자체는 presigned URL로 Object Storage에 먼저 업로드되고,
// 이 엔드포인트는 메타데이터(fileUrl)만 확정한다 (설계서 5.1 / 8장 API 원칙).
export class CreateAttachmentDto {
  @IsEnum(AttachmentType)
  type: AttachmentType;

  @IsString()
  fileUrl: string;
}
