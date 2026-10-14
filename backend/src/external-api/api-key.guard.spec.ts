import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard, hashApiKey } from './api-key.guard';

const ctx = (authorization?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  }) as unknown as ExecutionContext;

const guard = (hash?: string) =>
  new ApiKeyGuard({ get: () => hash } as unknown as ConfigService);

describe('ApiKeyGuard', () => {
  const key = 'k-test-123';
  const hash = hashApiKey(key);

  it('lets the right key in', () => {
    expect(guard(hash).canActivate(ctx(`Bearer ${key}`))).toBe(true);
    expect(guard(hash.toUpperCase()).canActivate(ctx(`bearer ${key}`))).toBe(
      true,
    );
  });

  it.each([
    ['no header', undefined],
    ['wrong key', 'Bearer nope'],
    ['no scheme', key],
    ['basic scheme', `Basic ${key}`],
    ['empty bearer', 'Bearer '],
    ['key with extra part', `Bearer ${key} extra`],
  ])('rejects %s with 401', (_name, header) => {
    expect(() => guard(hash).canActivate(ctx(header))).toThrow(
      UnauthorizedException,
    );
  });

  it('refuses everything when no hash is configured or it is malformed', () => {
    expect(() => guard(undefined).canActivate(ctx(`Bearer ${key}`))).toThrow(
      UnauthorizedException,
    );
    expect(() => guard('').canActivate(ctx(`Bearer ${key}`))).toThrow(
      UnauthorizedException,
    );
    expect(() => guard('zz').canActivate(ctx(`Bearer ${key}`))).toThrow(
      UnauthorizedException,
    );
  });
});
