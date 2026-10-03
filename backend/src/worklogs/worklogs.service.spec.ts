import { ForbiddenException } from '@nestjs/common';
import { WorklogsService } from './worklogs.service';

describe('WorklogsService.create', () => {
  const dto = { projectId: 'p1', date: '2026-10-03', hoursWorked: 2, tasksCompleted: 'x', progress: 50 };
  let worklogs: any;
  let projects: any;
  let profiles: any;
  let memberCount: number;
  let service: WorklogsService;

  beforeEach(() => {
    memberCount = 1;
    const qb: any = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(() => Promise.resolve(memberCount)),
    };
    worklogs = { create: jest.fn((d) => d), save: jest.fn((d) => Promise.resolve({ ...d, id: 'w1' })) };
    projects = { createQueryBuilder: jest.fn(() => qb), update: jest.fn() };
    profiles = { findOne: jest.fn().mockResolvedValue({ id: 'fp1' }) };
    service = new WorklogsService(worklogs, projects, profiles);
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'w1' } as any);
  });

  it('saves a log and updates progress for a project member', async () => {
    await service.create(dto as any, 'u1');
    expect(worklogs.save).toHaveBeenCalledWith(expect.objectContaining({ freelancerId: 'fp1' }));
    expect(projects.update).toHaveBeenCalledWith('p1', { progress: 50 });
  });

  it('rejects a project the freelancer is not on, without touching progress', async () => {
    memberCount = 0;
    await expect(service.create(dto as any, 'u1')).rejects.toThrow(ForbiddenException);
    expect(worklogs.save).not.toHaveBeenCalled();
    expect(projects.update).not.toHaveBeenCalled();
  });

  it('rejects a user with no freelancer profile', async () => {
    profiles.findOne.mockResolvedValue(null);
    await expect(service.create(dto as any, 'u1')).rejects.toThrow(ForbiddenException);
    expect(worklogs.save).not.toHaveBeenCalled();
  });
});
