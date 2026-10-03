import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let users: any;
  let projects: any;
  let profiles: any;
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
    profiles = {
      create: jest.fn((x: any) => x),
      save: jest.fn((x: any) => Promise.resolve({ ...x, id: 'p9' })),
      findOne: jest.fn((q: any) => Promise.resolve({ id: q.where.id, user: { id: 'f9' } })),
    };
    service = new UsersService(users, projects, profiles);
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

  it('creates a client with a hashed password and returns it without the hash', async () => {
    users.create = jest.fn((x: any) => x);
    users.save = jest.fn((x: any) => Promise.resolve({ ...x, id: 'c9' }));
    users.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'c9', role: 'client' });
    const out = await service.createClient({ name: ' Acme ', email: 'a@acme.co', password: 'temppass1', company: '' });
    const savedArg = users.save.mock.calls[0][0];
    expect(savedArg.role).toBe('client');
    expect(savedArg.name).toBe('Acme');
    expect(savedArg.company).toBeNull();
    expect(await bcrypt.compare('temppass1', savedArg.password)).toBe(true);
    expect(out).toEqual({ id: 'c9', role: 'client', projectCount: 0 });
  });

  it('refuses a client email that is already registered', async () => {
    users.findOne.mockResolvedValue({ id: 'u2' });
    await expect(service.createClient({ name: 'A', email: 'taken@x.co', password: 'temppass1' })).rejects.toThrow(ConflictException);
  });

  it('creates an approved, active freelancer profile', async () => {
    users.create = jest.fn((x: any) => x);
    users.save = jest.fn((x: any) => Promise.resolve({ ...x, id: 'f9' }));
    const out = await service.createFreelancer({ name: 'Dev', email: 'd@x.co', password: 'temppass1', skills: ['React'], hourlyRate: 40 });
    expect(users.save.mock.calls[0][0].role).toBe('freelancer');
    const profile = profiles.save.mock.calls[0][0];
    expect(profile).toMatchObject({ userId: 'f9', status: 'active', onboardingStage: 'approved', skills: ['React'], hourlyRate: 40, track: 'professional' });
    expect(out).toEqual({ id: 'p9', user: { id: 'f9' } });
  });

  it('resets a password for an existing user only', async () => {
    await expect(service.resetPassword('nope', 'newpass12')).rejects.toThrow(NotFoundException);
    users.findOne.mockResolvedValue({ id: 'c1' });
    await service.resetPassword('c1', 'newpass12');
    expect(await bcrypt.compare('newpass12', users.update.mock.calls[0][1].password)).toBe(true);
  });

  it('404s an admin edit of a missing user', async () => {
    await expect(service.adminUpdate('nope', { name: 'X' })).rejects.toThrow(NotFoundException);
  });

  describe('adminDelete', () => {
    let tx: any;
    beforeEach(() => {
      tx = { delete: jest.fn() };
      users.manager = {
        count: jest.fn().mockResolvedValue(0),
        query: jest.fn().mockResolvedValue([{ n: '0' }]),
        transaction: jest.fn((fn: any) => fn(tx)),
      };
      profiles.findOne = jest.fn().mockResolvedValue(null);
    });

    it('deletes a client with no history', async () => {
      users.findOne.mockResolvedValue({ id: 'c1', role: 'client', name: 'Acme' });
      await service.adminDelete('admin', 'c1');
      expect(tx.delete).toHaveBeenCalledTimes(1);
    });

    it('deletes a freelancer profile before the user', async () => {
      users.findOne.mockResolvedValue({ id: 'f1', role: 'freelancer', name: 'Dev' });
      profiles.findOne.mockResolvedValue({ id: 'p1', userId: 'f1' });
      await service.adminDelete('admin', 'f1');
      expect(tx.delete.mock.calls.map((c: any[]) => c[1])).toEqual(['p1', 'f1']);
    });

    it('refuses anyone with linked work and says what blocks it', async () => {
      users.findOne.mockResolvedValue({ id: 'c1', role: 'client', name: 'Acme' });
      projects.count.mockResolvedValue(2);
      await expect(service.adminDelete('admin', 'c1')).rejects.toThrow('linked to 2 projects');
      expect(tx.delete).not.toHaveBeenCalled();
    });

    it('never deletes admins or the caller', async () => {
      await expect(service.adminDelete('a1', 'a1')).rejects.toThrow(BadRequestException);
      users.findOne.mockResolvedValue({ id: 'a2', role: 'admin', name: 'Other' });
      await expect(service.adminDelete('a1', 'a2')).rejects.toThrow(BadRequestException);
    });
  });
});
