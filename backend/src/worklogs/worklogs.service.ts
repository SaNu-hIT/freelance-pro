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

export interface HoursSummary {
  totalHours: number;
  weekHours: number;
  byProject: { projectId: string; title: string; hours: number; weekHours: number; freelancers: number }[];
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

  // Logged hours in total, since weekStart, and per project; freelancerUserId limits it to one freelancer
  async summary(weekStart: string, freelancerUserId?: string): Promise<HoursSummary> {
    const qb = this.worklogsRepository
      .createQueryBuilder('worklog')
      .innerJoin('worklog.project', 'project')
      .innerJoin('worklog.freelancer', 'freelancer')
      .select('project.id', 'projectId')
      .addSelect('project.title', 'title')
      .addSelect('COALESCE(SUM(worklog.hoursWorked), 0)', 'hours')
      .addSelect('COALESCE(SUM(CASE WHEN worklog.date >= :weekStart THEN worklog.hoursWorked ELSE 0 END), 0)', 'weekHours')
      .addSelect('COUNT(DISTINCT worklog.freelancerId)', 'freelancers')
      .setParameter('weekStart', weekStart)
      .groupBy('project.id')
      .addGroupBy('project.title')
      .orderBy('hours', 'DESC');
    if (freelancerUserId) qb.where('freelancer.userId = :freelancerUserId', { freelancerUserId });

    const rows = await qb.getRawMany();
    const byProject = rows.map((r) => ({
      projectId: r.projectId as string,
      title: r.title as string,
      hours: parseFloat(r.hours),
      weekHours: parseFloat(r.weekHours),
      freelancers: parseInt(r.freelancers, 10),
    }));
    return {
      totalHours: byProject.reduce((s, p) => s + p.hours, 0),
      weekHours: byProject.reduce((s, p) => s + p.weekHours, 0),
      byProject,
    };
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

    this.checkSession(dto);

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

  // A timer session must match the log it is attached to
  private checkSession({ startedAt, endedAt, date, hoursWorked }: CreateWorklogDto) {
    if (!startedAt && !endedAt) return;
    if (!startedAt || !endedAt) {
      throw new BadRequestException('A session needs both a start and an end time');
    }
    const start = new Date(startedAt).getTime();
    const end = new Date(endedAt).getTime();
    if (end <= start) {
      throw new BadRequestException('Session end must be after its start');
    }
    // The timer rounds to the nearest quarter hour (minimum 0.25), so allow up to the next quarter
    const maxHours = Math.max(0.25, Math.ceil(((end - start) / 3600000) * 4) / 4);
    if (hoursWorked > maxHours) {
      throw new BadRequestException(`A ${maxHours}h session cannot log ${hoursWorked} hours`);
    }
    // Allow a day either side of the log date for timezones and sessions that run past midnight
    const day = 86400000;
    const dayStart = new Date(date.slice(0, 10) + 'T00:00:00.000Z').getTime();
    if (start < dayStart - day || end > dayStart + 2 * day) {
      throw new BadRequestException(`Session times do not fall on ${date.slice(0, 10)}`);
    }
  }

  async update(id: string, dto: UpdateWorklogDto): Promise<Worklog> {
    const worklog = await this.findOne(id);
    Object.assign(worklog, dto);
    return this.worklogsRepository.save(worklog);
  }
}
