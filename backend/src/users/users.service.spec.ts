import { BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let users: any;
  let projects: any;
  let service: UsersService;
  let stored: any;

  beforeEach(async () => {
    stored = { id: 'u1', role: 'admin', password: await bcrypt.hash('oldpass12', 4) };
    const qb: any = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(() => Promise.resolve(stored)),
    };
    users = {
      createQueryBuilder: jest.fn(() => qb),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(2),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]),
    };
    projects = {
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ clientId: 'c1', count: '3' }]),
      })),
    };
    service = new UsersService(users, projects);
  });

  it('lists users with their project counts', async () => {
    expect(await service.list('client')).toEqual([
      { id: 'c1', projectCount: 3 },
      { id: 'c2', projectCount: 0 },
    ]);
  });

  it('changes the password only with the current one', async () => {
    await expect(service.changePassword('u1', 'wrong', 'newpass12')).rejects.toThrow(BadRequestException);
    expect(users.update).not.toHaveBeenCalled();
    await service.changePassword('u1', 'oldpass12', 'newpass12');
    const saved = users.update.mock.calls[0][1].password;
    expect(await bcrypt.compare('newpass12', saved)).toBe(true);
  });

  it('refuses an email another user has', async () => {
    users.findOne.mockResolvedValue({ id: 'u2' });
    await expect(service.updateProfile('u1', { email: 'taken@x.co' })).rejects.toThrow(ConflictException);
  });

  it('will not delete the last admin', async () => {
    users.count.mockResolvedValue(1);
    await expect(service.deleteAccount('u1', 'oldpass12')).rejects.toThrow(BadRequestException);
    expect(users.delete).not.toHaveBeenCalled();
  });
});
