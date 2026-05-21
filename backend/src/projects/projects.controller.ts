import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    const user = req.user;
    const filters: any = {
      status: query.status,
      limit: query.limit ? parseInt(query.limit) : 20,
      page: query.page ? parseInt(query.page) : 1,
    };

    if (user.role === 'client') {
      filters.clientId = user.id;
    } else if (user.role === 'freelancer') {
      filters.freelancerUserId = user.id;
    }

    return this.projectsService.findAll(filters);
  }

  @Get('dashboard/stats')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getDashboardStats() {
    return this.projectsService.getDashboardStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const project = await this.projectsService.findOne(id);
    const user = req.user;

    if (user.role === 'client' && project.clientId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    if (user.role === 'freelancer') {
      const isMember = project.teamMembers?.some(m => m.user?.id === user.id);
      if (!isMember) throw new ForbiddenException('Access denied');
    }

    return project;
  }

  @Post()
  async create(@Body() dto: CreateProjectDto, @Request() req: any) {
    const user = req.user;
    if (user.role !== 'admin' && user.role !== 'client') {
      throw new ForbiddenException('Only admins and clients can create projects');
    }
    return this.projectsService.create(dto, user.id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Request() req: any,
  ) {
    const project = await this.projectsService.findOne(id);
    const user = req.user;

    if (user.role === 'client') {
      throw new ForbiddenException('Clients cannot update projects directly');
    }

    if (user.role === 'freelancer') {
      const isMember = project.teamMembers?.some(m => m.user?.id === user.id);
      if (!isMember) {
        throw new ForbiddenException('Access denied');
      }
      // Freelancers can only update limited fields
      const allowedUpdate: UpdateProjectDto = {};
      if (dto.progress !== undefined) allowedUpdate.progress = dto.progress;
      if (dto.status !== undefined) allowedUpdate.status = dto.status;
      return this.projectsService.update(id, allowedUpdate);
    }

    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    await this.projectsService.remove(id);
    return { message: 'Project deleted successfully' };
  }
}
