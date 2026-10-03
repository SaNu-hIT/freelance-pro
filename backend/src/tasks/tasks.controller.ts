import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TasksService } from './tasks.service';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  findByProject(@Query('projectId') projectId: string) {
    if (!projectId) throw new BadRequestException('projectId is required');
    return this.tasksService.findByProject(projectId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() body: { projectId: string; title: string; order?: number; sprintId?: string; assignedFreelancerId?: string }) {
    return this.tasksService.create(body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { title?: string; completed?: boolean; order?: number; sprintId?: string | null; assignedFreelancerId?: string | null },
    @Request() req: any,
  ) {
    const user = req.user;
    if (user.role === 'admin') {
      return this.tasksService.update(id, body);
    }
    // Freelancers on the project may only tick tasks done/undone
    if (user.role === 'freelancer' && (await this.tasksService.isProjectMember(id, user.id))) {
      if (typeof body.completed !== 'boolean') throw new BadRequestException('Only completed can be changed');
      return this.tasksService.update(id, { completed: body.completed });
    }
    throw new ForbiddenException('Access denied');
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
