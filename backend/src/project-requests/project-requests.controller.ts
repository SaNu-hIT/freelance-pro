import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRequestsService } from './project-requests.service';
import { CreateProjectRequestDto, ListProjectRequestsQuery, ResolveProjectRequestDto } from './project-request.dto';

@UseGuards(JwtAuthGuard)
@Controller('project-requests')
export class ProjectRequestsController {
  constructor(private requestsService: ProjectRequestsService) {}

  @Get()
  list(@Request() req: any, @Query() query: ListProjectRequestsQuery) {
    return this.requestsService.list(req.user, query);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateProjectRequestDto) {
    return this.requestsService.create(req.user, dto);
  }

  @Patch(':id/resolve')
  resolve(@Request() req: any, @Param('id') id: string, @Body() dto: ResolveProjectRequestDto) {
    return this.requestsService.resolve(req.user, id, dto.reply);
  }
}
