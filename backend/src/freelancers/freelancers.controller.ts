import {
  Controller,
  Get,
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
import { FreelancersService } from './freelancers.service';
import { UpdateFreelancerDto, RejectFreelancerDto, UpdateStageDto } from './dto/freelancer.dto';

@UseGuards(JwtAuthGuard)
@Controller('freelancers')
export class FreelancersController {
  constructor(private freelancersService: FreelancersService) {}

  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    const user = req.user;

    if (user.role === 'freelancer') {
      const profile = await this.freelancersService.findByUserId(user.id);
      return profile ? [profile] : [];
    }

    return this.freelancersService.findAll({
      status: query.status,
      search: query.search,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.freelancersService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFreelancerDto,
    @Request() req: any,
  ) {
    const user = req.user;

    if (user.role === 'admin') {
      return this.freelancersService.update(id, dto);
    }

    if (user.role === 'freelancer') {
      const profile = await this.freelancersService.findByUserId(user.id);
      if (!profile || profile.id !== id) {
        throw new ForbiddenException('You can only update your own profile');
      }
      return this.freelancersService.update(id, dto);
    }

    throw new ForbiddenException('Access denied');
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async approve(@Param('id') id: string) {
    return this.freelancersService.approve(id);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async reject(@Param('id') id: string, @Body() dto: RejectFreelancerDto) {
    return this.freelancersService.reject(id, dto);
  }

  @Patch(':id/stage')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateStage(@Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.freelancersService.updateStage(id, dto);
  }

  @Patch(':id/verifications')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateVerifications(
    @Param('id') id: string,
    @Body() body: { verifications: Record<string, boolean> },
  ) {
    return this.freelancersService.updateVerifications(id, body.verifications);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.freelancersService.updateStatus(id, body.status);
  }
}
