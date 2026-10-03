import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateWorklogDto } from './dto/worklog.dto';
import { WorklogsService } from './worklogs.service';

describe('WorklogsService.create', () => {
  const dto = { projectId: 'p1', date: new Date().toISOString().slice(0, 10), hoursWorked: 2, tasksCompleted: 'x', progress: 50 };
  let worklogs: any;
  let projects: any;
  let profiles: any;
  let memberCount: number;
  let loggedThatDay: number;
  let service: WorklogsService;

  beforeEach(() => {
    memberCount = 1;
    loggedThatDay = 0;
    const qb: any = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(() => Promise.resolve(memberCount)),
    };
    const sumQb: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(() => Promise.resolve({ total: String(loggedThatDay) })),
    };
    worklogs = {
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve({ ...d, id: 'w1' })),
      createQueryBuilder: jest.fn(() => sumQb),
    };
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

  it('saves the timer session start and end', async () => {
    const session = { startedAt: '2026-10-03T04:00:00.000Z', endedAt: '2026-10-03T06:30:00.000Z' };
    await service.create({ ...dto, ...session } as any, 'u1');
    expect(worklogs.save).toHaveBeenCalledWith(expect.objectContaining(session));
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

  it('rejects hours that push the day past 24', async () => {
    loggedThatDay = 23;
    await expect(service.create(dto as any, 'u1')).rejects.toThrow(BadRequestException);
    expect(worklogs.save).not.toHaveBeenCalled();
  });

  it('rejects a date more than a day in the future', async () => {
    await expect(service.create({ ...dto, date: '2099-01-01' } as any, 'u1')).rejects.toThrow(BadRequestException);
    expect(worklogs.save).not.toHaveBeenCalled();
  });
});

describe('CreateWorklogDto', () => {
  it('requires a task summary', async () => {
    const errors = await validate(plainToInstance(CreateWorklogDto, {
      projectId: '12cce3da-4be1-4c0b-aeab-6c14e3e442ab', date: '2026-10-03', hoursWorked: 1, tasksCompleted: '', progress: 0,
    }));
    expect(errors.map((e) => e.property)).toEqual(['tasksCompleted']);
  });

  it('accepts ISO session times and rejects anything else', async () => {
    const base = { projectId: '12cce3da-4be1-4c0b-aeab-6c14e3e442ab', date: '2026-10-03', hoursWorked: 1, tasksCompleted: 'x', progress: 0 };
    expect(await validate(plainToInstance(CreateWorklogDto, { ...base, startedAt: '2026-10-03T04:00:00.000Z', endedAt: '2026-10-03T05:00:00.000Z' }))).toEqual([]);
    const errors = await validate(plainToInstance(CreateWorklogDto, { ...base, startedAt: 'soon' }));
    expect(errors.map((e) => e.property)).toEqual(['startedAt']);
  });
});
