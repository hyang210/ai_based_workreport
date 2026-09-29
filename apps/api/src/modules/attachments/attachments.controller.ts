import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AttachmentsService } from './attachments.service';

class PresignedUploadDto {
  @IsString()
  contentType: string;
}

@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Post('presigned-upload')
  createPresignedUpload(@CurrentUser() user: AuthUser, @Body() dto: PresignedUploadDto) {
    return this.attachmentsService.createPresignedUpload(user.companyId, dto.contentType);
  }
}
