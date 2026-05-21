import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectSprint } from '../entities/project-sprint.entity';

@Injectable()
export class SprintsService {
  constructor(
    @InjectRepository(ProjectSprint)
    private sprintsRepo: Repository<ProjectSprint>,
  ) {}

  findByProject(projectId: string): Promise<ProjectSprint[]> {
    return this.sprintsRepo.find({
      where: { projectId },
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  create(data: {
    projectId: string;
    name: string;
    order?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ProjectSprint> {
    const sprint = this.sprintsRepo.create(data);
    return this.sprintsRepo.save(sprint);
  }

  async update(
    id: string,
    data: Partial<{ name: string; order: number; startDate: string; endDate: string }>,
  ): Promise<ProjectSprint> {
    const sprint = await this.sprintsRepo.findOne({ where: { id } });
    if (!sprint) throw new NotFoundException(`Sprint ${id} not found`);
    Object.assign(sprint, data);
    return this.sprintsRepo.save(sprint);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const sprint = await this.sprintsRepo.findOne({ where: { id } });
    if (!sprint) throw new NotFoundException(`Sprint ${id} not found`);
    await this.sprintsRepo.remove(sprint);
    return { deleted: true };
  }
}
