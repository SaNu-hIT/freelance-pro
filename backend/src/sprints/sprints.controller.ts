import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SprintsService } from './sprints.service';

@UseGuards(JwtAuthGuard)
@Controller('sprints')
export class SprintsController {
  constructor(private sprintsService: SprintsService) {}

  @Get()
  findByProject(@Query('projectId') projectId: string) {
    if (!projectId) throw new BadRequestException('projectId is required');
    return this.sprintsService.findByProject(projectId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(
    @Body() body: { projectId: string; name: string; order?: number; startDate?: string; endDate?: string },
  ) {
    return this.sprintsService.create(body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; order?: number; startDate?: string; endDate?: string },
  ) {
    return this.sprintsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.sprintsService.remove(id);
  }
}
