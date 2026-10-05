import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ProjectsService } from '../projects/projects.service';

describe('Task timer (in progress)', () => {
  let repo: any;
  let manager: any;
  let service: TasksService;
  let task: any;

  beforeEach(() => {
    task = { id: 't1', completed: false, startedAt: null, startedById: null };
    manager = { findOne: jest.fn().mockResolvedValue({ id: 'fp1' }), find: jest.fn().mockResolvedValue([]) };
    repo = {
      findOne: jest.fn(() => Promise.resolve(task)),
      save: jest.fn((t) => Promise.resolve(t)),
      update: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      manager,
    };
    service = new TasksService(repo);
  });

  it('starts a task for the freelancer and stops their previous one', async () => {
    const saved = await service.start('t1', 'u1');
    expect(repo.update).toHaveBeenCalledWith({ startedById: 'fp1' }, { startedAt: null, startedById: null });
    expect(saved.startedById).toBe('fp1');
    expect(saved.startedAt).toBeInstanceOf(Date);
  });

  it('refuses to start a finished task', async () => {
    task.completed = true;
    await expect(service.start('t1', 'u1')).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('refuses a user with no freelancer profile', async () => {
    manager.findOne.mockResolvedValue(null);
    await expect(service.start('t1', 'u1')).rejects.toThrow(ForbiddenException);
  });

  it('stop clears every running task of that freelancer', async () => {
    await service.stop('u1');
    expect(repo.update).toHaveBeenCalledWith({ startedById: 'fp1' }, { startedAt: null, startedById: null });
  });

  it('completing a task clears its timer', async () => {
    task.startedAt = new Date();
    task.startedById = 'fp1';
    const saved = await service.update('t1', { completed: true });
    expect(saved.startedAt).toBeNull();
    expect(saved.startedById).toBeNull();
  });

  it('admins see every running task, freelancers only their own', async () => {
    await service.running({ id: 'a1', role: 'admin' });
    expect(repo.find.mock.calls[0][0].where.startedById).toBeUndefined();
    await service.running({ id: 'u1', role: 'freelancer' });
    expect(repo.find.mock.calls[1][0].where.startedById).toBe('fp1');
  });

  describe('controller', () => {
    const svc = { start: jest.fn(), isProjectMember: jest.fn() };
    const controller = new TasksController(svc as unknown as TasksService, {} as ProjectsService);

    it('only lets project members start a task', async () => {
      svc.isProjectMember.mockResolvedValue(false);
      await expect(controller.start('t1', { user: { id: 'u1', role: 'freelancer' } })).rejects.toThrow(ForbiddenException);
      expect(svc.start).not.toHaveBeenCalled();
    });

    it('limits start/stop to freelancers and running to admins and freelancers', () => {
      const roles = (m: string) => Reflect.getMetadata(ROLES_KEY, (TasksController.prototype as any)[m]);
      expect(roles('start')).toEqual(['freelancer']);
      expect(roles('stop')).toEqual(['freelancer']);
      expect(roles('running')).toEqual(['admin', 'freelancer']);
    });
  });
});
