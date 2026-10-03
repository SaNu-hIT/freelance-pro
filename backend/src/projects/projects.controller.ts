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
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, RequestChangesDto, UpdateProjectDto } from './dto/project.dto';

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
    } else if (user.role === 'admin') {
      if (query.assignedTo) filters.assignedTo = query.assignedTo;
      if (query.freelancerUserId) filters.freelancerUserId = query.freelancerUserId;
      if (query.clientId) filters.clientId = query.clientId;
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

    // Payouts are between the platform and each freelancer; only admins see them here
    if (user.role !== 'admin') delete (project as Partial<typeof project>).payments;
    return project;
  }

  @Post()
  async create(@Body() dto: CreateProjectDto, @Request() req: any) {
    const user = req.user;
    if (user.role !== 'admin' && user.role !== 'client') {
      throw new ForbiddenException('Only admins and clients can create projects');
    }
    if (user.role === 'admin') {
      if (!dto.clientId) throw new BadRequestException('Choose the client this project is for');
      return this.projectsService.create(dto, dto.clientId);
    }
    // A client always owns what they create
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

  @Post(':id/approve')
  approve(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.approve(req.user, id);
  }

  @Post(':id/request-changes')
  requestChanges(@Param('id') id: string, @Body() dto: RequestChangesDto, @Request() req: any) {
    return this.projectsService.requestChanges(req.user, id, dto.message);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    await this.projectsService.remove(id);
    return { message: 'Project deleted successfully' };
  }
}
