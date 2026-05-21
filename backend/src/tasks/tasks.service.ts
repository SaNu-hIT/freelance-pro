import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectTask } from '../entities/project-task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(ProjectTask)
    private tasksRepo: Repository<ProjectTask>,
  ) {}

  findByProject(projectId: string): Promise<ProjectTask[]> {
    return this.tasksRepo.find({
      where: { projectId },
      relations: { sprint: true, assignedFreelancer: { user: true } },
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  create(data: { projectId: string; title: string; order?: number; sprintId?: string; assignedFreelancerId?: string }): Promise<ProjectTask> {
    const task = this.tasksRepo.create(data);
    return this.tasksRepo.save(task);
  }

  async update(
    id: string,
    data: Partial<{ title: string; completed: boolean; order: number; sprintId: string | null; assignedFreelancerId: string | null }>,
  ): Promise<ProjectTask> {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    Object.assign(task, data);
    if (data.completed !== undefined) {
      task.completedAt = data.completed ? new Date() : null;
    }
    return this.tasksRepo.save(task);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    await this.tasksRepo.remove(task);
    return { deleted: true };
  }
}
