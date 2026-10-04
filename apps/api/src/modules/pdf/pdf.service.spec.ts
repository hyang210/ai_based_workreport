import { PdfService } from './pdf.service';

describe('PdfService.buildHtml', () => {
  const pdf = new PdfService();

  it('필드 키·섹션 제목·값을 모두 escape한다', () => {
    const html = pdf.buildHtml(
      '회사',
      'work_completion',
      { sections: [{ title: '<b>제목</b>', fields: ['<script>alert(1)</script>', 'note'] }] },
      { note: '"<img src=x onerror=alert(1)>"' },
    );
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&quot;&lt;img src=x onerror=alert(1)&gt;&quot;');
  });
});
