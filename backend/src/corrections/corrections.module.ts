import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Correction } from '../entities/correction.entity';
import { CorrectionComment } from '../entities/correction-comment.entity';
import { ProjectsModule } from '../projects/projects.module';
import { CorrectionsController } from './corrections.controller';
import { CorrectionsService } from './corrections.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Correction, CorrectionComment]),
    ProjectsModule,
  ],
  controllers: [CorrectionsController],
  providers: [CorrectionsService],
})
export class CorrectionsModule {}
