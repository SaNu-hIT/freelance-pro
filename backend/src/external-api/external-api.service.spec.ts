import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectTask } from '../entities/project-task.entity';
import { comparablePhone, ExternalApiService } from './external-api.service';

const PID = '11111111-1111-4111-8111-111111111111';

type TaskRow = Record<string, unknown>;

function setup(
  over: {
    exists?: boolean;
    found?: TaskRow;
    saveError?: unknown;
    last?: number | null;
  } = {},
) {
  const projects = {
    exists: jest.fn().mockResolvedValue(over.exists ?? true),
    find: jest.fn().mockResolvedValue([
      {
        id: PID,
        title: 'Site',
        client: { name: 'Sara', phone: '+971 50 123-4567' },
      },
      {
        id: 'b',
        title: 'No client phone',
        client: { name: 'Li', phone: null },
      },
      { id: 'c', title: 'Orphan', client: null },
    ]),
  };
  const findOne = jest.fn().mockResolvedValue(over.found ?? null);
  const save = jest.fn<Promise<TaskRow>, [TaskRow]>(
    over.saveError
      ? () =>
          Promise.reject(
            Object.assign(new Error('save failed'), over.saveError),
          )
      : (x) => Promise.resolve({ id: 't1', ...x }),
  );
  const tasks = {
    findOne,
    maximum: jest.fn().mockResolvedValue(over.last ?? null),
    create: jest.fn((x: TaskRow) => x),
    save,
  };
  const config = { get: () => 'https://app.test/' } as unknown as ConfigService;
  const service = new ExternalApiService(
    projects as unknown as Repository<Project>,
    tasks as unknown as Repository<ProjectTask>,
    config,
  );
  return { service, save, findOne };
}

describe('comparablePhone', () => {
  it('keeps digits and the leading +', () => {
    expect(comparablePhone('+971 (50) 123-4567')).toEqual(['+971501234567']);
    expect(comparablePhone('00971501234567')).toEqual(['+971501234567']);
  });
  it('drops empty or junk values', () => {
    expect(comparablePhone(null)).toEqual([]);
    expect(comparablePhone('n/a')).toEqual([]);
  });
});

describe('ExternalApiService', () => {
  it('lists projects with client name and phones', async () => {
    const { service } = setup();
    expect(await service.listProjects()).toEqual([
      {
        id: PID,
        name: 'Site',
        client_name: 'Sara',
        client_phones: ['+971501234567'],
      },
      {
        id: 'b',
        name: 'No client phone',
        client_name: 'Li',
        client_phones: [],
      },
      { id: 'c', name: 'Orphan', client_name: null, client_phones: [] },
    ]);
  });

  it('creates a task with defaults, next order and a project link', async () => {
    const { service, save } = setup({ last: 4 });
    const { task, created } = await service.create(PID, {
      title: '  Fix logo ',
      message_id: 'm1',
    });
    expect(created).toBe(true);
    expect(task).toMatchObject({
      id: 't1',
      url: `https://app.test/admin/projects/${PID}`,
      title: 'Fix logo',
    });
    expect(save.mock.calls[0][0]).toMatchObject({
      projectId: PID,
      order: 5,
      type: 'other',
      priority: 'normal',
      source: 'whatsapp',
      messageId: 'm1',
    });
  });

  it('stores the intake fields', async () => {
    const { service, save } = setup();
    await service.create(PID, {
      title: 't',
      message_id: 'm',
      description: 'd',
      type: 'complaint',
      priority: 'high',
      customer_name: 'Sara',
      customer_phone: '+971501234567',
      original_message: 'raw',
      received_at: '2026-10-15T08:30:00Z',
      attachments: [{ url: 'https://x.test/a', type: 'audio' }],
    });
    expect(save.mock.calls[0][0]).toMatchObject({
      order: 0,
      description: 'd',
      type: 'complaint',
      priority: 'high',
      customerName: 'Sara',
      customerPhone: '+971501234567',
      originalMessage: 'raw',
      receivedAt: new Date('2026-10-15T08:30:00Z'),
      attachments: [{ url: 'https://x.test/a', type: 'audio' }],
    });
  });

  it('returns the existing task for a repeated message_id without saving', async () => {
    const { service, save } = setup({
      found: { id: 'old', projectId: PID, title: 'Old', messageId: 'm1' },
    });
    const { task, created } = await service.create(PID, {
      title: 'New',
      message_id: 'm1',
    });
    expect(created).toBe(false);
    expect(task.id).toBe('old');
    expect(save).not.toHaveBeenCalled();
  });

  it('returns the winner when a concurrent delivery hits the unique index', async () => {
    const { service, findOne } = setup({ saveError: { code: '23505' } });
    findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'won',
      projectId: PID,
      title: 'T',
      messageId: 'm1',
    });
    const { task, created } = await service.create(PID, {
      title: 'T',
      message_id: 'm1',
    });
    expect(created).toBe(false);
    expect(task.id).toBe('won');
  });

  it('rethrows other save errors', async () => {
    const { service } = setup({ saveError: { message: 'db down' } });
    await expect(
      service.create(PID, { title: 'T', message_id: 'm1' }),
    ).rejects.toThrow('db down');
  });

  it('404s on an unknown project', async () => {
    const { service, save } = setup({ exists: false });
    await expect(
      service.create(PID, { title: 'T', message_id: 'm1' }),
    ).rejects.toThrow(NotFoundException);
    expect(save).not.toHaveBeenCalled();
  });

  it('looks a message up', async () => {
    const { service } = setup({
      found: { id: 'x', projectId: PID, title: 'T', messageId: 'm' },
    });
    expect((await service.findByMessageId('m'))?.id).toBe('x');
    const none = setup();
    expect(await none.service.findByMessageId('zz')).toBeNull();
  });
});
