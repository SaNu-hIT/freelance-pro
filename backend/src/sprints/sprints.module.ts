import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectSprint } from '../entities/project-sprint.entity';
import { ProjectTask } from '../entities/project-task.entity';
import { SprintsController } from './sprints.controller';
import { SprintsService } from './sprints.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectSprint, ProjectTask]), ProjectsModule],
  controllers: [SprintsController],
  providers: [SprintsService],
  exports: [SprintsService],
})
export class SprintsModule {}
