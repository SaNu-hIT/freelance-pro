import { ForbiddenException } from '@nestjs/common';
import { WorklogsController } from './worklogs.controller';
import { WorklogsService } from './worklogs.service';

describe('WorklogsController scoping', () => {
  let service: { findAll: jest.Mock; findOne: jest.Mock };
  let controller: WorklogsController;
  const req = (role: string, id = 'u1') => ({ user: { id, role } });
  const worklog = { id: 'w1', freelancer: { user: { id: 'f1' } }, project: { clientId: 'c1' } };

  beforeEach(() => {
    service = { findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }), findOne: jest.fn().mockResolvedValue(worklog) };
    controller = new WorklogsController(service as unknown as WorklogsService);
  });

  it('limits a client list to their own projects', async () => {
    await controller.findAll(req('client', 'c1'), {});
    expect(service.findAll).toHaveBeenCalledWith(expect.objectContaining({ clientUserId: 'c1' }));
  });

  it('does not scope the admin list', async () => {
    await controller.findAll(req('admin'), {});
    expect(service.findAll.mock.calls[0][0].clientUserId).toBeUndefined();
  });

  it('returns a worklog to its client and freelancer', async () => {
    await expect(controller.findOne('w1', req('client', 'c1'))).resolves.toBe(worklog);
    await expect(controller.findOne('w1', req('freelancer', 'f1'))).resolves.toBe(worklog);
  });

  it('hides a worklog from other clients and freelancers', async () => {
    await expect(controller.findOne('w1', req('client', 'c2'))).rejects.toThrow(ForbiddenException);
    await expect(controller.findOne('w1', req('freelancer', 'f2'))).rejects.toThrow(ForbiddenException);
  });
});
