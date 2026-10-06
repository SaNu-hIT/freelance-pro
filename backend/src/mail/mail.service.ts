import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type Recipient = { email: string; name: string };

// Account emails over SMTP (Brevo in production). Without SMTP settings it only logs that nothing was sent.
// A failed email never fails the action that sent it; callers get false and the admin still sees the password.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: nodemailer.Transporter | null;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    const port = Number(config.get<string>('SMTP_PORT') ?? 587);
    this.transport =
      host && user && pass
        ? nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 15_000,
          })
        : null;
    this.from =
      config.get<string>('SMTP_FROM') ??
      `WorkAI <${user ?? 'no-reply@localhost'}>`;
    this.appUrl = (
      config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
  }

  // The admin created this account: how to sign in, with the password the admin set
  accountCreated(
    to: Recipient,
    password: string,
    role: 'client' | 'freelancer',
  ): Promise<boolean> {
    const what =
      role === 'client'
        ? 'follow your projects, report corrections and talk to the team'
        : 'see your projects and tasks and log your work';
    return this.send(to, 'Your WorkAI account is ready', [
      `Hi ${to.name},`,
      '',
      `An account has been created for you on WorkAI, where you can ${what}.`,
      '',
      `Sign in: ${this.appUrl}/login`,
      `Email: ${to.email}`,
      `Password: ${password}`,
      '',
      'Please change this password from your profile after you sign in.',
    ]);
  }

  // An admin reset the password: the temporary one works once, then the user must pick their own
  passwordReset(to: Recipient, temporaryPassword: string): Promise<boolean> {
    return this.send(to, 'Your WorkAI password was reset', [
      `Hi ${to.name},`,
      '',
      'An admin reset your WorkAI password. Your old password no longer works.',
      '',
      `Sign in: ${this.appUrl}/login`,
      `Email: ${to.email}`,
      `Temporary password: ${temporaryPassword}`,
      '',
      'You will be asked to choose a new password when you sign in.',
      'If you did not expect this, reply to this email and let us know.',
    ]);
  }

  async send(
    to: Recipient,
    subject: string,
    lines: string[],
  ): Promise<boolean> {
    if (!this.transport) {
      this.logger.warn(
        `SMTP is not set up; no email sent to ${to.email} (${subject})`,
      );
      return false;
    }
    try {
      await this.transport.sendMail({
        from: this.from,
        to: `"${to.name.replace(/"/g, '')}" <${to.email}>`,
        subject,
        text: lines.join('\n'),
      });
      return true;
    } catch (err) {
      this.logger.error(
        `Email to ${to.email} failed (${subject}): ${(err as Error).message}`,
      );
      return false;
    }
  }
}
