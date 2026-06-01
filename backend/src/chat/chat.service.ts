import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '../entities/chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private repo: Repository<ChatMessage>,
  ) {}

  async getMessages(projectId?: string): Promise<ChatMessage[]> {
    const qb = this.repo.createQueryBuilder('m').orderBy('m.ts', 'ASC');
    if (projectId) qb.where('m.projectId = :projectId', { projectId });
    return qb.getMany();
  }

  async send(data: {
    projectId: string;
    projectTitle: string;
    from: 'client' | 'admin';
    sender: string;
    senderId: string;
    text: string;
    readByAdmin?: boolean;
    readByClient?: boolean;
  }): Promise<ChatMessage> {
    const msg = this.repo.create({
      ...data,
      readByAdmin: data.readByAdmin ?? false,
      readByClient: data.readByClient ?? false,
    });
    return this.repo.save(msg);
  }

  async markReadByAdmin(projectId: string): Promise<void> {
    await this.repo.update(
      { projectId, from: 'client', readByAdmin: false },
      { readByAdmin: true },
    );
  }

  async markReadByClient(projectId: string): Promise<void> {
    await this.repo.update(
      { projectId, from: 'admin', readByClient: false },
      { readByClient: true },
    );
  }

  async unreadCountForAdmin(projectId?: string): Promise<number> {
    const qb = this.repo.createQueryBuilder('m')
      .where('m.from = :from', { from: 'client' })
      .andWhere('m.readByAdmin = false');
    if (projectId) qb.andWhere('m.projectId = :projectId', { projectId });
    return qb.getCount();
  }

  async unreadCountForClient(projectId?: string): Promise<number> {
    const qb = this.repo.createQueryBuilder('m')
      .where('m.from = :from', { from: 'admin' })
      .andWhere('m.readByClient = false');
    if (projectId) qb.andWhere('m.projectId = :projectId', { projectId });
    return qb.getCount();
  }
}
