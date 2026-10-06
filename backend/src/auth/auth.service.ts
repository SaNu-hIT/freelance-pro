import { createHash, randomBytes } from 'crypto';
import {
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { FreelancerProfile } from '../entities/freelancer-profile.entity';
import { RegisterDto } from './dto/auth.dto';
import { MailService } from '../mail/mail.service';

export const RESET_LINK_MINUTES = 60;
// One email per account per this many minutes, so the form cannot flood an inbox
const RESET_RESEND_MINUTES = 2;
const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(FreelancerProfile)
    private freelancerProfileRepository: Repository<FreelancerProfile>,
    private jwtService: JwtService,
    private mail: MailService,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  // Emails a one-time link to choose a new password. Says nothing about whether the email has an account.
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.resetTokenExpiresAt')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .getOne();
    if (!user) return;
    const now = Date.now();
    const issuedAt = user.resetTokenExpiresAt
      ? user.resetTokenExpiresAt.getTime() - RESET_LINK_MINUTES * 60_000
      : 0;
    if (now - issuedAt < RESET_RESEND_MINUTES * 60_000) {
      this.logger.warn(`Reset link for ${user.email} asked again too soon`);
      return;
    }
    const token = randomBytes(32).toString('base64url');
    await this.usersRepository.update(user.id, {
      resetTokenHash: hashToken(token),
      resetTokenExpiresAt: new Date(now + RESET_LINK_MINUTES * 60_000),
    });
    await this.mail.passwordResetLink(user, token, RESET_LINK_MINUTES);
  }

  // Sets the new password from a reset link; the link then stops working
  async resetPassword(token: string, password: string): Promise<void> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.resetTokenExpiresAt')
      .where('user.resetTokenHash = :hash', { hash: hashToken(token) })
      .getOne();
    if (
      !user ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'This reset link is invalid or has expired. Ask for a new one.',
      );
    }
    await this.usersRepository.update(user.id, {
      password: await bcrypt.hash(password, 10),
      mustChangePassword: false,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    });
  }

  async register(dto: RegisterDto): Promise<{ user: User; token: string }> {
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      role: dto.role,
      company: dto.company ?? null,
      phone: dto.phone ?? null,
    });
    const savedUser = await this.usersRepository.save(user);

    if (dto.role === 'freelancer') {
      const profile = this.freelancerProfileRepository.create({
        userId: savedUser.id,
        user: savedUser,
        status: 'pending',
        skills: dto.skills ?? [],
        experience: dto.experience ?? 0,
        hourlyRate: dto.hourlyRate ?? 0,
        bio: dto.bio ?? '',
      });
      await this.freelancerProfileRepository.save(profile);
    }

    const token = this.generateToken(savedUser);
    const { password: _pwd, ...userWithoutPassword } = savedUser;
    return { user: userWithoutPassword as User, token };
  }

  async login(user: User): Promise<{ user: Partial<User>; token: string }> {
    const token = this.generateToken(user);
    const { password: _pwd, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;
    return user;
  }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }
}
