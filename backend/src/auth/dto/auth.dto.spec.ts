import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './auth.dto';

const base = { email: 'new@example.test', password: 'secret123', name: 'New User' };

describe('RegisterDto', () => {
  it('rejects self-registration as admin', async () => {
    const errors = await validate(plainToInstance(RegisterDto, { ...base, role: 'admin' }));
    expect(errors.map(e => e.property)).toContain('role');
  });

  it.each(['freelancer', 'client'])('accepts role %s', async role => {
    const errors = await validate(plainToInstance(RegisterDto, { ...base, role }));
    expect(errors).toHaveLength(0);
  });
});
