import { BadRequestException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ProjectsService } from '../projects/projects.service';

describe('Task in-progress status', () => {
  let repo: any;
  let service: TasksService;
  let task: any;

  beforeEach(() => {
    task = { id: 't1', completed: false, completedAt: null, inProgressAt: null, startedAt: null, startedById: null };
    repo = {
      findOne: jest.fn(() => Promise.resolve(task)),
      save: jest.fn((t) => Promise.resolve(t)),
      update: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      manager: { findOne: jest.fn().mockResolvedValue({ id: 'fp1' }), find: jest.fn().mockResolvedValue([]) },
    };
    service = new TasksService(repo);
  });

  it('starting the timer marks the task in progress, and it stays after the timer stops', async () => {
    const saved = await service.start('t1', 'u1');
    expect(saved.inProgressAt).toBeInstanceOf(Date);
    await service.stop('u1');
    expect(repo.update).toHaveBeenLastCalledWith({ startedById: 'fp1' }, { startedAt: null, startedById: null });
  });

  it('keeps the first in-progress time when the timer restarts', async () => {
    const first = new Date('2026-10-01T09:00:00Z');
    task.inProgressAt = first;
    const saved = await service.start('t1', 'u1');
    expect(saved.inProgressAt).toBe(first);
  });

  it('marks in progress by hand, reopening a done task', async () => {
    task.completed = true;
    task.completedAt = new Date();
    const saved = await service.update('t1', { inProgress: true });
    expect(saved.inProgressAt).toBeInstanceOf(Date);
    expect(saved.completed).toBe(false);
    expect(saved.completedAt).toBeNull();
    expect(saved).not.toHaveProperty('inProgress');
  });

  it('moving back to to-do or completing clears in progress', async () => {
    task.inProgressAt = new Date();
    expect((await service.update('t1', { inProgress: false })).inProgressAt).toBeNull();
    task.inProgressAt = new Date();
    expect((await service.update('t1', { completed: true })).inProgressAt).toBeNull();
  });

  it('admins see every in-progress task, freelancers ones assigned to or started by them', async () => {
    await service.inProgress({ id: 'a1', role: 'admin' });
    expect(Array.isArray(repo.find.mock.calls[0][0].where)).toBe(false);
    await service.inProgress({ id: 'u1', role: 'freelancer' });
    const where = repo.find.mock.calls[1][0].where;
    expect(where.map((w: any) => [w.assignedFreelancerId, w.startedById])).toEqual([['fp1', undefined], [undefined, 'fp1']]);
  });

  describe('controller', () => {
    const svc = { update: jest.fn(), isProjectMember: jest.fn().mockResolvedValue(true) };
    const controller = new TasksController(svc as unknown as TasksService, {} as ProjectsService);
    const freelancer = { user: { id: 'u1', role: 'freelancer' } };

    it('lets a project freelancer change only completed or inProgress', async () => {
      await controller.update('t1', { inProgress: true, title: 'renamed' }, freelancer);
      expect(svc.update).toHaveBeenCalledWith('t1', { completed: undefined, inProgress: true }, 'u1');
      await expect(controller.update('t1', { title: 'renamed' }, freelancer)).rejects.toThrow(BadRequestException);
    });

    it('limits in-progress listing to admins and freelancers', () => {
      expect(Reflect.getMetadata(ROLES_KEY, TasksController.prototype.inProgress)).toEqual(['admin', 'freelancer']);
    });
  });
});

describe('Task start time', () => {
  let task: any;
  let service: TasksService;
  beforeEach(() => {
    task = { id: 't1', completed: false, inProgressAt: null, startedAt: null, startedById: null };
    service = new TasksService({
      findOne: jest.fn(() => Promise.resolve(task)),
      save: jest.fn((t) => Promise.resolve(t)),
      update: jest.fn(),
      manager: { findOne: jest.fn().mockResolvedValue({ id: 'fp1' }), find: jest.fn().mockResolvedValue([]) },
    } as any);
  });

  it('keeps the session start sent by the client', async () => {
    const start = new Date(Date.now() - 90 * 60000).toISOString();
    expect((await service.start('t1', 'u1', start)).startedAt!.toISOString()).toBe(start);
  });

  it('ignores a start in the future or older than 8 hours', async () => {
    for (const bad of [new Date(Date.now() + 60000).toISOString(), new Date(Date.now() - 9 * 3600000).toISOString(), 'nonsense']) {
      const at = (await service.start('t1', 'u1', bad)).startedAt!.getTime();
      expect(Math.abs(at - Date.now())).toBeLessThan(5000);
    }
  });
});
