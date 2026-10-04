import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

// 파일 저장소. STORAGE_DRIVER로 고른다.
// - local (기본): API 서버 디스크(UPLOAD_DIR)에 저장하고 GET /api/files/... 로 내려준다. 개발/소규모 운영용.
// - s3: S3 호환 저장소(MinIO 등). 클라이언트가 presigned URL로 직접 업로드한다 (설계서 5.1 / 9.2).
@Injectable()
export class AttachmentsService {
  private s3?: S3Client;
  private bucket: string;
  readonly driver: 'local' | 's3';
  private uploadDir: string;
  private apiUrl: string;

  constructor(private config: ConfigService) {
    this.driver = this.config.get<string>('STORAGE_DRIVER') === 's3' ? 's3' : 'local';
    this.uploadDir = this.config.get<string>('UPLOAD_DIR') ?? join(process.cwd(), 'uploads');
    this.apiUrl = this.config.get<string>('API_URL') ?? 'http://localhost:4000';
    this.bucket = this.config.get<string>('S3_BUCKET') ?? 'workreport-attachments';

    if (this.driver === 's3') {
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
  }

  async createPresignedUpload(companyId: string, contentType: string) {
    if (!this.s3) throw new BadRequestException('local 저장소에서는 POST /attachments/upload 로 업로드하세요.');
    const key = `${companyId}/${randomUUID()}`;
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    return { uploadUrl, fileUrl: `${this.config.get<string>('S3_ENDPOINT')}/${this.bucket}/${key}`, key };
  }

  // 이 회사가 우리 저장소에 올린 파일의 URL인지 확인한다. 파일명은 서버가 만든 uuid(.확장자)만 허용.
  isOwnFileUrl(companyId: string, url: string): boolean {
    const prefix = this.s3
      ? `${this.config.get<string>('S3_ENDPOINT')}/${this.bucket}/${companyId}/`
      : `${this.apiUrl}/api/files/${companyId}/`;
    return url.startsWith(prefix) && /^[0-9a-f-]{36}(\.[a-z0-9]{2,5})?$/.test(url.slice(prefix.length));
  }

  // 서버가 받은 파일(웹 업로드)이나 직접 만든 파일(렌더링된 PDF)을 저장하고 접근 URL을 돌려준다.
  async uploadBuffer(companyId: string, buffer: Buffer, contentType: string, ext = 'pdf') {
    const name = `${randomUUID()}.${ext}`;
    if (this.s3) {
      const key = `${companyId}/${name}`;
      await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: contentType }));
      return `${this.config.get<string>('S3_ENDPOINT')}/${this.bucket}/${key}`;
    }
    const dir = join(this.uploadDir, companyId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, name), buffer);
    return `${this.apiUrl}/api/files/${companyId}/${name}`;
  }

  // 파일명은 서버가 만든 uuid.확장자 형태만 허용한다 (경로 조작 방지).
  async readLocal(companyId: string, name: string) {
    if (!/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/.test(name)) throw new BadRequestException('잘못된 파일명입니다.');
    try {
      return await fs.readFile(join(this.uploadDir, companyId, name));
    } catch {
      return null;
    }
  }
}
