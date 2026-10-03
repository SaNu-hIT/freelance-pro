import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ProjectsService } from '../projects/projects.service';

describe('TasksController', () => {
  let service: { update: jest.Mock; isProjectMember: jest.Mock; findByProject: jest.Mock };
  let controller: TasksController;
  let projects: { assertAccess: jest.Mock };
  const req = (role: string) => ({ user: { id: 'u1', role } });

  beforeEach(() => {
    service = { update: jest.fn().mockResolvedValue({}), isProjectMember: jest.fn(), findByProject: jest.fn() };
    projects = { assertAccess: jest.fn().mockResolvedValue({}) };
    controller = new TasksController(service as unknown as TasksService, projects as unknown as ProjectsService);
  });

  it('rejects listing without projectId', async () => {
    await expect(controller.findByProject(undefined as any, req('admin'))).rejects.toThrow(BadRequestException);
  });

  it('checks project access before listing tasks', async () => {
    projects.assertAccess.mockRejectedValue(new ForbiddenException());
    await expect(controller.findByProject('p1', req('client'))).rejects.toThrow(ForbiddenException);
    expect(service.findByProject).not.toHaveBeenCalled();
  });

  it('lets admin update any field', async () => {
    await controller.update('t1', { title: 'New' }, req('admin'));
    expect(service.update).toHaveBeenCalledWith('t1', { title: 'New' });
  });

  it('lets a project freelancer toggle completed only', async () => {
    service.isProjectMember.mockResolvedValue(true);
    await controller.update('t1', { completed: true, title: 'ignored' }, req('freelancer'));
    expect(service.update).toHaveBeenCalledWith('t1', { completed: true });
  });

  it('rejects a project freelancer changing other fields', async () => {
    service.isProjectMember.mockResolvedValue(true);
    await expect(controller.update('t1', { title: 'x' }, req('freelancer'))).rejects.toThrow(BadRequestException);
  });

  it('rejects a freelancer outside the project', async () => {
    service.isProjectMember.mockResolvedValue(false);
    await expect(controller.update('t1', { completed: true }, req('freelancer'))).rejects.toThrow(ForbiddenException);
    expect(service.update).not.toHaveBeenCalled();
  });

  it('rejects clients', async () => {
    await expect(controller.update('t1', { completed: true }, req('client'))).rejects.toThrow(ForbiddenException);
  });
});
