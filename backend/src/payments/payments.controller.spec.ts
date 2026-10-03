import { ForbiddenException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController scoping', () => {
  let service: { findAll: jest.Mock };
  let controller: PaymentsController;
  const req = (role: string, id = 'u1') => ({ user: { id, role } });

  beforeEach(() => {
    service = { findAll: jest.fn().mockResolvedValue([]) };
    controller = new PaymentsController(service as unknown as PaymentsService);
  });

  it('limits a freelancer to payments made to their own profile', async () => {
    await controller.findAll(req('freelancer', 'f1'), {});
    expect(service.findAll).toHaveBeenCalledWith(expect.objectContaining({ freelancerUserId: 'f1' }));
    expect(service.findAll.mock.calls[0][0].freelancerId).toBeUndefined();
  });

  it('refuses clients, since payments are freelancer payouts', async () => {
    await expect(controller.findAll(req('client', 'c1'), {})).rejects.toThrow(ForbiddenException);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('does not scope the admin list', async () => {
    await controller.findAll(req('admin'), {});
    const filters = service.findAll.mock.calls[0][0];
    expect(filters.freelancerUserId).toBeUndefined();
    expect(filters.clientUserId).toBeUndefined();
  });
});
