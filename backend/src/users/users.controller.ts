import { Body, Controller, Delete, Get, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { ChangePasswordDto, DeleteMeDto, ListUsersQuery, UpdateMeDto } from './dto/user.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  list(@Query() query: ListUsersQuery) {
    return this.usersService.list(query.role);
  }

  @Get('me')
  me(@Request() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  updateMe(@Request() req: any, @Body() dto: UpdateMeDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Patch('me/password')
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    await this.usersService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
    return { message: 'Password updated' };
  }

  @Delete('me')
  async deleteMe(@Request() req: any, @Body() dto: DeleteMeDto) {
    await this.usersService.deleteAccount(req.user.id, dto.password);
    return { message: 'Account deleted' };
  }
}
