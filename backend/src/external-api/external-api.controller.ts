import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiKeyGuard } from './api-key.guard';
import { ExternalApiService } from './external-api.service';
import { CreateExternalTaskDto } from './external-task.dto';

// For the external assistant (WhatsApp intake). Bearer API key only; user logins do not work here.
@UseGuards(ApiKeyGuard)
@Controller('api')
export class ExternalApiController {
  constructor(private service: ExternalApiService) {}

  @Get('projects')
  projects() {
    return this.service.listProjects();
  }

  @Post('projects/:projectId/tasks')
  async createTask(
    @Param(
      'projectId',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('project_id must be a UUID'),
      }),
    )
    projectId: string,
    @Body() dto: CreateExternalTaskDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { task, created } = await this.service.create(projectId, dto);
    res.status(created ? 201 : 200);
    return task;
  }

  // { exists, task }: whether this WhatsApp message was already filed
  @Get('tasks')
  async taskByMessage(@Query('message_id') messageId?: string) {
    if (!messageId?.trim())
      throw new BadRequestException('message_id is required');
    const task = await this.service.findByMessageId(messageId);
    return { exists: !!task, task };
  }
}
