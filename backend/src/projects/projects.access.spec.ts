import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

describe('ProjectsService.assertAccess', () => {
  const project = { id: 'p1', clientId: 'c1', teamMembers: [{ userId: 'f1' }] };
  let repo: { findOne: jest.Mock };
  let service: ProjectsService;

  beforeEach(() => {
    repo = { findOne: jest.fn().mockResolvedValue(project) };
    service = new ProjectsService(repo as any, {} as any, {} as any);
  });

  it.each([
    ['admin', 'a1'],
    ['client', 'c1'],
    ['freelancer', 'f1'],
  ])('lets %s %s in', async (role, id) => {
    await expect(service.assertAccess({ id, role }, 'p1')).resolves.toBe(project);
  });

  it.each([
    ['client', 'c2'],
    ['freelancer', 'f2'],
  ])('keeps %s %s out', async (role, id) => {
    await expect(service.assertAccess({ id, role }, 'p1')).rejects.toThrow(ForbiddenException);
  });

  it('404s an unknown project', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.assertAccess({ id: 'a1', role: 'admin' }, 'nope')).rejects.toThrow(NotFoundException);
  });
});
