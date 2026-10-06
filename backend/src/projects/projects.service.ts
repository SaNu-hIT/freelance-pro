import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, MoreThanOrEqual, ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { FreelancerProfile } from '../entities/freelancer-profile.entity';
import { ProjectRequest } from '../entities/project-request.entity';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

export interface ProjectQuery {
  status?: string;
  clientId?: string;
  assignedTo?: string;
  freelancerUserId?: string;
  limit?: number;
  page?: number;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(FreelancerProfile)
    private freelancerRepo: Repository<FreelancerProfile>,
    @InjectRepository(ProjectRequest)
    private requestsRepo: Repository<ProjectRequest>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async findAll(query: ProjectQuery): Promise<{ data: Project[]; total: number }> {
    const { status, clientId, assignedTo, freelancerUserId, limit = 20, page = 1 } = query;
    const qb = this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.client', 'client')
      .leftJoinAndSelect('project.assignedFreelancer', 'assignedFreelancer')
      .leftJoinAndSelect('assignedFreelancer.user', 'freelancerUser')
      .leftJoinAndSelect('project.teamMembers', 'teamMembers')
      .leftJoinAndSelect('teamMembers.user', 'teamMemberUser');

    if (status) qb.andWhere('project.status = :status', { status });
    if (clientId) qb.andWhere('project.clientId = :clientId', { clientId });
    if (assignedTo) qb.andWhere('project.assignedTo = :assignedTo', { assignedTo });
    if (freelancerUserId) {
      qb.innerJoin('project.teamMembers', 'fm')
        .innerJoin('fm.user', 'fmUser')
        .andWhere('fmUser.id = :freelancerUserId', { freelancerUserId });
    }

    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy('project.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  // Admins see every project, clients their own, freelancers the ones they're on.
  async assertAccess(user: { id: string; role: string }, projectId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: { teamMembers: true },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    const allowed =
      user.role === 'admin' ||
      (user.role === 'client' && project.clientId === user.id) ||
      (user.role === 'freelancer' && project.teamMembers.some((m) => m.userId === user.id));
    if (!allowed) throw new ForbiddenException('Access denied');
    return project;
  }

  // Limits a query that joins a project (as projectAlias) to projects the user can see.
  scopeToUser<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    projectAlias: string,
    user: { id: string; role: string },
  ): SelectQueryBuilder<T> {
    if (user.role === 'client') {
      qb.andWhere(`${projectAlias}.clientId = :scopeUserId`, { scopeUserId: user.id });
    } else if (user.role === 'freelancer') {
      qb.innerJoin(`${projectAlias}.teamMembers`, 'scopeMember').andWhere('scopeMember.userId = :scopeUserId', {
        scopeUserId: user.id,
      });
    }
    return qb;
  }

  // Client sign-off on a project awaiting approval
  async approve(user: { id: string; role: string }, id: string): Promise<Project> {
    await this.assertPendingForOwner(user, id);
    await this.projectsRepository.update(id, { status: 'completed' });
    return this.findOne(id);
  }

  // Client sends a project awaiting approval back to the team with notes
  async requestChanges(user: { id: string; role: string }, id: string, message: string): Promise<Project> {
    await this.assertPendingForOwner(user, id);
    await this.projectsRepository.update(id, { status: 'in_progress' });
    await this.requestsRepo.save(
      this.requestsRepo.create({ projectId: id, kind: 'change', fromUserId: user.id, subject: 'Changes requested', body: message }),
    );
    return this.findOne(id);
  }

  private async assertPendingForOwner(user: { id: string; role: string }, id: string) {
    if (user.role !== 'client') throw new ForbiddenException('Only the client can approve a project');
    const project = await this.assertAccess(user, id);
    if (project.status !== 'pending_approval') {
      throw new BadRequestException('Project is not awaiting approval');
    }
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: {
        client: true,
        assignedFreelancer: { user: true },
        teamMembers: { user: true },
        worklogs: true,
        payments: true,
      },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async create(dto: CreateProjectDto & { teamMemberIds?: string[] }, clientId: string): Promise<Project> {
    await this.assertClientAccount(clientId);
    const { teamMemberIds, clientId: _ignored, ...rest } = dto as any;
    const project = this.projectsRepository.create({ ...(rest as DeepPartial<Project>), clientId, status: 'new' });

    if (teamMemberIds?.length) {
      project.teamMembers = await this.freelancerRepo.find({ where: { id: In(teamMemberIds) }, relations: { user: true } });
    } else {
      project.teamMembers = [];
    }

    const saved = await this.projectsRepository.save(project);
    return this.findOne(saved.id);
  }

  private async assertClientAccount(userId: string): Promise<void> {
    const count = await this.usersRepo.count({ where: { id: userId, role: 'client' } });
    if (!count) throw new BadRequestException('clientId must be a client account');
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    if (dto.clientId !== undefined) await this.assertClientAccount(dto.clientId);
    const { teamMemberIds, ...rest } = dto as any;
    Object.assign(project, rest);
    // findOne loaded the old client; drop it so the new clientId is what gets saved
    if (dto.clientId !== undefined) delete (project as any).client;

    if (teamMemberIds !== undefined) {
      project.teamMembers = teamMemberIds.length
        ? await this.freelancerRepo.find({ where: { id: In(teamMemberIds) }, relations: { user: true } })
        : [];
    }

    await this.projectsRepository.save(project);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    await this.projectsRepository.remove(project);
  }

  async getDashboardStats() {
    const statusCounts: { status: string; count: string }[] = await this.projectsRepository
      .createQueryBuilder('project')
      .select('project.status', 'status')
      .addSelect('COUNT(project.id)', 'count')
      .groupBy('project.status')
      .getRawMany();
    const by: Record<string, number> = {};
    for (const c of statusCounts) by[c.status] = parseInt(c.count, 10);
    const total = (...statuses: string[]) => statuses.reduce((n, st) => n + (by[st] ?? 0), 0);

    const since = new Date(Date.now() - 30 * 86400000);
    const [totalProjects, newProjects, totalFreelancers, activeFreelancers, newFreelancers] = await Promise.all([
      this.projectsRepository.count(),
      this.projectsRepository.count({ where: { createdAt: MoreThanOrEqual(since) } }),
      this.freelancerRepo.count(),
      this.freelancerRepo.count({ where: { status: 'active' } }),
      this.freelancerRepo.count({ where: { createdAt: MoreThanOrEqual(since) } }),
    ]);

    return {
      totalProjects,
      activeProjects: total('onboarded', 'assigned', 'in_progress'),
      delayedProjects: total('delayed', 'blocked'),
      completedProjects: total('completed'),
      pendingApprovals: total('pending_approval'),
      totalFreelancers,
      activeFreelancers,
      newProjectsLast30Days: newProjects,
      newFreelancersLast30Days: newFreelancers,
      statusBreakdown: by,
    };
  }

}
