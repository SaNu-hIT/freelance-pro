import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

export const hashApiKey = (key: string) =>
  createHash('sha256').update(key).digest('hex');

// The external assistant sends "Authorization: Bearer <key>". Only the key's SHA-256 is configured
// (EXTERNAL_API_KEY_HASH), so the key itself is never stored. No hash configured means nothing gets in.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('EXTERNAL_API_KEY_HASH')?.trim();
    const header = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>()
      .headers.authorization;
    const key = /^Bearer\s+(\S+)$/i.exec(header ?? '')?.[1];
    if (!expected || !key) throw this.deny();

    const a = Buffer.from(hashApiKey(key), 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw this.deny();
    return true;
  }

  private deny() {
    return new UnauthorizedException('Missing or invalid API key');
  }
}
