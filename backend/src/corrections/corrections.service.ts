import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { Correction, CorrectionStatus } from '../entities/correction.entity';
import { CorrectionComment } from '../entities/correction-comment.entity';
import { ProjectDocument } from '../entities/project-document.entity';
import { ProjectPage } from '../entities/project-page.entity';
import { ProjectSprint } from '../entities/project-sprint.entity';
import { ProjectTask } from '../entities/project-task.entity';
import { FreelancerProfile } from '../entities/freelancer-profile.entity';
import { ProjectsService } from '../projects/projects.service';
import {
  CreateCorrectionCommentDto,
  CreateCorrectionDto,
  CreateCorrectionTaskDto,
  ListCorrectionsQuery,
  UpdateCorrectionDto,
} from './correction.dto';
import { logCorrectionStatus, STATUS_LABEL } from './correction-sync';

type Actor = { id: string; role: string };
export type CorrectionSummary = {
  projectId: string;
  total: number;
  withTeam: number;
  withClient: number;
  closed: number;
  // Corrections sent back at least once, and the number of times fixes were sent back
  reopened: number;
  reopens: number;
};
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const MAX_SCREENSHOTS = 5;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

// What a client may do: confirm a fix, or send it back
const CLIENT_MOVES: Partial<Record<CorrectionStatus, CorrectionStatus[]>> = {
  fixed: ['confirmed', 'reopened'],
  confirmed: ['reopened'],
};
// The client's sign-off and closing without a fix are not a developer's call
const ADMIN_ONLY: CorrectionStatus[] = ['confirmed', 'wontfix'];
// A client can still edit their own correction until the team picks it up
const CLIENT_EDITABLE: CorrectionStatus[] = ['open', 'needs_info'];

@Injectable()
export class CorrectionsService {
  constructor(
    @InjectRepository(Correction) private repo: Repository<Correction>,
    @InjectRepository(CorrectionComment)
    private commentsRepo: Repository<CorrectionComment>,
    private projectsService: ProjectsService,
  ) {}

  // Corrections with page, author, screenshots and thread. Clients see client-visible comments only.
  async list(user: Actor, query: ListCorrectionsQuery): Promise<Correction[]> {
    await this.projectsService.assertAccess(user, query.projectId);
    const qb = this.query(user).where('c.projectId = :projectId', {
      projectId: query.projectId,
    });
    if (query.pageId)
      qb.andWhere('c.pageId = :pageId', { pageId: query.pageId });
    if (query.status)
      qb.andWhere('c.status = :status', { status: query.status });
    return qb.getMany();
  }

