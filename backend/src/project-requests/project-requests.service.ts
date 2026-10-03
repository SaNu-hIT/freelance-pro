import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectRequest } from '../entities/project-request.entity';
import { ProjectsService } from '../projects/projects.service';
import { CreateProjectRequestDto, ListProjectRequestsQuery } from './project-request.dto';

type Actor = { id: string; role: string };

// Who may open a request of each kind, and who may resolve it.
const CAN_CREATE: Record<string, string[]> = {
  question: ['admin', 'freelancer'],
  change: ['client'],
  escalation: ['client'],
};
const CAN_RESOLVE: Record<string, string[]> = {
  question: ['client'],
  change: ['admin', 'freelancer'],
  escalation: ['admin'],
};

@Injectable()
export class ProjectRequestsService {
  constructor(
    @InjectRepository(ProjectRequest)
    private requestsRepo: Repository<ProjectRequest>,
    private projectsService: ProjectsService,
  ) {}

  list(user: Actor, query: ListProjectRequestsQuery): Promise<ProjectRequest[]> {
    const qb = this.requestsRepo
      .createQueryBuilder('request')
      .innerJoin('request.project', 'project')
      .addSelect(['project.id', 'project.title'])
      .leftJoin('request.fromUser', 'fromUser')
      .addSelect(['fromUser.id', 'fromUser.name', 'fromUser.role'])
      .orderBy('request.createdAt', 'DESC');
    this.projectsService.scopeToUser(qb, 'project', user);
    if (query.projectId) qb.andWhere('request.projectId = :projectId', { projectId: query.projectId });
    if (query.kind) qb.andWhere('request.kind = :kind', { kind: query.kind });
    if (query.status) qb.andWhere('request.status = :status', { status: query.status });
    return qb.getMany();
  }

  async create(user: Actor, dto: CreateProjectRequestDto): Promise<ProjectRequest> {
    if (!CAN_CREATE[dto.kind].includes(user.role)) {
      throw new ForbiddenException(`A ${user.role} cannot open a ${dto.kind} request`);
    }
    await this.projectsService.assertAccess(user, dto.projectId);
    return this.requestsRepo.save(this.requestsRepo.create({ ...dto, fromUserId: user.id }));
  }

  async resolve(user: Actor, id: string, reply?: string): Promise<ProjectRequest> {
    const request = await this.requestsRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    await this.projectsService.assertAccess(user, request.projectId);
    if (!CAN_RESOLVE[request.kind].includes(user.role)) {
      throw new ForbiddenException(`A ${user.role} cannot resolve a ${request.kind} request`);
    }
    Object.assign(request, { status: 'resolved', reply: reply ?? null, resolvedById: user.id, resolvedAt: new Date() });
    return this.requestsRepo.save(request);
  }
}
