import { Injectable } from '@nestjs/common';

// HTML/CSS 템플릿 → PDF 렌더링 (설계서 5.2, 6.3).
// Playwright의 Chromium 바이너리는 이 컨테이너 네트워크 정책상 설치할 수 없어
// baseline에는 인터페이스와 간단한 HTML 빌더만 포함한다.
// 실제 배포 환경에서는 `npx playwright install chromium` 실행 후 아래 render()가 동작한다.
@Injectable()
export class PdfService {
  buildHtml(companyName: string, reportType: string, sections: any, data: Record<string, unknown>): string {
    const sectionsHtml = (sections?.sections ?? [])
      .map((section: any) => {
        const rows = (section.fields ?? [])
          .map((fieldKey: string) => `<tr><th>${this.escape(fieldKey)}</th><td>${this.escape(data[fieldKey])}</td></tr>`)
          .join('');
        return `<h2>${this.escape(section.title)}</h2><table>${rows}</table>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: 'Malgun Gothic', sans-serif; padding: 32px; color: #1e1e1e; }
  h1 { font-size: 20px; border-bottom: 2px solid #1f4e79; padding-bottom: 8px; }
  h2 { font-size: 15px; margin-top: 24px; color: #1f4e79; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #d9d9d9; padding: 6px 10px; text-align: left; font-size: 12px; }
  th { width: 30%; background: #f2f2f2; }
</style>
</head>
<body>
  <h1>${this.escape(companyName)} — ${this.escape(reportType)}</h1>
  ${sectionsHtml}
</body>
</html>`;
  }

  async renderToPdfBuffer(html: string): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    try {
      // 보고서 HTML은 정적 문서다. 스크립트 실행과 외부 요청을 모두 막아 주입된 내용이 서버에서 동작하지 않게 한다.
      const context = await browser.newContext({ javaScriptEnabled: false });
      await context.route('**/*', (route: { abort: () => Promise<void> }) => route.abort());
      const page = await context.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      return await page.pdf({ format: 'A4', printBackground: true });
    } finally {
      await browser.close();
    }
  }

  private escape(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
    );
  }
}
