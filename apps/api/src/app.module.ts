import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { SitesModule } from './modules/sites/sites.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AiModule } from './modules/ai/ai.module';
import { SyncModule } from './modules/sync/sync.module';
import { AuditModule } from './modules/audit/audit.module';
import { PdfModule } from './modules/pdf/pdf.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    UsersModule,
    SitesModule,
    EquipmentModule,
    WorkOrdersModule,
    TemplatesModule,
    ReportsModule,
    AttachmentsModule,
    AiModule,
    SyncModule,
    AuditModule,
    PdfModule,
  ],
})
export class AppModule {}
