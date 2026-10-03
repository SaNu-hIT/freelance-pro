import { ForbiddenException } from '@nestjs/common';
import { ProjectRequestsService } from './project-requests.service';

describe('ProjectRequestsService', () => {
  let repo: any;
  let projects: any;
  let service: ProjectRequestsService;
  const dto = { projectId: 'p1', subject: 's', body: 'b' };

  beforeEach(() => {
    repo = {
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve(d)),
      findOne: jest.fn(),
    };
    projects = { assertAccess: jest.fn().mockResolvedValue({}) };
    service = new ProjectRequestsService(repo, projects);
  });

  it.each([
    ['freelancer', 'question'],
    ['admin', 'question'],
    ['client', 'change'],
    ['client', 'escalation'],
  ])('lets a %s open a %s', async (role, kind) => {
    await service.create({ id: 'u1', role }, { ...dto, kind } as any);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ kind, fromUserId: 'u1' }));
  });

  it.each([
    ['client', 'question'],
    ['freelancer', 'escalation'],
  ])('stops a %s opening a %s', async (role, kind) => {
    await expect(service.create({ id: 'u1', role }, { ...dto, kind } as any)).rejects.toThrow(ForbiddenException);
  });

  it('checks project access before opening', async () => {
    projects.assertAccess.mockRejectedValue(new ForbiddenException());
    await expect(service.create({ id: 'u1', role: 'client' }, { ...dto, kind: 'change' } as any)).rejects.toThrow(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('lets the client answer a question, not an escalation', async () => {
    repo.findOne.mockResolvedValue({ id: 'r1', projectId: 'p1', kind: 'question' });
    const done = await service.resolve({ id: 'c1', role: 'client' }, 'r1', 'Use test keys');
    expect(done).toMatchObject({ status: 'resolved', reply: 'Use test keys', resolvedById: 'c1' });

    repo.findOne.mockResolvedValue({ id: 'r2', projectId: 'p1', kind: 'escalation' });
    await expect(service.resolve({ id: 'c1', role: 'client' }, 'r2')).rejects.toThrow(ForbiddenException);
  });
});
