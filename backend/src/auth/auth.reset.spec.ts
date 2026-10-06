import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthService, RESET_LINK_MINUTES } from './auth.service';

describe('AuthService password reset by email', () => {
  let found: any;
  let users: any;
  let mail: any;
  let service: AuthService;
  const qb = () => ({
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(() => Promise.resolve(found)),
  });

  beforeEach(() => {
    found = null;
    users = { createQueryBuilder: jest.fn(qb), update: jest.fn() };
    mail = { passwordResetLink: jest.fn().mockResolvedValue(true) };
    service = new AuthService(users, {} as any, {} as any, mail);
  });

  it('does nothing for an unknown email', async () => {
    await service.forgotPassword('nobody@example.test');
    expect(users.update).not.toHaveBeenCalled();
    expect(mail.passwordResetLink).not.toHaveBeenCalled();
  });

  it('stores only a hash of the token and emails the token', async () => {
    found = {
      id: 'u1',
      email: 'a@example.test',
      name: 'A',
      resetTokenExpiresAt: null,
    };
    await service.forgotPassword(' A@Example.test ');
    const [id, saved] = users.update.mock.calls[0];
    const token = mail.passwordResetLink.mock.calls[0][1];
    expect(id).toBe('u1');
    expect(saved.resetTokenHash).toBe(
      createHash('sha256').update(token).digest('hex'),
    );
    expect(saved.resetTokenHash).not.toBe(token);
    expect(saved.resetTokenExpiresAt.getTime()).toBeGreaterThan(
      Date.now() + (RESET_LINK_MINUTES - 1) * 60_000,
    );
  });

  it('does not send a second link within two minutes', async () => {
    found = {
      id: 'u1',
      email: 'a@example.test',
      name: 'A',
      resetTokenExpiresAt: new Date(
        Date.now() + (RESET_LINK_MINUTES - 1) * 60_000,
      ),
    };
    await service.forgotPassword('a@example.test');
    expect(mail.passwordResetLink).not.toHaveBeenCalled();
  });

  it('sets the new password once from a valid link', async () => {
    found = { id: 'u1', resetTokenExpiresAt: new Date(Date.now() + 60_000) };
    await service.resetPassword('a'.repeat(43), 'newpass123');
    const saved = users.update.mock.calls[0][1];
    expect(await bcrypt.compare('newpass123', saved.password)).toBe(true);
    expect(saved).toMatchObject({
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      mustChangePassword: false,
    });
  });

  it('refuses an unknown or expired link', async () => {
    await expect(
      service.resetPassword('a'.repeat(43), 'newpass123'),
    ).rejects.toThrow(BadRequestException);
    found = { id: 'u1', resetTokenExpiresAt: new Date(Date.now() - 1000) };
    await expect(
      service.resetPassword('a'.repeat(43), 'newpass123'),
    ).rejects.toThrow(BadRequestException);
    expect(users.update).not.toHaveBeenCalled();
  });
});
