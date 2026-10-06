import { ProjectsService } from './projects.service';

describe('ProjectsService.getDashboardStats', () => {
  it('fills every dashboard card from real counts', async () => {
    const projects: any = {
      createQueryBuilder: () => ({
        select: function () { return this; },
        addSelect: function () { return this; },
        groupBy: function () { return this; },
        getRawMany: () => Promise.resolve([
          { status: 'in_progress', count: '3' },
          { status: 'assigned', count: '1' },
          { status: 'onboarded', count: '2' },
          { status: 'reviewed', count: '1' },
          { status: 'blocked', count: '2' },
          { status: 'pending_approval', count: '1' },
        ]),
      }),
      count: jest.fn().mockResolvedValueOnce(7).mockResolvedValueOnce(2),
    };
    const freelancers: any = { count: jest.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(4).mockResolvedValueOnce(1) };
    const stats = await new ProjectsService(projects, freelancers, {} as any, {} as any).getDashboardStats();
    expect(stats).toMatchObject({
      totalProjects: 7, activeProjects: 6, delayedProjects: 2, pendingApprovals: 1,
      totalFreelancers: 5, activeFreelancers: 4, newProjectsLast30Days: 2, newFreelancersLast30Days: 1,
    });
  });
});
