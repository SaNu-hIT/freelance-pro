import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CorrectionsService, MAX_SCREENSHOTS } from './corrections.service';

describe('CorrectionsService', () => {
  const admin = { id: 'a1', role: 'admin' };
  const dev = { id: 'f1', role: 'freelancer' };
  const client = { id: 'c1', role: 'client' };
  let stored: any;
  let saved: any[];
  let m: any;
  let docsRepo: any;
  let pagesRepo: any;
  let repo: any;
  let service: CorrectionsService;

  beforeEach(() => {
    stored = {
      id: 'k1',
      projectId: 'p1',
      createdById: 'c1',
      status: 'open',
      reopenCount: 0,
    };
    saved = [];
    m = {
      create: jest.fn((_e, d) => d),
      save: jest.fn((d) => {
        saved.push({ ...d });
        return Promise.resolve({ id: 'new', ...d });
      }),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: 4 }),
      })),
    };
    docsRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve({ id: 'd1', ...d })),
    };
    pagesRepo = { findOne: jest.fn() };
    repo = {
      findOne: jest.fn(() => Promise.resolve(stored)),
      remove: jest.fn(),
      manager: {
        transaction: jest.fn((fn) => fn(m)),
        getRepository: jest.fn((e) =>
          e.name === 'ProjectDocument' ? docsRepo : pagesRepo,
        ),
      },
    };
    service = new CorrectionsService(
      repo,
      {} as any,
      { assertAccess: jest.fn().mockResolvedValue({}) } as any,
    );
    jest.spyOn(service, 'findOne').mockImplementation(async () => stored);
  });

  const statusLogs = () =>
    saved.filter((s) => s.kind === 'status').map((s) => s.body);

  it('numbers corrections per project and snapshots the page URL', async () => {
    pagesRepo.findOne.mockResolvedValue({
      id: 'pg1',
      url: 'https://site.test/about',
      archived: false,
    });
    await service.create(client, {
      projectId: 'p1',
      pageId: 'pg1',
      title: ' Logo ',
      body: ' too small ',
    });
    expect(saved[0]).toMatchObject({
      number: 5,
      pageUrl: 'https://site.test/about',
      title: 'Logo',
      body: 'too small',
      status: 'open',
      createdById: 'c1',
    });
  });

  it('refuses a page from another project, and archived pages for clients', async () => {
    pagesRepo.findOne.mockResolvedValue(null);
    await expect(
      service.create(admin, {
        projectId: 'p1',
        pageId: 'x',
        title: 't',
        body: 'b',
      }),
    ).rejects.toThrow(BadRequestException);
    pagesRepo.findOne.mockResolvedValue({ id: 'pg1', archived: true });
    await expect(
      service.create(client, {
        projectId: 'p1',
        pageId: 'pg1',
        title: 't',
        body: 'b',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('lets the client confirm or reopen only after it is fixed, counting reopens', async () => {
    await expect(
      service.update(client, 'k1', { status: 'confirmed' }),
    ).rejects.toThrow(ForbiddenException);
    stored.status = 'fixed';
    await service.update(client, 'k1', { status: 'reopened' });
    expect(stored).toMatchObject({ status: 'reopened', reopenCount: 1 });
    expect(statusLogs()).toEqual(['Fixed → Reopened']);
  });

  it("keeps sign-off and won't-fix for admins", async () => {
    await expect(
      service.update(dev, 'k1', { status: 'confirmed' }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.update(dev, 'k1', { status: 'wontfix' }),
    ).rejects.toThrow(ForbiddenException);
    await service.update(dev, 'k1', { status: 'fixed' });
    await service.update(admin, 'k1', { status: 'wontfix' });
    expect(statusLogs()).toEqual(['Open → Fixed', "Fixed → Won't fix"]);
  });

  it('lets a client edit their own correction until the team picks it up', async () => {
    await service.update(client, 'k1', { title: 'New title' });
    expect(stored.title).toBe('New title');
    stored.status = 'in_progress';
    await expect(service.update(client, 'k1', { body: 'x' })).rejects.toThrow(
      ForbiddenException,
    );
    stored.status = 'open';
    stored.createdById = 'someone-else';
    await expect(service.update(client, 'k1', { body: 'x' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('a team question waits on the client and their answer hands it back', async () => {
    await service.addComment(dev, 'k1', {
      body: 'Which logo file?',
      kind: 'question',
      visibility: 'internal',
    });
    expect(saved[0]).toMatchObject({ kind: 'question', visibility: 'client' });
    expect(stored.status).toBe('needs_info');
    await service.addComment(client, 'k1', {
      body: 'The blue one',
      visibility: 'internal',
    });
    expect(saved.find((s) => s.kind === 'answer')).toMatchObject({
      kind: 'answer',
      visibility: 'client',
    });
    expect(stored.status).toBe('open');
    expect(statusLogs()).toEqual(['Open → Needs info', 'Needs info → Open']);
  });

  it('keeps internal team comments internal and stops clients asking questions', async () => {
    await service.addComment(dev, 'k1', {
      body: 'check css',
      visibility: 'internal',
    });
    expect(saved[0]).toMatchObject({ kind: 'comment', visibility: 'internal' });
    expect(stored.status).toBe('open');
    await expect(
      service.addComment(client, 'k1', { body: 'q', kind: 'question' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('accepts only images, up to the limit, from the team or the client who raised it', async () => {
    const png = {
      originalname: 's.png',
      mimetype: 'image/png',
      size: 10,
      buffer: Buffer.from('x'),
    } as any;
    await expect(
      service.addScreenshot(client, 'k1', {
        ...png,
        mimetype: 'application/pdf',
      }),
    ).rejects.toThrow(BadRequestException);
    const meta = await service.addScreenshot(client, 'k1', png);
    expect(meta).toMatchObject({
      correctionId: 'k1',
      projectId: 'p1',
      type: 'attachment',
    });
    expect(meta).not.toHaveProperty('data');
    docsRepo.count.mockResolvedValue(MAX_SCREENSHOTS);
    await expect(service.addScreenshot(admin, 'k1', png)).rejects.toThrow(
      BadRequestException,
    );
    stored.createdById = 'other';
    docsRepo.count.mockResolvedValue(0);
    await expect(service.addScreenshot(client, 'k1', png)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('turns a correction into a board task once, for admins only', async () => {
    m.count = jest.fn().mockResolvedValue(3);
    m.findOne = jest.fn().mockResolvedValue({ id: 's1' });
    repo.manager.findOne = m.findOne;
    await expect(service.createTask(dev, 'k1', {})).rejects.toThrow(
      ForbiddenException,
    );
    stored.number = 7;
    stored.title = 'Logo';
    await service.createTask(admin, 'k1', {
      sprintId: 's1',
      assignedFreelancerId: 'fp1',
    });
    expect(saved[0]).toMatchObject({
      projectId: 'p1',
      title: 'C-7 Logo',
      sprintId: 's1',
      assignedFreelancerId: 'fp1',
      order: 3,
    });
    expect(stored).toMatchObject({ taskId: 'new', status: 'triaged' });
    expect(statusLogs()).toEqual(['Open → Triaged']);
    await expect(service.createTask(admin, 'k1', {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('puts the task back on the list when the client reopens', async () => {
    m.update = jest.fn();
    stored.status = 'fixed';
    stored.taskId = 't1';
    await service.update(client, 'k1', { status: 'reopened' });
    expect(m.update).toHaveBeenCalledWith(expect.anything(), 't1', {
      completed: false,
      completedAt: null,
    });
  });

  it('sums corrections per project for admins only', async () => {
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          projectId: 'p1',
          total: '5',
          withTeam: '2',
          withClient: '1',
          closed: '2',
          reopened: '1',
          reopens: '3',
        },
      ]),
    };
    repo.createQueryBuilder = jest.fn(() => qb);
    await expect(service.summary(dev)).rejects.toThrow(ForbiddenException);
    await expect(service.summary(admin)).resolves.toEqual([
      {
        projectId: 'p1',
        total: 5,
        withTeam: 2,
        withClient: 1,
        closed: 2,
        reopened: 1,
        reopens: 3,
      },
    ]);
  });

  it('only lets admins delete corrections', async () => {
    await expect(service.remove(dev, 'k1')).rejects.toThrow(ForbiddenException);
    await expect(service.remove(admin, 'k1')).resolves.toEqual({
      deleted: true,
    });
  });
});
