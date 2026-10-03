// Regression: ISSUE-037 - worklogs accepted timer sessions that contradict the log
//             ISSUE-038 - a log on a project with no tasks reset its progress to 0
// Found by /qa on 2026-10-04
// Report: .gstack/qa-reports/run-20261003T230404Z-functional/qa-report-freelancepro-api-2026-10-04.md
import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateWorklogDto } from './dto/worklog.dto';
import { WorklogsService } from './worklogs.service';

describe('WorklogsService.create timer session (ISSUE-037)', () => {
  const date = new Date().toISOString().slice(0, 10);
  const at = (time: string) => `${date}T${time}.000Z`;
  const dto = { projectId: 'p1', date, hoursWorked: 1.5, tasksCompleted: 'x', progress: 50 };
  let worklogs: any;
  let projects: any;
  let service: WorklogsService;

  beforeEach(() => {
    const qb: any = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
    };
    const sumQb: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
    };
    worklogs = {
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve({ ...d, id: 'w1' })),
      createQueryBuilder: jest.fn(() => sumQb),
    };
    projects = { createQueryBuilder: jest.fn(() => qb), update: jest.fn() };
    const profiles: any = { findOne: jest.fn().mockResolvedValue({ id: 'fp1' }) };
    service = new WorklogsService(worklogs, projects, profiles);
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'w1' } as any);
  });

  const rejects = async (session: object, hours = dto.hoursWorked) => {
    await expect(service.create({ ...dto, hoursWorked: hours, ...session } as any, 'u1')).rejects.toThrow(BadRequestException);
    expect(worklogs.save).not.toHaveBeenCalled();
  };

  it('accepts a 1h37m session logged as 1.5h', async () => {
    await service.create({ ...dto, startedAt: at('10:00:00'), endedAt: at('11:37:00') } as any, 'u1');
    expect(worklogs.save).toHaveBeenCalled();
  });

  it('accepts a short session logged at the 0.25h minimum', async () => {
    await service.create({ ...dto, hoursWorked: 0.25, startedAt: at('10:00:00'), endedAt: at('10:01:00') } as any, 'u1');
    expect(worklogs.save).toHaveBeenCalled();
  });

  it('accepts fewer hours than the session lasted', async () => {
    await service.create({ ...dto, hoursWorked: 1, startedAt: at('10:00:00'), endedAt: at('12:00:00') } as any, 'u1');
    expect(worklogs.save).toHaveBeenCalled();
  });

  it('rejects an end before the start', () => rejects({ startedAt: at('12:00:00'), endedAt: at('11:00:00') }));

  it('rejects a start without an end', () => rejects({ startedAt: at('10:00:00') }));

  it('rejects 6 hours claimed for a 10 minute session', () =>
    rejects({ startedAt: at('10:00:00'), endedAt: at('10:10:00') }, 6));

  it('rejects a session days away from the log date', () => {
    const old = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    return expect(
      service.create({ ...dto, date: old, startedAt: at('10:00:00'), endedAt: at('11:30:00') } as any, 'u1'),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('Worklog progress on a project with no tasks (ISSUE-038)', () => {
  it('lets the log leave progress out', async () => {
    const dto = plainToInstance(CreateWorklogDto, {
      projectId: '22ce481a-f2c7-4fb2-a2e7-04a319f7d9a8', date: '2026-10-04', hoursWorked: 1, tasksCompleted: 'x',
    });
    expect(await validate(dto)).toEqual([]);
  });

  it('does not touch project progress when it is left out', async () => {
    const qb: any = { innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getCount: jest.fn().mockResolvedValue(1) };
    const sumQb: any = { select: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getRawOne: jest.fn().mockResolvedValue({ total: '0' }) };
    const worklogs: any = { create: jest.fn((d) => d), save: jest.fn((d) => Promise.resolve({ ...d, id: 'w1' })), createQueryBuilder: jest.fn(() => sumQb) };
    const projects: any = { createQueryBuilder: jest.fn(() => qb), update: jest.fn() };
    const service = new WorklogsService(worklogs, projects, { findOne: jest.fn().mockResolvedValue({ id: 'fp1' }) } as any);
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'w1' } as any);
    await service.create({ projectId: 'p1', date: new Date().toISOString().slice(0, 10), hoursWorked: 1, tasksCompleted: 'x' } as any, 'u1');
    expect(projects.update).not.toHaveBeenCalled();
  });
});
