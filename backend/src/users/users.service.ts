import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { UpdateMeDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
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
    await this.usersRepository.update(id, { password: await bcrypt.hash(newPassword, 10) });
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
      throw new UnauthorizedException('Current password is incorrect');
    }
    return user;
  }
}
