import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { renderEmail, EmailContent } from './email-template';

type Recipient = { email: string; name: string };

// Account emails over SMTP (Brevo in production). Without SMTP settings it only logs that nothing was sent.
// A failed email never fails the action that sent it; callers get false and the admin still sees the password.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: nodemailer.Transporter | null;
  private readonly from: string;
  readonly appUrl: string;

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
        ? 'follow your projects, report corrections on your website and talk to the team'
        : 'see your projects and tasks and log your work';
    return this.send(to, 'Your WorkAI account is ready', {
      preview: 'Your sign-in details for WorkAI',
      heading: 'Your account is ready',
      paragraphs: [
        `Hi ${to.name},`,
        `An account has been created for you on WorkAI, where you can ${what}.`,
      ],
      details: [
        ['Email', to.email],
        ['Password', password],
      ],
      button: { label: 'Sign in to WorkAI', url: `${this.appUrl}/login` },
      after: [
        'For your security, change this password from your profile after you sign in.',
      ],
    });
  }

  // An admin reset the password: the temporary one works once, then the user must pick their own
  passwordReset(to: Recipient, temporaryPassword: string): Promise<boolean> {
    return this.send(to, 'Your WorkAI password was reset', {
      preview: 'An admin reset your WorkAI password',
      heading: 'Your password was reset',
      paragraphs: [
        `Hi ${to.name},`,
        'An admin reset your WorkAI password. Your old password no longer works.',
      ],
      details: [
        ['Email', to.email],
        ['Temporary password', temporaryPassword],
      ],
      button: { label: 'Sign in to WorkAI', url: `${this.appUrl}/login` },
      after: [
        'You will be asked to choose a new password when you sign in.',
        'If you did not expect this, reply to this email and let us know.',
      ],
    });
  }

  // The user asked to reset their own password: a link that sets a new one
  passwordResetLink(
    to: Recipient,
    token: string,
    minutes: number,
  ): Promise<boolean> {
    return this.send(to, 'Reset your WorkAI password', {
      preview: 'Choose a new WorkAI password',
      heading: 'Reset your password',
      paragraphs: [
        `Hi ${to.name},`,
        'We received a request to reset the password for your WorkAI account. Click the button below to choose a new one.',
      ],
      button: {
        label: 'Choose a new password',
        url: `${this.appUrl}/reset-password?token=${encodeURIComponent(token)}`,
      },
      after: [
        `This link works once and expires in ${minutes} minutes.`,
        'If you did not ask for this, ignore this email. Your password stays the same.',
      ],
    });
  }

  async send(
    to: Recipient,
    subject: string,
    content: EmailContent,
  ): Promise<boolean> {
    if (!this.transport) {
      this.logger.warn(
        `SMTP is not set up; no email sent to ${to.email} (${subject})`,
      );
      return false;
    }
    try {
      const { html, text } = renderEmail(content, this.appUrl);
      await this.transport.sendMail({
        from: this.from,
        to: `"${to.name.replace(/"/g, '')}" <${to.email}>`,
        subject,
        text,
        html,
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
