import { getMetadataArgsStorage } from 'typeorm';
import { User } from './user.entity';

describe('User.password', () => {
  it('is never selected unless asked for', () => {
    const column = getMetadataArgsStorage().columns.find(
      (c) => c.target === User && c.propertyName === 'password',
    );
    expect(column?.options.select).toBe(false);
  });
});
