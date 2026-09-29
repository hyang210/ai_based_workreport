import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PdfModule } from '../pdf/pdf.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { AuditModule } from '../audit/audit.module';
import { AiModule } from '../ai/ai.module';
import { EquipmentModule } from '../equipment/equipment.module';

@Module({
  imports: [PdfModule, AttachmentsModule, AuditModule, AiModule, EquipmentModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
