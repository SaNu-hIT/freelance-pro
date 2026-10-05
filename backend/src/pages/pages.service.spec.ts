import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PagesService } from './pages.service';

describe('PagesService', () => {
  let pagesRepo: any;
  let notesRepo: any;
  let projects: any;
  let discovery: any;
  let service: PagesService;
  const admin = { id: 'a1', role: 'admin' };
  const dev = { id: 'f1', role: 'freelancer' };
  const client = { id: 'c1', role: 'client' };

  beforeEach(() => {
    pagesRepo = {
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve(d)),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      remove: jest.fn(),
    };
    notesRepo = {
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve({ id: 'n1', ...d })),
      findOne: jest.fn(),
      remove: jest.fn(),
      manager: {
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 'c1', name: 'Cli', role: 'client' }),
      },
    };
    projects = {
      assertAccess: jest
        .fn()
        .mockResolvedValue({ id: 'p1', liveUrl: 'https://site.test' }),
    };
    discovery = { discover: jest.fn() };
    service = new PagesService(pagesRepo, notesRepo, projects, discovery);
  });

  it('adds a page by path against the live URL', async () => {
    const page = await service.create(dev, {
      projectId: 'p1',
      url: '/about/',
      title: ' About ',
    });
    expect(page).toMatchObject({
      url: 'https://site.test/about',
      path: '/about',
      title: 'About',
      source: 'manual',
    });
  });

  it('rejects a duplicate page and a client adding pages', async () => {
    pagesRepo.findOne.mockResolvedValue({ id: 'x' });
    await expect(
      service.create(admin, {
        projectId: 'p1',
        url: 'https://site.test/about',
      }),
    ).rejects.toThrow(ConflictException);
    await expect(
      service.create(client, { projectId: 'p1', url: '/x' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('needs a live URL to add by path', async () => {
    projects.assertAccess.mockResolvedValue({ id: 'p1', liveUrl: null });
    await expect(
      service.create(admin, { projectId: 'p1', url: '/about' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('discovers: adds new pages and marks known ones seen without overwriting titles', async () => {
    pagesRepo.find.mockResolvedValue([
      { url: 'https://site.test/', title: 'Kept', lastSeenAt: null },
    ]);
    discovery.discover.mockResolvedValue([
      { url: 'https://site.test/', path: '/', title: 'New', source: 'crawl' },
      {
        url: 'https://site.test/pricing',
        path: '/pricing',
        title: 'Pricing',
        source: 'sitemap',
      },
    ]);
    expect(await service.discover(admin, 'p1')).toEqual({
      found: 2,
      added: 1,
      site: 'https://site.test',
    });
    const saved = pagesRepo.save.mock.calls[0][0];
    expect(saved[0]).toMatchObject({
      title: 'Kept',
      lastSeenAt: expect.any(Date),
    });
    expect(saved[1]).toMatchObject({
      projectId: 'p1',
      path: '/pricing',
      source: 'sitemap',
    });
  });

  it('discovers a typed address and keeps it as the live URL of a project without one', async () => {
    projects.assertAccess.mockResolvedValue({ id: 'p1', liveUrl: null });
    projects.update = jest.fn();
    pagesRepo.find.mockResolvedValue([]);
    discovery.discover.mockResolvedValue([]);
    await expect(service.discover(admin, 'p1')).rejects.toThrow(
      BadRequestException,
    );
    expect(
      await service.discover(admin, 'p1', 'shop.test/products/'),
    ).toMatchObject({ site: 'https://shop.test' });
    expect(discovery.discover).toHaveBeenCalledWith(
      'https://shop.test/products',
    );
    expect(projects.update).toHaveBeenCalledWith('p1', {
      liveUrl: 'https://shop.test',
    });
  });

  it('only lets admins discover', async () => {
    await expect(service.discover(dev, 'p1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(discovery.discover).not.toHaveBeenCalled();
  });

  it('forces client notes to be client-visible', async () => {
    pagesRepo.findOne.mockResolvedValue({
      id: 'pg1',
      projectId: 'p1',
      archived: false,
    });
    const note = await service.addNote(client, 'pg1', {
      body: ' hi ',
      visibility: 'internal',
    });
    expect(note).toMatchObject({
      body: 'hi',
      visibility: 'client',
      authorId: 'c1',
      author: { name: 'Cli' },
    });
  });

  it('defaults team notes to internal', async () => {
    pagesRepo.findOne.mockResolvedValue({
      id: 'pg1',
      projectId: 'p1',
      archived: false,
    });
    expect(await service.addNote(dev, 'pg1', { body: 'x' })).toMatchObject({
      visibility: 'internal',
    });
  });

  it('lets only the author or an admin delete a note', async () => {
    notesRepo.findOne.mockResolvedValue({
      id: 'n1',
      authorId: 'f2',
      page: { projectId: 'p1' },
    });
    await expect(service.removeNote(dev, 'n1')).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.removeNote(admin, 'n1')).resolves.toEqual({
      deleted: true,
    });
  });

  it('only lets admins delete pages', async () => {
    await expect(service.remove(dev, 'pg1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
