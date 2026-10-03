import { FreelancerProfile } from '../entities/freelancer-profile.entity';
import { redactProfiles } from './profile-privacy.interceptor';

const profile = (userId: string) =>
  Object.assign(new FreelancerProfile(), {
    id: `fp-${userId}`, userId, skills: ['react'], hourlyRate: 80,
    adminNotes: 'slow to reply', verifications: { id: true }, rejectionReason: 'n/a', availability: { hours: 20 },
  });

describe('redactProfiles', () => {
  it('hides pay and vetting fields from a client, wherever the profile is nested', () => {
    const body = { data: [{ id: 'p1', teamMembers: [profile('f1')], assignedFreelancer: profile('f2') }], total: 1 };
    redactProfiles(body, 'c1');
    for (const fp of [body.data[0].teamMembers[0], body.data[0].assignedFreelancer]) {
      expect(fp).toMatchObject({ skills: ['react'] });
      expect(fp).not.toHaveProperty('hourlyRate');
      expect(fp).not.toHaveProperty('adminNotes');
      expect(fp).not.toHaveProperty('verifications');
    }
  });

  it('lets a freelancer keep their own rate but not the admin notes', () => {
    const own = profile('f1');
    const mate = profile('f2');
    redactProfiles([{ teamMembers: [own, mate] }], 'f1');
    expect(own.hourlyRate).toBe(80);
    expect(own).not.toHaveProperty('adminNotes');
    expect(mate).not.toHaveProperty('hourlyRate');
  });

  it('leaves dates and other objects alone and copes with cycles', () => {
    const when = new Date('2026-10-04T00:00:00Z');
    const node: any = { when, fp: profile('f1') };
    node.self = node;
    redactProfiles(node, 'c1');
    expect(node.when).toBe(when);
    expect(node.fp).not.toHaveProperty('hourlyRate');
  });
});
