import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPage } from '../entities/project-page.entity';
import { PageNote } from '../entities/page-note.entity';
import { User } from '../entities/user.entity';
import { ProjectsService } from '../projects/projects.service';
import {
  DiscoveryService,
  normalizePageUrl,
  typedAddress,
} from './discovery.service';
import { CreatePageDto, CreatePageNoteDto, UpdatePageDto } from './page.dto';

type Actor = { id: string; role: string };
const TEAM = ['admin', 'freelancer'];

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(ProjectPage) private pagesRepo: Repository<ProjectPage>,
    @InjectRepository(PageNote) private notesRepo: Repository<PageNote>,
    private projectsService: ProjectsService,
    private discovery: DiscoveryService,
  ) {}

  // Pages with their notes. Clients see live pages and client-visible notes only.
  async list(user: Actor, projectId: string): Promise<ProjectPage[]> {
    await this.projectsService.assertAccess(user, projectId);
    const isClient = user.role === 'client';
    const qb = this.pagesRepo
      .createQueryBuilder('page')
      .leftJoinAndSelect(
        'page.notes',
        'note',
        isClient ? "note.visibility = 'client'" : undefined,
      )
      .leftJoin('note.author', 'author')
      .addSelect(['author.id', 'author.name', 'author.role'])
      .where('page.projectId = :projectId', { projectId })
      .orderBy('page.path', 'ASC')
      .addOrderBy('note.createdAt', 'ASC');
    if (isClient) qb.andWhere('page.archived = false');
    return qb.getMany();
  }

  async create(user: Actor, dto: CreatePageDto): Promise<ProjectPage> {
    this.assertTeam(user);
    const project = await this.projectsService.assertAccess(
      user,
      dto.projectId,
    );
    const typed = typedAddress(dto.url);
    const isPath = typed.startsWith('/');
    if (isPath && !project.liveUrl)
      throw new BadRequestException(
        'Enter the full website address first, like https://example.com',
      );
    const url = normalizePageUrl(typed, isPath ? project.liveUrl : undefined);
    if (!url)
      throw new BadRequestException(
        'Enter a web address like https://example.com/about or a path like /about.',
      );
    const existing = await this.pagesRepo.findOne({
      where: { projectId: dto.projectId, url: url.toString() },
    });
    if (existing)
      throw new ConflictException(`${url.pathname} is already in the list.`);
    const page = await this.pagesRepo.save(
      this.pagesRepo.create({
        projectId: dto.projectId,
        url: url.toString(),
        path: url.pathname,
        title: dto.title?.trim() || null,
        source: 'manual',
      }),
    );
    return { ...page, notes: [] };
  }

  async update(
    user: Actor,
    id: string,
    dto: UpdatePageDto,
  ): Promise<ProjectPage> {
    this.assertTeam(user);
    const page = await this.findPage(user, id);
    if (dto.title !== undefined) page.title = dto.title.trim() || null;
    if (dto.archived !== undefined) page.archived = dto.archived;
    return this.pagesRepo.save(page);
  }

  async remove(user: Actor, id: string): Promise<{ deleted: boolean }> {
    if (user.role !== 'admin')
      throw new ForbiddenException('Only admins can delete pages');
    const page = await this.findPage(user, id);
    await this.pagesRepo.remove(page);
    return { deleted: true };
  }

  // Reads the site (the given address, else the live URL) and adds pages not yet listed; pages already listed are marked as seen.
  // A project without a live URL takes the discovered site's address as its live URL.
  async discover(
    user: Actor,
    projectId: string,
    address?: string,
  ): Promise<{ found: number; added: number; site: string }> {
    if (user.role !== 'admin')
      throw new ForbiddenException('Only admins can discover pages');
    const project = await this.projectsService.assertAccess(user, projectId);
    const typed = address?.trim() ? typedAddress(address) : null;
    const start = typed
      ? normalizePageUrl(
          typed,
          typed.startsWith('/') ? (project.liveUrl ?? undefined) : undefined,
        )
      : project.liveUrl;
    if (!start)
      throw new BadRequestException(
        'Enter the website address to read, like https://example.com',
      );
    const found = await this.discovery.discover(start.toString());
    const site = new URL(start.toString()).origin;
    if (!project.liveUrl)
      await this.projectsService.update(projectId, { liveUrl: site });
    const existing = new Map(
      (await this.pagesRepo.find({ where: { projectId } })).map((p) => [
        p.url,
        p,
      ]),
    );
    const now = new Date();
    const toSave: ProjectPage[] = [];
    let added = 0;
    for (const f of found) {
      const page = existing.get(f.url);
      if (page) {
        page.lastSeenAt = now;
        if (!page.title && f.title) page.title = f.title;
        toSave.push(page);
      } else {
        added++;
        toSave.push(
          this.pagesRepo.create({
            projectId,
            url: f.url,
            path: f.path,
            title: f.title,
            source: f.source,
            lastSeenAt: now,
          }),
        );
      }
    }
    await this.pagesRepo.save(toSave);
    return { found: found.length, added, site: project.liveUrl ?? site };
  }

  // The team writes either kind of note; a client's note is always visible to the client
  async addNote(
    user: Actor,
    pageId: string,
    dto: CreatePageNoteDto,
  ): Promise<PageNote> {
    const page = await this.findPage(user, pageId);
    if (user.role === 'client' && page.archived)
      throw new NotFoundException('Page not found');
    const visibility =
      user.role === 'client' ? 'client' : (dto.visibility ?? 'internal');
    const note = await this.notesRepo.save(
      this.notesRepo.create({
        pageId,
        authorId: user.id,
        body: dto.body.trim(),
        visibility,
      }),
    );
    const author = await this.notesRepo.manager.findOne(User, {
      where: { id: user.id },
      select: { id: true, name: true, role: true },
    });
    return { ...note, author };
  }

  async removeNote(user: Actor, noteId: string): Promise<{ deleted: boolean }> {
    const note = await this.notesRepo.findOne({
      where: { id: noteId },
      relations: { page: true },
    });
    if (!note) throw new NotFoundException('Note not found');
    await this.projectsService.assertAccess(user, note.page.projectId);
    if (user.role !== 'admin' && note.authorId !== user.id)
      throw new ForbiddenException('You can only delete your own notes');
    await this.notesRepo.remove(note);
    return { deleted: true };
  }

  private async findPage(user: Actor, id: string): Promise<ProjectPage> {
    const page = await this.pagesRepo.findOne({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');
    await this.projectsService.assertAccess(user, page.projectId);
    return page;
  }

  private assertTeam(user: Actor) {
    if (!TEAM.includes(user.role))
      throw new ForbiddenException('Only the project team can change pages');
  }
}
