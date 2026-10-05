import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { AdminResetPasswordDto, AdminUpdateUserDto, ChangePasswordDto, CreateClientDto, CreateFreelancerDto, DeleteMeDto, ListUsersQuery, UpdateMeDto } from './dto/user.dto';

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

  @Post('clients')
  @UseGuards(RolesGuard)
  @Roles('admin')
  createClient(@Body() dto: CreateClientDto) {
    return this.usersService.createClient(dto);
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

  @Post('freelancers')
  @UseGuards(RolesGuard)
  @Roles('admin')
  createFreelancer(@Body() dto: CreateFreelancerDto) {
    return this.usersService.createFreelancer(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  adminUpdate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminUpdateUserDto) {
    return this.usersService.adminUpdate(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async adminDelete(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.adminDelete(req.user.id, id);
    return { deleted: true };
  }

  @Patch(':id/password')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async resetPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminResetPasswordDto) {
    const { temporaryPassword } = await this.usersService.resetPassword(id, dto.newPassword);
    return { message: 'Password reset', temporaryPassword };
  }
}
