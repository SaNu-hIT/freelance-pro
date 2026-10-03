import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectRequest } from '../entities/project-request.entity';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectRequestsController } from './project-requests.controller';
import { ProjectRequestsService } from './project-requests.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectRequest]), ProjectsModule],
  controllers: [ProjectRequestsController],
  providers: [ProjectRequestsService],
})
export class ProjectRequestsModule {}
