import { Module } from '@nestjs/common';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [WorkOrdersModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
