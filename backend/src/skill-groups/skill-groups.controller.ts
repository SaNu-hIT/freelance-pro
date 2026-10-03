import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkillGroupsService } from './skill-groups.service';

@UseGuards(JwtAuthGuard)
@Controller('skill-groups')
export class SkillGroupsController {
  constructor(private service: SkillGroupsService) {}

  @Get()
  findAll() {
    return this.service.findAll()
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() body: { name: string; color?: string; skills?: string[] }) {
    return this.service.create(body)
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; color: string; skills: string[]; order: number }>,
  ) {
    return this.service.update(id, body)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }

  @Post(':id/skills')
  @UseGuards(RolesGuard)
  @Roles('admin')
  addSkill(@Param('id') id: string, @Body() body: { skill: string }) {
    return this.service.addSkill(id, body.skill)
  }

  @Delete(':id/skills/:skill')
  @UseGuards(RolesGuard)
  @Roles('admin')
  removeSkill(@Param('id') id: string, @Param('skill') skill: string) {
    return this.service.removeSkill(id, decodeURIComponent(skill))
  }
}
