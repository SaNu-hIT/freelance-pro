import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { FreelancerProfile } from '../entities/freelancer-profile.entity';

// Pay, vetting and admin-only fields on a freelancer profile
const PRIVATE_FIELDS = ['hourlyRate', 'adminNotes', 'verifications', 'rejectionReason', 'availability'] as const;

/**
 * Freelancer profiles are embedded in projects, worklogs and tasks. Only admins
 * see the private fields; a freelancer keeps them on their own profile, except
 * the admin's notes.
 */
@Injectable()
export class ProfilePrivacyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const user = context.switchToHttp().getRequest()?.user as { id: string; role: string } | undefined;
    if (user?.role === 'admin') return next.handle();
    return next.handle().pipe(map((body) => redactProfiles(body, user?.id)));
  }
}

export function redactProfiles<T>(body: T, viewerId?: string): T {
  const seen = new WeakSet<object>();
  const walk = (value: unknown) => {
    if (!value || typeof value !== 'object' || seen.has(value) || value instanceof Date || Buffer.isBuffer(value)) return;
    seen.add(value);
    if (value instanceof FreelancerProfile) {
      const fields = value.userId && value.userId === viewerId ? ['adminNotes'] : PRIVATE_FIELDS;
      for (const f of fields) delete (value as unknown as Record<string, unknown>)[f];
    }
    for (const child of Object.values(value)) walk(child);
  };
  walk(body);
  return body;
}
