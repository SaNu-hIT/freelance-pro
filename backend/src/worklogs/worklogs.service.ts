import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worklog } from '../entities/worklog.entity';
import { Project } from '../entities/project.entity';
import { FreelancerProfile } from '../entities/freelancer-profile.entity';
import { CreateWorklogDto, UpdateWorklogDto } from './dto/worklog.dto';

export interface WorklogQuery {
  projectId?: string;
  freelancerId?: string;
  freelancerUserId?: string;
  clientUserId?: string;
  date?: string;
  limit?: number;
  page?: number;
}

@Injectable()
export class WorklogsService {
  constructor(
    @InjectRepository(Worklog)
    private worklogsRepository: Repository<Worklog>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(FreelancerProfile)
    private freelancerProfileRepository: Repository<FreelancerProfile>,
  ) {}

  async findAll(query: WorklogQuery): Promise<{ data: Worklog[]; total: number }> {
    const { projectId, freelancerId, freelancerUserId, clientUserId, date, limit = 20, page = 1 } = query;
    const qb = this.worklogsRepository
      .createQueryBuilder('worklog')
      .leftJoinAndSelect('worklog.project', 'project')
      .leftJoinAndSelect('worklog.freelancer', 'freelancer')
      .leftJoinAndSelect('freelancer.user', 'user');

    if (projectId) qb.andWhere('worklog.projectId = :projectId', { projectId });
    if (freelancerId) qb.andWhere('worklog.freelancerId = :freelancerId', { freelancerId });
    if (freelancerUserId) qb.andWhere('user.id = :freelancerUserId', { freelancerUserId });
    if (clientUserId) qb.andWhere('project.clientId = :clientUserId', { clientUserId });
    if (date) qb.andWhere('worklog.date = :date', { date });

    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy('worklog.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<Worklog> {
    const worklog = await this.worklogsRepository.findOne({
      where: { id },
      relations: { project: true, freelancer: { user: true } },
    });
    if (!worklog) throw new NotFoundException(`Worklog ${id} not found`);
    return worklog;
  }

  async create(dto: CreateWorklogDto, userId: string): Promise<Worklog> {
    // Find freelancer profile for this user
    const freelancerProfile = await this.freelancerProfileRepository.findOne({
      where: { userId },
    });

    if (!freelancerProfile) {
      throw new ForbiddenException('Freelancer profile not found');
    }
    const freelancerId = freelancerProfile.id;

    const isMember = await this.projectsRepository
      .createQueryBuilder('project')
      .innerJoin('project.teamMembers', 'member')
      .where('project.id = :projectId', { projectId: dto.projectId })
      .andWhere('member.userId = :userId', { userId })
      .getCount();
    if (!isMember) {
      throw new ForbiddenException('You are not on this project');
    }

    // Allow one day ahead so timezones east of the server can log their today
    const latest = new Date();
    latest.setUTCDate(latest.getUTCDate() + 1);
    if (dto.date.slice(0, 10) > latest.toISOString().slice(0, 10)) {
      throw new BadRequestException('Worklog date cannot be in the future');
    }

    const { total } = await this.worklogsRepository
      .createQueryBuilder('worklog')
      .select('COALESCE(SUM(worklog.hoursWorked), 0)', 'total')
      .where('worklog.freelancerId = :freelancerId', { freelancerId })
      .andWhere('worklog.date = :date', { date: dto.date })
      .getRawOne();
    if (parseFloat(total) + dto.hoursWorked > 24) {
      throw new BadRequestException(`Only ${24 - parseFloat(total)} hours left to log on ${dto.date}`);
    }

    const worklog = this.worklogsRepository.create({
      ...dto,
      freelancerId,
    });
    const savedWorklog = await this.worklogsRepository.save(worklog);

    // Update project progress
    if (dto.progress !== undefined) {
      await this.projectsRepository.update(dto.projectId, {
        progress: dto.progress,
      });
    }

    return this.findOne(savedWorklog.id);
  }

  async update(id: string, dto: UpdateWorklogDto): Promise<Worklog> {
    const worklog = await this.findOne(id);
    Object.assign(worklog, dto);
    return this.worklogsRepository.save(worklog);
  }
}
