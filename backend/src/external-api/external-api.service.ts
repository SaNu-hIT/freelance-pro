import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectTask } from '../entities/project-task.entity';
import { CreateExternalTaskDto } from './external-task.dto';

export type ExternalProject = {
  id: string;
  name: string;
  client_name: string | null;
  client_phones: string[];
};

export type ExternalTask = {
  id: string;
  url: string;
  project_id: string;
  title: string;
  message_id: string | null;
};

// Accounts store phones as typed ("+971 50 123 4567"); matching needs digits with the leading +
export const comparablePhone = (phone: string | null | undefined): string[] => {
  const digits = (phone ?? '').replace(/[^\d+]/g, '').replace(/^00/, '+');
  return digits.replace(/\+/g, '').length >= 6 ? [digits] : [];
};

@Injectable()
export class ExternalApiService {
  constructor(
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(ProjectTask) private tasks: Repository<ProjectTask>,
    private config: ConfigService,
  ) {}

  async listProjects(): Promise<ExternalProject[]> {
    const rows = await this.projects.find({
      relations: { client: true },
      order: { title: 'ASC' },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.title,
      client_name: p.client?.name ?? null,
      client_phones: comparablePhone(p.client?.phone),
    }));
  }

  async findByMessageId(messageId: string): Promise<ExternalTask | null> {
    const task = await this.tasks.findOne({ where: { messageId } });
    return task ? this.present(task) : null;
  }

  // created is false when this message_id was already filed, and the existing task comes back
  async create(
    projectId: string,
    dto: CreateExternalTaskDto,
  ): Promise<{ task: ExternalTask; created: boolean }> {
    if (!(await this.projects.exists({ where: { id: projectId } }))) {
      throw new NotFoundException('Project not found');
    }
    const existing = await this.findByMessageId(dto.message_id);
    if (existing) return { task: existing, created: false };

    const last = await this.tasks.maximum('order', { projectId });
    try {
      const saved = await this.tasks.save(
        this.tasks.create({
          projectId,
          title: dto.title.trim(),
          order: (last ?? -1) + 1,
          description: dto.description ?? null,
          type: dto.type ?? 'other',
          priority: dto.priority ?? 'normal',
          source: dto.source ?? 'whatsapp',
          customerName: dto.customer_name ?? null,
          customerPhone: dto.customer_phone ?? null,
          originalMessage: dto.original_message ?? null,
          messageId: dto.message_id,
          receivedAt: dto.received_at ? new Date(dto.received_at) : null,
          attachments: dto.attachments ?? null,
        }),
      );
      return { task: this.present(saved), created: true };
    } catch (err) {
      // Two deliveries of one message raced past the check; the unique index let only one in
      if ((err as { code?: string }).code === '23505') {
        const winner = await this.findByMessageId(dto.message_id);
        if (winner) return { task: winner, created: false };
      }
      throw err;
    }
  }

  private present(task: ProjectTask): ExternalTask {
    const appUrl = (
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
    return {
      id: task.id,
      url: `${appUrl}/admin/projects/${task.projectId}`,
      project_id: task.projectId,
      title: task.title,
      message_id: task.messageId,
    };
  }
}
