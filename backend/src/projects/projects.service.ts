import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { FreelancerProfile } from '../entities/freelancer-profile.entity';
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
    const { teamMemberIds, ...rest } = dto as any;
    const project = this.projectsRepository.create({ ...(rest as DeepPartial<Project>), clientId, status: 'new' });

    if (teamMemberIds?.length) {
      project.teamMembers = await this.freelancerRepo.find({ where: { id: In(teamMemberIds) }, relations: { user: true } });
    } else {
      project.teamMembers = [];
    }

    const saved = await this.projectsRepository.save(project);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    const { teamMemberIds, ...rest } = dto as any;
    Object.assign(project, rest);

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

  async getDashboardStats(): Promise<any> {
    const statusCounts = await this.projectsRepository
      .createQueryBuilder('project')
      .select('project.status', 'status')
      .addSelect('COUNT(project.id)', 'count')
      .groupBy('project.status')
      .getRawMany();

    const totalProjects = await this.projectsRepository.count();
    const totalFreelancers = await this.projectsRepository
      .createQueryBuilder('project')
      .select('COUNT(DISTINCT project.assignedTo)', 'count')
      .where('project.assignedTo IS NOT NULL')
      .getRawOne();

    return {
      totalProjects,
      totalFreelancers: parseInt(totalFreelancers?.count || '0', 10),
      statusBreakdown: statusCounts.reduce(
        (acc: Record<string, number>, curr: any) => {
          acc[curr.status] = parseInt(curr.count, 10);
          return acc;
        },
        {},
      ),
    };
  }
}
