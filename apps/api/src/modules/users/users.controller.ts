import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.usersService.findAllForCompany(user.companyId);
  }

  @Post('invite')
  @Roles('ADMIN', 'MANAGER')
  invite(@CurrentUser() user: AuthUser, @Body() dto: InviteUserDto) {
    return this.usersService.invite(user.companyId, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.remove(user.companyId, id);
  }
}
