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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TasksService } from './tasks.service';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  findByProject(@Query('projectId') projectId: string) {
    return this.tasksService.findByProject(projectId);
  }

  @Post()
  create(@Body() body: { projectId: string; title: string; order?: number; sprintId?: string; assignedFreelancerId?: string }) {
    return this.tasksService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { title?: string; completed?: boolean; order?: number; sprintId?: string | null; assignedFreelancerId?: string | null },
  ) {
    return this.tasksService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
