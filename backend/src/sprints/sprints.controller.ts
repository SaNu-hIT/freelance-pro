import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SprintsService } from './sprints.service';

@UseGuards(JwtAuthGuard)
@Controller('sprints')
export class SprintsController {
  constructor(private sprintsService: SprintsService) {}

  @Get()
  findByProject(@Query('projectId') projectId: string) {
    return this.sprintsService.findByProject(projectId);
  }

  @Post()
  create(
    @Body() body: { projectId: string; name: string; order?: number; startDate?: string; endDate?: string },
  ) {
    return this.sprintsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; order?: number; startDate?: string; endDate?: string },
  ) {
    return this.sprintsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sprintsService.remove(id);
  }
}
