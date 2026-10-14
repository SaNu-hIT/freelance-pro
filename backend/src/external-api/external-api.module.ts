import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../entities/project.entity';
import { ProjectTask } from '../entities/project-task.entity';
import { ApiKeyGuard } from './api-key.guard';
import { ExternalApiController } from './external-api.controller';
import { ExternalApiService } from './external-api.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectTask])],
  controllers: [ExternalApiController],
  providers: [ExternalApiService, ApiKeyGuard],
})
export class ExternalApiModule {}