  // Per project: how many corrections wait on the team, wait on the client, are closed, and how often fixes were sent back
  async summary(user: Actor): Promise<CorrectionSummary[]> {
    if (user.role !== 'admin')
      throw new ForbiddenException('Only admins can see the summary');
    const rows = await this.repo
      .createQueryBuilder('c')
      .select('c.projectId', 'projectId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `COUNT(*) FILTER (WHERE c.status IN ('open', 'triaged', 'in_progress', 'reopened'))`,
        'withTeam',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE c.status IN ('needs_info', 'fixed'))`,
        'withClient',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE c.status IN ('confirmed', 'wontfix'))`,
        'closed',
      )
      .addSelect('COUNT(*) FILTER (WHERE c."reopenCount" > 0)', 'reopened')
      .addSelect('COALESCE(SUM(c."reopenCount"), 0)', 'reopens')
      .groupBy('c.projectId')
      .getRawMany<Record<string, string>>();
    return rows.map((r) => ({
      projectId: r.projectId,
      total: Number(r.total),
      withTeam: Number(r.withTeam),
      withClient: Number(r.withClient),
      closed: Number(r.closed),
      reopened: Number(r.reopened),
      reopens: Number(r.reopens),
    }));
  }

  async findOne(user: Actor, id: string): Promise<Correction> {
    const c = await this.load(user, id);
    return (await this.query(user).where('c.id = :id', { id: c.id }).getOne())!;
  }

  async create(user: Actor, dto: CreateCorrectionDto): Promise<Correction> {
    await this.projectsService.assertAccess(user, dto.projectId);
    const page = dto.pageId
      ? await this.findPage(user, dto.projectId, dto.pageId)
      : null;
    // Numbers are per project; retry if two corrections race for the same one
    for (let attempt = 0; ; attempt++) {
      try {
        const id = await this.repo.manager.transaction(async (m) => {
          const number = (await this.maxNumber(m, dto.projectId)) + 1;
          const saved = await m.save(
            m.create(Correction, {
              projectId: dto.projectId,
              number,
              pageId: page?.id ?? null,
              pageUrl: page?.url ?? null,
              createdById: user.id,
              title: dto.title.trim(),
              body: dto.body.trim(),
              priority: dto.priority ?? 'normal',
              viewport: dto.viewport ?? null,
              status: 'open',
            }),
          );
          return saved.id;
        });
        return this.findOne(user, id);
      } catch (err) {
        if (!(err instanceof QueryFailedError) || attempt >= 2) throw err;
      }
    }
  }

  async update(
    user: Actor,
    id: string,
    dto: UpdateCorrectionDto,
  ): Promise<Correction> {
    const c = await this.load(user, id);
    const isClient = user.role === 'client';
    const { status, ...fields } = dto;
    const editing = Object.values(fields).some((v) => v !== undefined);

    if (editing && isClient) {
      if (c.createdById !== user.id)
        throw new ForbiddenException(
          'You can only edit corrections you raised',
        );
      if (!CLIENT_EDITABLE.includes(c.status))
        throw new ForbiddenException(
          'The team is already working on this correction. Add a comment instead.',
        );
    }
    if (fields.pageId !== undefined) {
      const page = fields.pageId
        ? await this.findPage(user, c.projectId, fields.pageId)
        : null;
      c.pageId = page?.id ?? null;
      c.pageUrl = page?.url ?? null;
    }
    if (fields.title !== undefined) c.title = fields.title.trim();
    if (fields.body !== undefined) c.body = fields.body.trim();
    if (fields.priority !== undefined) c.priority = fields.priority;
    if (fields.viewport !== undefined) c.viewport = fields.viewport;

    const from = c.status;
    if (status && status !== from) {
      this.assertCanMove(user, from, status);
      this.move(c, status);
    }
    await this.repo.manager.transaction(async (m) => {
      await m.save(c);
      if (status && status !== from)
        await logCorrectionStatus(m, c.id, user.id, from, status);
      // Sent back by the client: the developer's task goes back on their list
      if (status === 'reopened' && from !== 'reopened' && c.taskId)
        await m.update(ProjectTask, c.taskId, {
          completed: false,
          completedAt: null,
        });
    });
    return this.findOne(user, c.id);
  }

  // Puts the correction on the project's task board, optionally in a sprint and assigned to a developer
  async createTask(
    user: Actor,
    id: string,
    dto: CreateCorrectionTaskDto,
  ): Promise<Correction> {
    if (user.role !== 'admin')
      throw new ForbiddenException('Only admins can create tasks');
    const c = await this.load(user, id);
    if (c.taskId)
      throw new BadRequestException('This correction already has a task');
    const m = this.repo.manager;
    if (
      dto.sprintId &&
      !(await m.findOne(ProjectSprint, {
        where: { id: dto.sprintId, projectId: c.projectId },
      }))
    )
      throw new BadRequestException('That sprint is not part of this project');
    if (
      dto.assignedFreelancerId &&
      !(await m.findOne(FreelancerProfile, {
        where: { id: dto.assignedFreelancerId },
      }))
    )
      throw new BadRequestException('That freelancer was not found');

    await m.transaction(async (tx) => {
      const order = await tx.count(ProjectTask, {
        where: { projectId: c.projectId },
      });
      const task = await tx.save(
        tx.create(ProjectTask, {
          projectId: c.projectId,
          title: dto.title?.trim() || `C-${c.number} ${c.title}`,
          sprintId: dto.sprintId ?? null,
          assignedFreelancerId: dto.assignedFreelancerId ?? null,
          order,
        }),
      );
      c.taskId = task.id;
      const from = c.status;
      // A new correction is now picked up
      if (from === 'open') c.status = 'triaged';
      await tx.save(c);
      if (c.status !== from)
        await logCorrectionStatus(tx, c.id, user.id, from, c.status);
    });
    return this.findOne(user, c.id);
  }

  // A team question waits on the client; the client's reply hands it back to the team
  async addComment(
    user: Actor,
    id: string,
    dto: CreateCorrectionCommentDto,
  ): Promise<Correction> {
    const c = await this.load(user, id);
    const isClient = user.role === 'client';
    if (isClient && dto.kind === 'question')
      throw new ForbiddenException('Only the team can ask questions');
    const kind = isClient
      ? c.status === 'needs_info'
        ? 'answer'
        : 'comment'
      : (dto.kind ?? 'comment');
    const visibility =
      isClient || kind === 'question' ? 'client' : (dto.visibility ?? 'client');
    const next: CorrectionStatus | null =
      kind === 'question' && c.status !== 'needs_info'
        ? 'needs_info'
        : kind === 'answer'
          ? 'open'
          : null;

    await this.repo.manager.transaction(async (m) => {
      await m.save(
        m.create(CorrectionComment, {
          correctionId: c.id,
          authorId: user.id,
          kind,
          body: dto.body.trim(),
          visibility,
        }),
      );
      if (next) {
        const from = c.status;
        c.status = next;
        await m.save(c);
        await logCorrectionStatus(m, c.id, user.id, from, next);
      }
    });
    return this.findOne(user, c.id);
  }

  async removeComment(
    user: Actor,
    commentId: string,
  ): Promise<{ deleted: boolean }> {
    const comment = await this.commentsRepo.findOne({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    await this.load(user, comment.correctionId);
    if (comment.kind === 'status')
      throw new ForbiddenException('Status history cannot be deleted');
    if (user.role !== 'admin' && comment.authorId !== user.id)
      throw new ForbiddenException('You can only delete your own comments');
    await this.commentsRepo.remove(comment);
    return { deleted: true };
  }

  async addScreenshot(
    user: Actor,
    id: string,
    file?: Express.Multer.File,
  ): Promise<ProjectDocument> {
    if (!file) throw new BadRequestException('Choose an image to attach');
    if (!IMAGE_TYPES.includes(file.mimetype))
      throw new BadRequestException(
        'Screenshots must be PNG, JPEG, WebP or GIF images',
      );
    const c = await this.load(user, id);
    if (user.role === 'client' && c.createdById !== user.id)
      throw new ForbiddenException(
        'You can only add screenshots to corrections you raised',
      );
    const docs = this.repo.manager.getRepository(ProjectDocument);
    if (
      (await docs.count({ where: { correctionId: c.id } })) >= MAX_SCREENSHOTS
    )
      throw new BadRequestException(
        `A correction can have up to ${MAX_SCREENSHOTS} screenshots`,
      );
    const saved = await docs.save(
      docs.create({
        projectId: c.projectId,
        correctionId: c.id,
        uploadedById: user.id,
        name: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        type: 'attachment',
        status: 'delivered',
        description: null,
        data: file.buffer,
      }),
    );
    const { data: _data, ...meta } = saved;
    return meta as ProjectDocument;
  }

  async remove(user: Actor, id: string): Promise<{ deleted: boolean }> {
    if (user.role !== 'admin')
      throw new ForbiddenException('Only admins can delete corrections');
    const c = await this.load(user, id);
    await this.repo.remove(c);
    return { deleted: true };
  }

  private assertCanMove(
    user: Actor,
    from: CorrectionStatus,
    to: CorrectionStatus,
  ) {
    if (user.role === 'admin') return;
    if (user.role === 'client') {
      if (!CLIENT_MOVES[from]?.includes(to))
        throw new ForbiddenException(
          'You can confirm or reopen a correction once the team marks it fixed',
        );
      return;
    }
    if (ADMIN_ONLY.includes(to))
      throw new ForbiddenException(
        `Only an admin can mark a correction ${STATUS_LABEL[to]}`,
      );
  }

  private move(c: Correction, to: CorrectionStatus) {
    if (to === 'reopened') c.reopenCount += 1;
    c.status = to;
  }

  private async maxNumber(
    m: EntityManager,
    projectId: string,
  ): Promise<number> {
    const row = await m
      .createQueryBuilder(Correction, 'c')
      .select('MAX(c.number)', 'max')
      .where('c.projectId = :projectId', { projectId })
      .getRawOne<{ max: number | null }>();
    return Number(row?.max ?? 0);
  }

  private query(user: Actor) {
    const isClient = user.role === 'client';
    const qb = this.repo.createQueryBuilder('c');
    // Who works on it is the team's business; clients see the correction's status only
    if (!isClient)
      qb.leftJoin('c.task', 'task')
        .addSelect([
          'task.id',
          'task.title',
          'task.completed',
          'task.inProgressAt',
          'task.sprintId',
          'task.assignedFreelancerId',
        ])
        .leftJoin('task.assignedFreelancer', 'assignee')
        .addSelect(['assignee.id'])
        .leftJoin('assignee.user', 'assigneeUser')
        .addSelect(['assigneeUser.id', 'assigneeUser.name']);
    return qb
      .leftJoin('c.page', 'page')
      .addSelect(['page.id', 'page.path', 'page.url', 'page.title'])
      .leftJoin('c.createdBy', 'createdBy')
      .addSelect(['createdBy.id', 'createdBy.name', 'createdBy.role'])
      .leftJoinAndSelect(
        'c.comments',
        'comment',
        isClient ? "comment.visibility = 'client'" : undefined,
      )
      .leftJoin('comment.author', 'author')
      .addSelect(['author.id', 'author.name', 'author.role'])
      .leftJoin('c.screenshots', 'shot')
      .addSelect([
        'shot.id',
        'shot.name',
        'shot.mimeType',
        'shot.size',
        'shot.createdAt',
      ])
      .orderBy('c.number', 'DESC')
      .addOrderBy('comment.createdAt', 'ASC')
      .addOrderBy('shot.createdAt', 'ASC');
  }

  private async load(user: Actor, id: string): Promise<Correction> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Correction not found');
    await this.projectsService.assertAccess(user, c.projectId);
    return c;
  }

  private async findPage(user: Actor, projectId: string, pageId: string) {
    const page = await this.repo.manager
      .getRepository(ProjectPage)
      .findOne({ where: { id: pageId, projectId } });
    if (!page || (user.role === 'client' && page.archived))
      throw new BadRequestException('That page is not part of this project');
    return page;
  }
}
