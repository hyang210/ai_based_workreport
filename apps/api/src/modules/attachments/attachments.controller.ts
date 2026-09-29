import {
  BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AttachmentsService } from './attachments.service';

class PresignedUploadDto {
  @IsString()
  contentType: string;
}

const MIME_BY_EXT: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };
const EXT_BY_MIME: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

@UseGuards(JwtAuthGuard)
@Controller()
export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Post('attachments/presigned-upload')
  createPresignedUpload(@CurrentUser() user: AuthUser, @Body() dto: PresignedUploadDto) {
    return this.attachmentsService.createPresignedUpload(user.companyId, dto.contentType);
  }

  // 웹 업로드(local 저장소). 사진만 받는다. 작업에 붙이는 것은 기존 POST /work-orders/:id/attachments 가 한다.
  @Post('attachments/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(@CurrentUser() user: AuthUser, @UploadedFile() file?: { buffer: Buffer; mimetype: string }) {
    if (!file) throw new BadRequestException('파일이 없습니다.');
    const ext = EXT_BY_MIME[file.mimetype];
    if (!ext) throw new BadRequestException('jpg, png, webp 이미지만 올릴 수 있습니다.');
    return { fileUrl: await this.attachmentsService.uploadBuffer(user.companyId, file.buffer, file.mimetype, ext) };
  }

  // 내 회사의 파일만 내려준다.
  @Get('files/:companyId/:name')
  async download(@CurrentUser() user: AuthUser, @Param('companyId') companyId: string, @Param('name') name: string, @Res() res: Response) {
    if (companyId !== user.companyId) throw new NotFoundException('파일을 찾을 수 없습니다.');
    const data = await this.attachmentsService.readLocal(companyId, name);
    if (!data) throw new NotFoundException('파일을 찾을 수 없습니다.');
    res.type(MIME_BY_EXT[name.split('.').pop() ?? ''] ?? 'application/octet-stream').send(data);
  }
}
