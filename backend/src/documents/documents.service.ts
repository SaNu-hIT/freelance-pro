import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectDocument } from '../entities/project-document.entity';
import { ProjectsService } from '../projects/projects.service';
import { UpdateDocumentDto, UploadDocumentDto } from './document.dto';

type Actor = { id: string; role: string };
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(ProjectDocument)
    private docsRepo: Repository<ProjectDocument>,
    private projectsService: ProjectsService,
  ) {}

  list(user: Actor, projectId?: string): Promise<ProjectDocument[]> {
    const qb = this.docsRepo
      .createQueryBuilder('doc')
      .innerJoin('doc.project', 'project')
      .addSelect(['project.id', 'project.title'])
      .leftJoin('doc.uploadedBy', 'uploadedBy')
      .addSelect(['uploadedBy.id', 'uploadedBy.name', 'uploadedBy.role'])
      .where('doc.correctionId IS NULL')
      .orderBy('doc.createdAt', 'DESC');
    this.projectsService.scopeToUser(qb, 'project', user);
    if (projectId) qb.andWhere('doc.projectId = :projectId', { projectId });
    return qb.getMany();
  }

  async upload(user: Actor, dto: UploadDocumentDto, file?: Express.Multer.File): Promise<ProjectDocument> {
    if (!file) throw new BadRequestException('file is required');
    await this.projectsService.assertAccess(user, dto.projectId);
    // Clients attach files to their own projects; delivery metadata is set by the team
    const team = user.role !== 'client';
    const saved = await this.docsRepo.save(
      this.docsRepo.create({
        projectId: dto.projectId,
        uploadedById: user.id,
        name: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        type: team ? (dto.type ?? 'deliverable') : 'attachment',
        status: team ? (dto.status ?? 'delivered') : 'delivered',
        description: dto.description ?? null,
        data: file.buffer,
      }),
    );
    const { data: _data, ...meta } = saved;
    return meta as ProjectDocument;
  }

  async download(user: Actor, id: string): Promise<ProjectDocument> {
    const doc = await this.docsRepo
      .createQueryBuilder('doc')
      .addSelect('doc.data')
      .where('doc.id = :id', { id })
      .getOne();
    if (!doc) throw new NotFoundException('Document not found');
    await this.projectsService.assertAccess(user, doc.projectId);
    return doc;
  }

  async update(user: Actor, id: string, dto: UpdateDocumentDto): Promise<ProjectDocument> {
    const doc = await this.findAccessible(user, id);
    if (user.role === 'client') throw new ForbiddenException('Clients cannot edit documents');
    Object.assign(doc, dto);
    return this.docsRepo.save(doc);
  }

  async remove(user: Actor, id: string): Promise<{ deleted: boolean }> {
    const doc = await this.findAccessible(user, id);
    if (user.role !== 'admin' && doc.uploadedById !== user.id) {
      throw new ForbiddenException('Only the uploader or an admin can delete this document');
    }
    await this.docsRepo.delete(id);
    return { deleted: true };
  }

  private async findAccessible(user: Actor, id: string): Promise<ProjectDocument> {
    const doc = await this.docsRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.projectsService.assertAccess(user, doc.projectId);
    return doc;
  }
}
