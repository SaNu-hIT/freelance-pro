import { ValidationPipe } from '@nestjs/common';
import { RegisterDto } from './auth.dto';

describe('RegisterDto through the global whitelist pipe', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const run = (body: object) => pipe.transform(body, { type: 'body', metatype: RegisterDto });

  it('keeps freelancer profile fields', async () => {
    const dto = await run({
      email: 'a@b.co', password: 'secret1', name: 'A', role: 'freelancer',
      skills: ['React'], experience: 3, hourlyRate: 40, bio: 'hi',
    });
    expect(dto).toMatchObject({ skills: ['React'], experience: 3, hourlyRate: 40, bio: 'hi' });
  });

  it('keeps client company and phone', async () => {
    const dto = await run({ email: 'a@b.co', password: 'secret1', name: 'A', role: 'client', company: 'Acme', phone: '+1 555' });
    expect(dto).toMatchObject({ company: 'Acme', phone: '+1 555' });
  });
});
