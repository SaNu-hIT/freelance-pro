import { BadRequestException } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('choosing a project client', () => {
  const dto = { title: 't', description: 'd', budget: 1, deadline: '2027-01-01' };
  let projects: any;
  let users: any;
  let service: ProjectsService;
  let controller: ProjectsController;

  beforeEach(() => {
    projects = {
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve({ ...d, id: 'p1' })),
    };
    users = { count: jest.fn().mockResolvedValue(1) };
    service = new ProjectsService(projects, {} as any, {} as any, users);
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'p1', clientId: 'c-old', client: { id: 'c-old' } } as any);
    controller = new ProjectsController(service);
  });

  it('creates an admin project for the chosen client', async () => {
    await controller.create({ ...dto, clientId: 'c1' } as any, { user: { id: 'a1', role: 'admin' } });
    expect(users.count).toHaveBeenCalledWith({ where: { id: 'c1', role: 'client' } });
    expect(projects.save).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'c1' }));
  });

  it('requires an admin to choose a client', async () => {
    await expect(controller.create(dto as any, { user: { id: 'a1', role: 'admin' } })).rejects.toThrow(BadRequestException);
  });

  it('rejects a client id that is not a client account', async () => {
    users.count.mockResolvedValue(0);
    await expect(controller.create({ ...dto, clientId: 'f1' } as any, { user: { id: 'a1', role: 'admin' } })).rejects.toThrow(BadRequestException);
    expect(projects.save).not.toHaveBeenCalled();
  });

  it('keeps a client as owner of their own project whatever clientId they send', async () => {
    await controller.create({ ...dto, clientId: 'someone-else' } as any, { user: { id: 'c1', role: 'client' } });
    expect(users.count).toHaveBeenCalledWith({ where: { id: 'c1', role: 'client' } });
    expect(projects.save).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'c1' }));
  });

  it('lets an admin move a project to another client', async () => {
    await service.update('p1', { clientId: 'c2' } as any);
    const saved = projects.save.mock.calls[0][0];
    expect(saved.clientId).toBe('c2');
    expect(saved.client).toBeUndefined();
  });
});
