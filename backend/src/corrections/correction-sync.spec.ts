import { syncCorrectionsFromTask } from './correction-sync';

describe('syncCorrectionsFromTask', () => {
  let linked: any[];
  let updates: any[];
  let logs: string[];
  let m: any;

  beforeEach(() => {
    updates = [];
    logs = [];
    m = {
      find: jest.fn(() => Promise.resolve(linked)),
      create: jest.fn((_e, d) => d),
      save: jest.fn((d) => {
        logs.push(d.body);
        return Promise.resolve(d);
      }),
      update: jest.fn((_e, id, d) => {
        updates.push({ id, ...d });
        return Promise.resolve();
      }),
      transaction: jest.fn((fn) => fn(m)),
    };
  });

  const task = (t: object) =>
    ({ id: 't1', completed: false, inProgressAt: null, ...t }) as any;

  it('marks the correction fixed when its task is done', async () => {
    linked = [{ id: 'k1', status: 'in_progress' }];
    await syncCorrectionsFromTask(m, task({ completed: true }), 'u1');
    expect(updates).toEqual([{ id: 'k1', status: 'fixed' }]);
    expect(logs).toEqual(['In progress → Fixed']);
  });

  it('marks it in progress when the task is started', async () => {
    linked = [{ id: 'k1', status: 'reopened' }];
    await syncCorrectionsFromTask(m, task({ inProgressAt: new Date() }), 'u1');
    expect(updates).toEqual([{ id: 'k1', status: 'in_progress' }]);
  });

  it("leaves the client's sign-off, won't fix and questions alone", async () => {
    linked = [
      { id: 'a', status: 'confirmed' },
      { id: 'b', status: 'wontfix' },
      { id: 'c', status: 'fixed' },
    ];
    await syncCorrectionsFromTask(m, task({ completed: true }), 'u1');
    linked = [{ id: 'd', status: 'needs_info' }];
    await syncCorrectionsFromTask(m, task({ inProgressAt: new Date() }), 'u1');
    expect(updates).toEqual([]);
  });
});
