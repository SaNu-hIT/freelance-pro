import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Not, Repository } from 'typeorm';
import { ProjectTask } from '../entities/project-task.entity';
import { FreelancerProfile } from '../entities/freelancer-profile.entity';
import { syncCorrectionsFromTask } from '../corrections/correction-sync';

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
    { inProgress, ...data }: Partial<{ title: string; completed: boolean; inProgress: boolean; order: number; sprintId: string | null; assignedFreelancerId: string | null }>,
    actorId: string | null = null,
  ): Promise<ProjectTask> {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    Object.assign(task, data);
    if (inProgress === true) {
      task.inProgressAt ??= new Date();
      task.completed = false;
      task.completedAt = null;
    } else if (inProgress === false) {
      task.inProgressAt = null;
    }
    if (data.completed !== undefined) {
      task.completedAt = data.completed ? new Date() : null;
    }
    // A finished task is no longer being worked on
    if (data.completed) {
      task.inProgressAt = null;
      task.startedAt = null;
      task.startedById = null;
    }
    const saved = await this.tasksRepo.save(task);
    if (data.completed !== undefined || inProgress !== undefined) {
      await syncCorrectionsFromTask(this.tasksRepo.manager, saved, actorId);
    }
    return saved;
  }

  private async profileFor(userId: string): Promise<FreelancerProfile> {
    const profile = await this.tasksRepo.manager.findOne(FreelancerProfile, { where: { userId } });
    if (!profile) throw new ForbiddenException('Freelancer profile not found');
    return profile;
  }

  // Marks the task in progress for this freelancer; their previous task (if any) stops
  async start(id: string, userId: string, startedAt?: string): Promise<ProjectTask> {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    if (task.completed) throw new BadRequestException('This task is already done');
    const profile = await this.profileFor(userId);
    await this.tasksRepo.update({ startedById: profile.id }, { startedAt: null, startedById: null });
    // Trust the client's session start only within the timer's 8 hour window
    const now = Date.now();
    const given = startedAt ? new Date(startedAt).getTime() : NaN;
    task.startedAt = new Date(given <= now && given > now - RUNNING_MAX_MS ? given : now);
    task.startedById = profile.id;
    task.inProgressAt ??= task.startedAt;
    const saved = await this.tasksRepo.save(task);
    await syncCorrectionsFromTask(this.tasksRepo.manager, saved, userId);
    return saved;
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

  // Open tasks marked in progress: all of them for admins; for a freelancer, ones assigned to or started by them
  async inProgress(user: { id: string; role: string }): Promise<ProjectTask[]> {
    const base = { inProgressAt: Not(IsNull()), completed: false };
    let where: Record<string, unknown> | Record<string, unknown>[] = base;
    if (user.role !== 'admin') {
      const profileId = (await this.profileFor(user.id)).id;
      where = [{ ...base, assignedFreelancerId: profileId }, { ...base, startedById: profileId }];
    }
    return this.tasksRepo.find({
      where,
      relations: { project: true, assignedFreelancer: { user: true }, startedBy: { user: true } },
      order: { inProgressAt: 'DESC' },
    });
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    await this.tasksRepo.remove(task);
    return { deleted: true };
  }
}
