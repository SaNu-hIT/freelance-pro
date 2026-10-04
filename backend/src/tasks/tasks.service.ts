import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { ProjectTask } from '../entities/project-task.entity';
import { FreelancerProfile } from '../entities/freelancer-profile.entity';

// The worklog timer auto-pauses at 8 hours, so an older start is a timer that was never stopped
export const RUNNING_MAX_MS = 8 * 3600 * 1000;

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(ProjectTask)
    private tasksRepo: Repository<ProjectTask>,
  ) {}

  findByProject(projectId: string): Promise<ProjectTask[]> {
    return this.tasksRepo.find({
      where: { projectId },
      relations: { sprint: true, assignedFreelancer: { user: true }, startedBy: { user: true } },
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  async isProjectMember(taskId: string, userId: string): Promise<boolean> {
    const count = await this.tasksRepo
      .createQueryBuilder('task')
      .innerJoin('task.project', 'project')
      .innerJoin('project.teamMembers', 'member')
      .where('task.id = :taskId', { taskId })
      .andWhere('member.userId = :userId', { userId })
      .getCount();
    return count > 0;
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
    // A finished task is no longer being worked on
    if (data.completed) {
      task.startedAt = null;
      task.startedById = null;
    }
    return this.tasksRepo.save(task);
  }

  private async profileFor(userId: string): Promise<FreelancerProfile> {
    const profile = await this.tasksRepo.manager.findOne(FreelancerProfile, { where: { userId } });
    if (!profile) throw new ForbiddenException('Freelancer profile not found');
    return profile;
  }

  // Marks the task in progress for this freelancer; their previous task (if any) stops
  async start(id: string, userId: string): Promise<ProjectTask> {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    if (task.completed) throw new BadRequestException('This task is already done');
    const profile = await this.profileFor(userId);
    await this.tasksRepo.update({ startedById: profile.id }, { startedAt: null, startedById: null });
    task.startedAt = new Date();
    task.startedById = profile.id;
    return this.tasksRepo.save(task);
  }

  async stop(userId: string): Promise<{ stopped: boolean }> {
    const profile = await this.profileFor(userId);
    await this.tasksRepo.update({ startedById: profile.id }, { startedAt: null, startedById: null });
    return { stopped: true };
  }

  // Tasks with a live timer: all of them for admins, only their own for a freelancer
  async running(user: { id: string; role: string }): Promise<ProjectTask[]> {
    const where: Record<string, unknown> = { startedAt: MoreThan(new Date(Date.now() - RUNNING_MAX_MS)) };
    if (user.role !== 'admin') where.startedById = (await this.profileFor(user.id)).id;
    return this.tasksRepo.find({
      where,
      relations: { project: true, startedBy: { user: true } },
      order: { startedAt: 'DESC' },
    });
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    await this.tasksRepo.remove(task);
    return { deleted: true };
  }
}
