import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  let repo: any;
  let projects: any;
  let service: DocumentsService;
  const file = { originalname: 'spec.pdf', mimetype: 'application/pdf', size: 3, buffer: Buffer.from('abc') } as any;

  beforeEach(() => {
    repo = {
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve({ id: 'd1', ...d })),
      findOne: jest.fn().mockResolvedValue({ id: 'd1', projectId: 'p1', uploadedById: 'f1' }),
      delete: jest.fn(),
    };
    projects = { assertAccess: jest.fn().mockResolvedValue({}), scopeToUser: jest.fn() };
    service = new DocumentsService(repo, projects);
  });

  it('checks project access and never returns the file bytes on upload', async () => {
    const saved = await service.upload({ id: 'f1', role: 'freelancer' }, { projectId: 'p1', type: 'report' }, file);
    expect(projects.assertAccess).toHaveBeenCalledWith({ id: 'f1', role: 'freelancer' }, 'p1');
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ data: file.buffer, type: 'report', uploadedById: 'f1' }));
    expect(saved).not.toHaveProperty('data');
  });

  it('files client uploads as attachments whatever type they send', async () => {
    await service.upload({ id: 'c1', role: 'client' }, { projectId: 'p1', type: 'invoice' }, file);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ type: 'attachment' }));
  });

  it('rejects an upload with no file', async () => {
    await expect(service.upload({ id: 'f1', role: 'freelancer' }, { projectId: 'p1' }, undefined)).rejects.toThrow(BadRequestException);
  });

  it('stops an outsider before saving', async () => {
    projects.assertAccess.mockRejectedValue(new ForbiddenException());
    await expect(service.upload({ id: 'x', role: 'client' }, { projectId: 'p1' }, file)).rejects.toThrow(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('lets only the uploader or an admin delete', async () => {
    await expect(service.remove({ id: 'c1', role: 'client' }, 'd1')).rejects.toThrow(ForbiddenException);
    await service.remove({ id: 'f1', role: 'freelancer' }, 'd1');
    await service.remove({ id: 'a1', role: 'admin' }, 'd1');
    expect(repo.delete).toHaveBeenCalledTimes(2);
  });

  it('blocks clients from editing document metadata', async () => {
    await expect(service.update({ id: 'c1', role: 'client' }, 'd1', { status: 'in-review' })).rejects.toThrow(ForbiddenException);
  });
});
