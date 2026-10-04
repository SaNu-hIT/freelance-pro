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
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TasksService } from './tasks.service';
import { ProjectsService } from '../projects/projects.service';

import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(
    private tasksService: TasksService,
    private projectsService: ProjectsService,
  ) {}

  @Get()
  async findByProject(@Query('projectId') projectId: string, @Request() req: any) {
    if (!projectId) throw new BadRequestException('projectId is required');
    await this.projectsService.assertAccess(req.user, projectId);
    return this.tasksService.findByProject(projectId);
  }

  @Get('running')
  @UseGuards(RolesGuard)
  @Roles('admin', 'freelancer')
  running(@Request() req: any) {
    return this.tasksService.running(req.user);
  }

  // Worklog timer: the freelancer on the project starts a task, and stops whatever they were timing
  @Post('stop')
  @UseGuards(RolesGuard)
  @Roles('freelancer')
  stop(@Request() req: any) {
    return this.tasksService.stop(req.user.id);
  }

  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles('freelancer')
  async start(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    if (!(await this.tasksService.isProjectMember(id, req.user.id))) throw new ForbiddenException('You are not on this project');
    return this.tasksService.start(id, req.user.id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() body: CreateTaskDto) {
    return this.tasksService.create(body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateTaskDto,
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
