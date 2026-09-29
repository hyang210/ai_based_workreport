import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

// 사진/음성 파일은 서버를 거치지 않고 클라이언트가 Object Storage에 직접 업로드한다.
// 이 서비스는 presigned URL만 발급하고, 업로드 완료 후 메타데이터는
// POST /work-orders/:id/attachments 로 별도 확정한다 (설계서 5.1 / 9.2).
@Injectable()
export class AttachmentsService {
  private s3: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET') ?? 'workreport-attachments';
    this.s3 = new S3Client({
      region: this.config.get<string>('S3_REGION') ?? 'us-east-1',
      endpoint: this.config.get<string>('S3_ENDPOINT'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY') ?? '',
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY') ?? '',
      },
    });
  }

  async createPresignedUpload(companyId: string, contentType: string) {
    const key = `${companyId}/${randomUUID()}`;
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    const fileUrl = `${this.config.get<string>('S3_ENDPOINT')}/${this.bucket}/${key}`;
    return { uploadUrl, fileUrl, key };
  }

  // 서버에서 직접 생성한 파일(예: 렌더링된 PDF)을 업로드할 때 사용.
  async uploadBuffer(companyId: string, buffer: Buffer, contentType: string, keyPrefix = 'reports') {
    const key = `${companyId}/${keyPrefix}/${randomUUID()}.pdf`;
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: contentType }));
    return `${this.config.get<string>('S3_ENDPOINT')}/${this.bucket}/${key}`;
  }
}
