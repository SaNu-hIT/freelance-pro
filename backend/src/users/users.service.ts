import { randomInt } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { FreelancerProfile } from '../entities/freelancer-profile.entity';
import { Worklog } from '../entities/worklog.entity';
import { Payment } from '../entities/payment.entity';
import { ProjectTask } from '../entities/project-task.entity';
import { ProjectRequest } from '../entities/project-request.entity';
import { ProjectDocument } from '../entities/project-document.entity';
import { MailService } from '../mail/mail.service';
import { AdminUpdateUserDto, CreateClientDto, CreateFreelancerDto, UpdateMeDto } from './dto/user.dto';

// 12 characters from an alphabet without look-alikes (0/O, 1/l/I), easy to read out or type
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
export function generateTemporaryPassword(length = 12): string {
  return Array.from({ length }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join('');
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(FreelancerProfile)
    private profilesRepository: Repository<FreelancerProfile>,
    private mail: MailService,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: { freelancerProfile: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(
    id: string,
    data: QueryDeepPartialEntity<User>,
  ): Promise<User | null> {
    await this.usersRepository.update(id, data);
    return this.findById(id);
  }

  async createClient(dto: CreateClientDto): Promise<User & { projectCount: number; emailed: boolean }> {
    const saved = await this.createAccount(dto, 'client');
    // Reload so the password hash never leaves the server
    const user = (await this.usersRepository.findOne({ where: { id: saved.id } }))!;
    const emailed = await this.mail.accountCreated(user, dto.password, 'client');
    return { ...user, projectCount: 0, emailed };
  }

  // An admin-created freelancer is already vetted, so the profile starts approved and active
  async createFreelancer(dto: CreateFreelancerDto): Promise<FreelancerProfile & { emailed: boolean }> {
    const saved = await this.createAccount(dto, 'freelancer');
    const profile = await this.profilesRepository.save(
      this.profilesRepository.create({
        userId: saved.id,
        status: 'active',
        onboardingStage: 'approved',
        skills: dto.skills ?? [],
        experience: dto.experience ?? 0,
        hourlyRate: dto.hourlyRate ?? 0,
        bio: dto.bio?.trim() ?? '',
        portfolioUrl: dto.portfolioUrl?.trim() || (null as unknown as string),
        track: dto.track ?? 'professional',
      }),
    );
    const full = (await this.profilesRepository.findOne({ where: { id: profile.id }, relations: { user: true } }))!;
    const emailed = await this.mail.accountCreated(full.user, dto.password, 'freelancer');
    return Object.assign(full, { emailed });
  }

  private async createAccount(dto: CreateClientDto, role: 'client' | 'freelancer'): Promise<User> {
    if (await this.usersRepository.findOne({ where: { email: dto.email } })) {
      throw new ConflictException('Email already in use');
    }
    return this.usersRepository.save(
      this.usersRepository.create({
        email: dto.email,
        password: await bcrypt.hash(dto.password, 10),
        name: dto.name.trim(),
        role,
        company: dto.company?.trim() || null,
        phone: dto.phone?.trim() || null,
      }),
    );
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto): Promise<User | null> {
    if (!(await this.usersRepository.findOne({ where: { id } }))) throw new NotFoundException('User not found');
    return this.updateProfile(id, dto);
  }

  // Admin removes a client or freelancer. Anyone with work history is refused so records never lose their owner.
  async adminDelete(actorId: string, id: string): Promise<void> {
    if (actorId === id) throw new BadRequestException('You cannot delete your own account here');
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'admin') throw new BadRequestException('Admin accounts cannot be deleted here');

    const m = this.usersRepository.manager;
    const profile = await this.profilesRepository.findOne({ where: { userId: id } });
    const counts: [string, number][] = [
      ['projects', await this.projectsRepository.count({ where: { clientId: id } })],
      ['requests', await m.count(ProjectRequest, { where: { fromUserId: id } })],
      ['documents', await m.count(ProjectDocument, { where: { uploadedById: id } })],
    ];
    if (profile) {
      const teamRows: { n: string }[] = await m.query(
        'SELECT COUNT(*) AS n FROM project_team_members WHERE "freelancerId" = $1',
        [profile.id],
      );
      counts.push(
        ['assigned projects', (await this.projectsRepository.count({ where: { assignedTo: profile.id } })) + Number(teamRows[0]?.n ?? 0)],
        ['work logs', await m.count(Worklog, { where: { freelancerId: profile.id } })],
        ['payments', await m.count(Payment, { where: { freelancerId: profile.id } })],
        ['tasks', await m.count(ProjectTask, { where: { assignedFreelancerId: profile.id } })],
      );
    }
    const blockers = counts.filter(([, n]) => n > 0).map(([label, n]) => `${n} ${label}`);
    if (blockers.length) {
      const advice = user.role === 'freelancer' ? 'Deactivate them instead.' : 'Delete or reassign them first.';
      throw new ConflictException(`Cannot delete ${user.name}: linked to ${blockers.join(', ')}. ${advice}`);
    }

    await m.transaction(async (tx) => {
      if (profile) await tx.delete(FreelancerProfile, profile.id);
      await tx.delete(User, id);
    });
  }

  // Admin reset: the old password stops working and the user must pick their own at next login
  async resetPassword(id: string, newPassword?: string): Promise<{ temporaryPassword: string; emailed: boolean }> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const temporaryPassword = newPassword ?? generateTemporaryPassword();
    await this.usersRepository.update(id, { password: await bcrypt.hash(temporaryPassword, 10), mustChangePassword: true });
    const emailed = await this.mail.passwordReset(user, temporaryPassword);
    return { temporaryPassword, emailed };
  }

  // Users of a role with how many projects they own as client
  async list(role?: string): Promise<(User & { projectCount: number })[]> {
    const users = await this.usersRepository.find({
      where: role ? { role } : {},
      order: { createdAt: 'DESC' },
    });
    const counts: { clientId: string; count: string }[] = await this.projectsRepository
      .createQueryBuilder('project')
      .select('project.clientId', 'clientId')
      .addSelect('COUNT(project.id)', 'count')
      .groupBy('project.clientId')
      .getRawMany();
    const byClient = new Map(counts.map((c) => [c.clientId, parseInt(c.count, 10)]));
    return users.map((u) => ({ ...u, projectCount: byClient.get(u.id) ?? 0 }));
  }

  async updateProfile(id: string, dto: UpdateMeDto): Promise<User | null> {
    if (dto.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing && existing.id !== id) throw new ConflictException('Email already in use');
    }
    await this.usersRepository.update(id, dto);
    return this.findById(id);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    await this.verifyPassword(id, currentPassword);
    await this.usersRepository.update(id, { password: await bcrypt.hash(newPassword, 10), mustChangePassword: false });
  }

  async deleteAccount(id: string, password: string): Promise<void> {
    const user = await this.verifyPassword(id, password);
    if (user.role === 'admin' && (await this.usersRepository.count({ where: { role: 'admin' } })) <= 1) {
      throw new BadRequestException('Cannot delete the only admin account');
    }
    if (await this.projectsRepository.count({ where: { clientId: id } })) {
      throw new BadRequestException('Account owns projects; reassign or delete them first');
    }
    await this.usersRepository.delete(id);
  }

  private async verifyPassword(id: string, password: string): Promise<User> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) throw new NotFoundException('User not found');
    if (!(await bcrypt.compare(password, user.password))) {
      // Not 401: the web client treats 401 as an expired session and signs the user out
      throw new BadRequestException('Current password is incorrect');
    }
    return user;
  }
}
