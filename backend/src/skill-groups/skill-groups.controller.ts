import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  create(@Body() body: { name: string; color?: string; skills?: string[] }) {
    return this.service.create(body)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; color: string; skills: string[]; order: number }>,
  ) {
    return this.service.update(id, body)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }

  @Post(':id/skills')
  addSkill(@Param('id') id: string, @Body() body: { skill: string }) {
    return this.service.addSkill(id, body.skill)
  }

  @Delete(':id/skills/:skill')
  removeSkill(@Param('id') id: string, @Param('skill') skill: string) {
    return this.service.removeSkill(id, decodeURIComponent(skill))
  }
}
