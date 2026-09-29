import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: '샘플 시설관리(주)',
      businessNumber: '123-45-67890',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      companyId: company.id,
      email: 'admin@example.com',
      name: '관리자',
      role: 'ADMIN',
      passwordHash,
    },
  });

  const site = await prisma.site.create({
    data: {
      companyId: company.id,
      name: '샘플 빌딩',
      address: '서울시 강남구',
      customerName: '샘플 고객사',
    },
  });

  const equipment = await prisma.equipment.create({
    data: {
      siteId: site.id,
      type: '냉방기',
      serialNumber: 'AC-2024-001',
      qrCode: 'QR-SAMPLE-001',
    },
  });

  const template = await prisma.reportTemplate.create({
    data: {
      companyId: company.id,
      name: '작업완료보고서 (기본)',
      reportType: 'work_completion',
      version: 1,
      sections: {
        template: 'work_completion',
        sections: [
          { title: '작업정보', fields: ['customer_name', 'site_name', 'worker', 'work_date'] },
          { title: '작업내용', fields: ['description', 'issue', 'action', 'result'] },
          { title: '사진', fields: ['before_photos', 'after_photos'] },
        ],
      },
      templateFields: {
        create: [
          { fieldKey: 'description', fieldType: 'text', required: true, sortOrder: 0 },
          { fieldKey: 'issue', fieldType: 'text', required: true, sortOrder: 1 },
          { fieldKey: 'action', fieldType: 'text', required: true, sortOrder: 2 },
          { fieldKey: 'result', fieldType: 'text', required: true, sortOrder: 3 },
          { fieldKey: 'before_photos', fieldType: 'photo', required: false, sortOrder: 4 },
          { fieldKey: 'after_photos', fieldType: 'photo', required: true, sortOrder: 5 },
        ],
      },
    },
  });

  console.log({ company: company.name, admin: admin.email, site: site.name, equipment: equipment.type, template: template.name });
  console.log('로그인: admin@example.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
