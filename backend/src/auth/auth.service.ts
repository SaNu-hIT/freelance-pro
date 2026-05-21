import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { FreelancerProfile } from '../entities/freelancer-profile.entity';
import { RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(FreelancerProfile)
    private freelancerProfileRepository: Repository<FreelancerProfile>,
    private jwtService: JwtService,
  ) {}

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
    const user = await this.usersRepository.findOne({ where: { email } });
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
