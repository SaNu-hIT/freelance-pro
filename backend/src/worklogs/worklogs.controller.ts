import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WorklogsService } from './worklogs.service';
import { CreateWorklogDto, UpdateWorklogDto } from './dto/worklog.dto';

@UseGuards(JwtAuthGuard)
@Controller('worklogs')
export class WorklogsController {
  constructor(private worklogsService: WorklogsService) {}

  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    const user = req.user;
    const filters: any = {
      projectId: query.projectId,
      date: query.date,
      limit: query.limit ? parseInt(query.limit) : 20,
      page: query.page ? parseInt(query.page) : 1,
    };

    if (user.role === 'freelancer') {
      filters.freelancerUserId = user.id;
    }

    return this.worklogsService.findAll(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.worklogsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateWorklogDto, @Request() req: any) {
    const user = req.user;
    if (user.role !== 'freelancer') {
      throw new ForbiddenException('Only freelancers can create worklogs');
    }
    return this.worklogsService.create(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdateWorklogDto) {
    return this.worklogsService.update(id, dto);
  }
}
