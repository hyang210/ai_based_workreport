import { ConfigService } from '@nestjs/config';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AttachmentsService } from './attachments.service';

describe('AttachmentsService (local)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wr-'));
  const service = new AttachmentsService({ get: (k: string) => ({ UPLOAD_DIR: dir, API_URL: 'http://x' } as Record<string, string>)[k] } as ConfigService);

  it('저장한 파일을 같은 회사로 다시 읽는다', async () => {
    const url = await service.uploadBuffer('c1', Buffer.from('hi'), 'image/png', 'png');
    expect(url).toMatch(/^http:\/\/x\/api\/files\/c1\/[0-9a-f-]{36}\.png$/);
    const data = await service.readLocal('c1', url.split('/').pop()!);
    expect(data?.toString()).toBe('hi');
    expect(await service.readLocal('c2', url.split('/').pop()!)).toBeNull();
  });

  it('이 회사가 올린 파일 URL만 우리 파일로 인정한다', async () => {
    const url = await service.uploadBuffer('c1', Buffer.from('hi'), 'image/png', 'png');
    expect(service.isOwnFileUrl('c1', url)).toBe(true);
    expect(service.isOwnFileUrl('c2', url)).toBe(false);
    expect(service.isOwnFileUrl('c1', 'javascript:alert(1)')).toBe(false);
    expect(service.isOwnFileUrl('c1', 'https://evil.example/x.png')).toBe(false);
    expect(service.isOwnFileUrl('c1', 'http://x/api/files/c1/../c2/' + url.split('/').pop())).toBe(false);
  });

  it('경로 조작 파일명은 거부한다', async () => {
    await expect(service.readLocal('c1', '../../etc/passwd')).rejects.toThrow();
  });
});
