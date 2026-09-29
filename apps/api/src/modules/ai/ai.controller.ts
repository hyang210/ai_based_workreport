import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { StructureTextDto } from './dto/structure-text.dto';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('structure')
  structure(@Body() dto: StructureTextDto) {
    return this.aiService.structure(dto);
  }
}
