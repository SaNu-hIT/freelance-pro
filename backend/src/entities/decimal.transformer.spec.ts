import { getMetadataArgsStorage } from 'typeorm';
import { Worklog } from './worklog.entity';
import { Payment } from './payment.entity';

describe('decimal columns', () => {
  it.each([
    [Worklog, 'hoursWorked'],
    [Payment, 'amount'],
    [Payment, 'deductions'],
    [Payment, 'netAmount'],
  ])('%p.%s reads decimal strings from Postgres as numbers', (target, propertyName) => {
    const column = getMetadataArgsStorage().columns.find(
      (c) => c.target === target && c.propertyName === propertyName,
    );
    const transformer = column?.options.transformer as { from: (v: string) => unknown };
    expect(transformer?.from('4.50')).toBe(4.5);
  });
});
