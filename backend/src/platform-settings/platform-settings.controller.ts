import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlatformSettingsService } from './platform-settings.service';

@UseGuards(JwtAuthGuard)
@Controller('platform-settings')
export class PlatformSettingsController {
  constructor(private service: PlatformSettingsService) {}

  @Get()
  get() {
    return this.service.get();
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Body() body: {
    currency?: string;
    timezone?: string;
    maintenanceMode?: boolean;
    newRegistrations?: boolean;
    requireApproval?: boolean;
  }) {
    return this.service.update(body);
  }
}
