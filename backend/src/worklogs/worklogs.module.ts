import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Worklog } from '../entities/worklog.entity';
import { Project } from '../entities/project.entity';
import { FreelancerProfile } from '../entities/freelancer-profile.entity';
import { WorklogsService } from './worklogs.service';
import { WorklogsController } from './worklogs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Worklog, Project, FreelancerProfile])],
  providers: [WorklogsService],
  controllers: [WorklogsController],
  exports: [WorklogsService],
})
export class WorklogsModule {}
