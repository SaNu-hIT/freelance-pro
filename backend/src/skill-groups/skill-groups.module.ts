import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkillGroup } from '../entities/skill-group.entity';
import { SkillGroupsController } from './skill-groups.controller';
import { SkillGroupsService } from './skill-groups.service';

@Module({
  imports: [TypeOrmModule.forFeature([SkillGroup])],
  controllers: [SkillGroupsController],
  providers: [SkillGroupsService],
  exports: [SkillGroupsService],
})
export class SkillGroupsModule {}
