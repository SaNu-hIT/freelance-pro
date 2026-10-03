import { ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';

describe('ChatService access', () => {
  let repo: any;
  let users: any;
  let projects: any;
  let service: ChatService;
  let qb: any;

  beforeEach(() => {
    qb = { orderBy: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([]) };
    repo = { createQueryBuilder: jest.fn(() => qb), create: jest.fn((d) => d), save: jest.fn((d) => Promise.resolve(d)) };
    users = { findOne: jest.fn().mockResolvedValue({ name: 'Acme Corp' }) };
    projects = { assertAccess: jest.fn().mockResolvedValue({ title: 'Shop' }) };
    service = new ChatService(repo, users, projects);
  });

  it('keeps freelancers out of the client channel', async () => {
    await expect(service.getMessages({ id: 'f1', role: 'freelancer' })).rejects.toThrow(ForbiddenException);
  });

  it('checks project access before reading a thread', async () => {
    projects.assertAccess.mockRejectedValue(new ForbiddenException());
    await expect(service.getMessages({ id: 'c2', role: 'client' }, 'p1')).rejects.toThrow(ForbiddenException);
  });

  it('limits a client inbox to their own projects', async () => {
    await service.getMessages({ id: 'c1', role: 'client' });
    expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('"clientId"'), { chatClientId: 'c1' });
  });

  it('takes the sender and side from the signed-in user', async () => {
    const msg = await service.send({ id: 'c1', role: 'client' }, 'p1', 'hi');
    expect(msg).toMatchObject({ from: 'client', sender: 'Acme Corp', senderId: 'c1', projectTitle: 'Shop', readByClient: true, readByAdmin: false });
  });
});
