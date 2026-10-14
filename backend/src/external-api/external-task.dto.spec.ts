import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateExternalTaskDto } from './external-task.dto';

const errors = (body: unknown) =>
  validateSync(plainToInstance(CreateExternalTaskDto, body), {
    whitelist: true,
  }).map((e) => e.property);

const ok = { title: 'Fix logo', message_id: 'wamid.1' };

describe('CreateExternalTaskDto', () => {
  it('accepts the minimal and the full body', () => {
    expect(errors(ok)).toEqual([]);
    expect(
      errors({
        ...ok,
        description: 'analysis',
        type: 'correction',
        priority: 'urgent',
        source: 'whatsapp',
        customer_name: 'Sara',
        customer_phone: '+971501234567',
        original_message: 'hi',
        received_at: '2026-10-15T08:30:00Z',
        attachments: [{ url: 'https://x.test/a.png', type: 'image' }],
      }),
    ).toEqual([]);
  });

  it.each([
    ['missing title', { message_id: 'm' }, 'title'],
    ['blank title', { ...ok, title: '' }, 'title'],
    ['missing message_id', { title: 't' }, 'message_id'],
    ['bad type', { ...ok, type: 'rant' }, 'type'],
    ['bad priority', { ...ok, priority: 'asap' }, 'priority'],
    ['bad source', { ...ok, source: 'email' }, 'source'],
    [
      'phone without +',
      { ...ok, customer_phone: '971501234567' },
      'customer_phone',
    ],
    [
      'phone with spaces',
      { ...ok, customer_phone: '+971 50 123 4567' },
      'customer_phone',
    ],
    ['bad date', { ...ok, received_at: 'yesterday' }, 'received_at'],
    [
      'attachment not a URL',
      { ...ok, attachments: [{ url: 'javascript:alert(1)', type: 'image' }] },
      'attachments',
    ],
    [
      'attachment bad type',
      { ...ok, attachments: [{ url: 'https://x.test/a', type: 'video' }] },
      'attachments',
    ],
    [
      'too many attachments',
      {
        ...ok,
        attachments: Array(21).fill({ url: 'https://x.test/a', type: 'image' }),
      },
      'attachments',
    ],
  ])('rejects %s', (_name, body, field) => {
    expect(errors(body)).toContain(field);
  });
});
