import { ForbiddenException } from '@nestjs/common';
import { FreelancersController } from './freelancers.controller';
import { FreelancersService } from './freelancers.service';

describe('FreelancersController access', () => {
  let service: Record<string, jest.Mock>;
  let controller: FreelancersController;
  const req = (role: string, id = 'u1') => ({ user: { id, role } });

  beforeEach(() => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 'fp1' }),
      findByUserId: jest.fn().mockResolvedValue({ id: 'fp1' }),
      update: jest.fn().mockResolvedValue({}),
      getAvailability: jest.fn().mockResolvedValue({}),
    };
    controller = new FreelancersController(service as unknown as FreelancersService);
  });

  it('does not list freelancers to clients', async () => {
    await expect(controller.findAll(req('client'), {})).rejects.toThrow(ForbiddenException);
  });

  it('shows a profile to admin and its owner only', async () => {
    await expect(controller.findOne('fp1', req('admin'))).resolves.toBeDefined();
    await expect(controller.findOne('fp1', req('freelancer'))).resolves.toBeDefined();
    await expect(controller.findOne('fp2', req('freelancer'))).rejects.toThrow(ForbiddenException);
    await expect(controller.findOne('fp1', req('client'))).rejects.toThrow(ForbiddenException);
    await expect(controller.getAvailability('fp1', req('client'))).rejects.toThrow(ForbiddenException);
  });

  it('ignores review fields a freelancer sends for their own profile', async () => {
    await controller.update('fp1', { bio: 'hi', adminNotes: 'x', verifications: { id: true } } as any, req('freelancer'));
    expect(service.update).toHaveBeenCalledWith('fp1', { bio: 'hi' });
  });
});
