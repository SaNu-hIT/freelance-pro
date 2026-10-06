import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer');

describe('MailService', () => {
  const user = { email: 'ravi@example.test', name: 'Ravi' };
  const config = (env: Record<string, string>) =>
    ({ get: (k: string) => env[k] }) as unknown as ConfigService;
  const smtp = {
    SMTP_HOST: 'smtp.test',
    SMTP_PORT: '587',
    SMTP_USER: 'me@x.test',
    SMTP_PASS: 'key',
    FRONTEND_URL: 'https://app.test/',
  };
  let sendMail: jest.Mock;

  beforeEach(() => {
    sendMail = jest.fn().mockResolvedValue({});
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
  });

  it('skips sending without SMTP settings', async () => {
    const mail = new MailService(config({}));
    await expect(mail.passwordReset(user, 'Temp1234')).resolves.toBe(false);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('sends the sign-in details over STARTTLS on 587', async () => {
    const mail = new MailService(config(smtp));
    await expect(mail.accountCreated(user, 'pass1234', 'client')).resolves.toBe(
      true,
    );
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.test',
        port: 587,
        secure: false,
        auth: { user: 'me@x.test', pass: 'key' },
      }),
    );
    const sent = (
      sendMail.mock.calls as [{ text: string; html: string }][]
    )[0][0];
    expect(sent).toMatchObject({
      from: 'WorkAI <me@x.test>',
      to: '"Ravi" <ravi@example.test>',
      subject: 'Your WorkAI account is ready',
    });
    expect(sent.text).toContain('Sign in to WorkAI: https://app.test/login');
    expect(sent.text).toContain('Password: pass1234');
    expect(sent.html).toContain('href="https://app.test/login"');
    expect(sent.html).toContain('pass1234');
  });

  it('escapes names in the HTML and links the reset page with the token', async () => {
    const mail = new MailService(config(smtp));
    await mail.passwordResetLink(
      { email: 'x@example.test', name: '<b>Eve</b>' },
      'tok_123',
      60,
    );
    const sent = (
      sendMail.mock.calls as [{ html: string; text: string }][]
    )[0][0];
    expect(sent.html).toContain('Hi &lt;b&gt;Eve&lt;/b&gt;,');
    expect(sent.html).not.toContain('<b>Eve</b>');
    expect(sent.html).toContain(
      'https://app.test/reset-password?token=tok_123',
    );
    expect(sent.text).toContain('expires in 60 minutes');
  });

  it('reports a failed send instead of throwing', async () => {
    sendMail.mockRejectedValue(new Error('535 auth failed'));
    const mail = new MailService(config(smtp));
    await expect(mail.passwordReset(user, 'Temp1234')).resolves.toBe(false);
  });
});
