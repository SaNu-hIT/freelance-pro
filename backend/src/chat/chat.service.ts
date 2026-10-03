import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ChatMessage } from '../entities/chat-message.entity';
import { User } from '../entities/user.entity';
import { ProjectsService } from '../projects/projects.service';

type Actor = { id: string; role: string };

// Chat is a channel between a project's client and the admins
@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private repo: Repository<ChatMessage>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private projectsService: ProjectsService,
  ) {}

  async getMessages(user: Actor, projectId?: string): Promise<ChatMessage[]> {
    await this.assertChatAccess(user, projectId);
    const qb = this.repo.createQueryBuilder('m').orderBy('m.ts', 'ASC');
    this.scope(qb, user, projectId);
    return qb.getMany();
  }

  async send(user: Actor, projectId: string, text: string): Promise<ChatMessage> {
    const project = await this.assertChatAccess(user, projectId);
    const sender = await this.usersRepo.findOne({ where: { id: user.id } });
    const from = user.role === 'admin' ? 'admin' : 'client';
    const msg = this.repo.create({
      projectId,
      projectTitle: project!.title,
      from,
      sender: sender?.name ?? user.role,
      senderId: user.id,
      text,
      // The sender has obviously read their own message
      readByAdmin: from === 'admin',
      readByClient: from === 'client',
    });
    return this.repo.save(msg);
  }

  async markRead(user: Actor, projectId: string): Promise<void> {
    await this.assertChatAccess(user, projectId);
    if (user.role === 'admin') {
      await this.repo.update({ projectId, from: 'client', readByAdmin: false }, { readByAdmin: true });
    } else {
      await this.repo.update({ projectId, from: 'admin', readByClient: false }, { readByClient: true });
    }
  }

  async unreadCount(user: Actor, projectId?: string): Promise<number> {
    await this.assertChatAccess(user, projectId);
    const qb = this.repo.createQueryBuilder('m');
    this.scope(qb, user, projectId);
    if (user.role === 'admin') {
      qb.andWhere('m.from = :from', { from: 'client' }).andWhere('m.readByAdmin = false');
    } else {
      qb.andWhere('m.from = :from', { from: 'admin' }).andWhere('m.readByClient = false');
    }
    return qb.getCount();
  }

  private async assertChatAccess(user: Actor, projectId?: string) {
    if (user.role !== 'admin' && user.role !== 'client') {
      throw new ForbiddenException('Chat is between clients and admins');
    }
    return projectId ? this.projectsService.assertAccess(user, projectId) : undefined;
  }

  private scope(qb: SelectQueryBuilder<ChatMessage>, user: Actor, projectId?: string) {
    if (projectId) qb.andWhere('m.projectId = :projectId', { projectId });
    if (user.role === 'client') {
      qb.andWhere(
        'm.projectId IN (SELECT p.id::text FROM projects p WHERE p."clientId" = :chatClientId)',
        { chatClientId: user.id },
      );
    }
  }
}
