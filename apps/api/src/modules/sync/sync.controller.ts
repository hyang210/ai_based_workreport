import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { SyncService } from './sync.service';
import { PushSyncEventsDto } from './dto/sync-event.dto';

@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('events')
  pushEvents(@CurrentUser() user: AuthUser, @Body() dto: PushSyncEventsDto) {
    return this.syncService.pushEvents(user.companyId, dto);
  }

  @Get('pull')
  pull(@CurrentUser() user: AuthUser, @Query('deviceId') deviceId: string, @Query('cursor') cursor?: string) {
    return this.syncService.pull(user.companyId, deviceId, cursor);
  }
}
