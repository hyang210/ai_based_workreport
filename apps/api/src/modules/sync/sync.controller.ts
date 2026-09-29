import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SyncService } from './sync.service';
import { PushSyncEventsDto } from './dto/sync-event.dto';

@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('events')
  pushEvents(@Body() dto: PushSyncEventsDto) {
    return this.syncService.pushEvents(dto);
  }

  @Get('pull')
  pull(@Query('deviceId') deviceId: string, @Query('cursor') cursor?: string) {
    return this.syncService.pull(deviceId, cursor);
  }
}
