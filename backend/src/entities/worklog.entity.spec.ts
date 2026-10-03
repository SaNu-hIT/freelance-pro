import { getMetadataArgsStorage } from 'typeorm';
import { Worklog } from './worklog.entity';

describe('Worklog.hoursWorked', () => {
  it('reads decimal strings from Postgres as numbers', () => {
    const column = getMetadataArgsStorage().columns.find(
      (c) => c.target === Worklog && c.propertyName === 'hoursWorked',
    );
    const transformer = column?.options.transformer as { from: (v: string) => unknown };
    expect(transformer?.from('4.50')).toBe(4.5);
  });
});
