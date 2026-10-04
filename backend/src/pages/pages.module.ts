import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectPage } from '../entities/project-page.entity';
import { PageNote } from '../entities/page-note.entity';
import { ProjectsModule } from '../projects/projects.module';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { DiscoveryService } from './discovery.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectPage, PageNote]), ProjectsModule],
  controllers: [PagesController],
  providers: [PagesService, DiscoveryService],
})
export class PagesModule {}
