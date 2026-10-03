import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

describe('ProjectsService approval', () => {
  let projects: any;
  let requests: any;
  let service: ProjectsService;
  const client = { id: 'c1', role: 'client' };

  beforeEach(() => {
    projects = {
      findOne: jest.fn().mockResolvedValue({ id: 'p1', clientId: 'c1', status: 'pending_approval', teamMembers: [] }),
      update: jest.fn(),
    };
    requests = { create: jest.fn((d) => d), save: jest.fn() };
    service = new ProjectsService(projects, {} as any, requests);
  });

  it('completes a project the client approves', async () => {
    await service.approve(client, 'p1');
    expect(projects.update).toHaveBeenCalledWith('p1', { status: 'completed' });
  });

  it('sends a project back with a change request', async () => {
    await service.requestChanges(client, 'p1', 'Fix the footer');
    expect(projects.update).toHaveBeenCalledWith('p1', { status: 'in_progress' });
    expect(requests.save).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1', kind: 'change', fromUserId: 'c1', body: 'Fix the footer' }),
    );
  });

  it('only lets the client approve, and only when awaiting approval', async () => {
    await expect(service.approve({ id: 'a1', role: 'admin' }, 'p1')).rejects.toThrow(ForbiddenException);
    projects.findOne.mockResolvedValue({ id: 'p1', clientId: 'c1', status: 'in_progress', teamMembers: [] });
    await expect(service.approve(client, 'p1')).rejects.toThrow(BadRequestException);
    expect(projects.update).not.toHaveBeenCalled();
  });
});
