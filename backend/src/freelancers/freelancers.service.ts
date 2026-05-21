import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FreelancerProfile } from '../entities/freelancer-profile.entity';
import { UpdateFreelancerDto, RejectFreelancerDto, UpdateStageDto } from './dto/freelancer.dto';

export interface FreelancerQuery {
  status?: string;
  search?: string;
}

@Injectable()
export class FreelancersService {
  constructor(
    @InjectRepository(FreelancerProfile)
    private freelancerProfileRepository: Repository<FreelancerProfile>,
  ) {}

  async findAll(query: FreelancerQuery): Promise<FreelancerProfile[]> {
    const { status, search } = query;
    const qb = this.freelancerProfileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user');

    if (status) qb.andWhere('profile.status = :status', { status });
    if (search) {
      qb.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('profile.createdAt', 'DESC');
    return qb.getMany();
  }

  async findOne(id: string): Promise<FreelancerProfile> {
    const profile = await this.freelancerProfileRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!profile) throw new NotFoundException(`Freelancer profile ${id} not found`);
    return profile;
  }

  async findByUserId(userId: string): Promise<FreelancerProfile | null> {
    return this.freelancerProfileRepository.findOne({
      where: { userId },
      relations: { user: true },
    });
  }

  async update(id: string, dto: UpdateFreelancerDto): Promise<FreelancerProfile> {
    const profile = await this.findOne(id);
    Object.assign(profile, dto);
    return this.freelancerProfileRepository.save(profile);
  }

  async approve(id: string): Promise<FreelancerProfile> {
    const profile = await this.findOne(id);
    profile.status = 'active';
    profile.onboardingStage = 'approved';
    return this.freelancerProfileRepository.save(profile);
  }

  async reject(id: string, dto: RejectFreelancerDto): Promise<FreelancerProfile> {
    const profile = await this.findOne(id);
    profile.status = 'inactive';
    profile.onboardingStage = 'rejected';
    profile.rejectionReason = dto.reason;
    return this.freelancerProfileRepository.save(profile);
  }

  async updateStage(id: string, dto: UpdateStageDto): Promise<FreelancerProfile> {
    const profile = await this.findOne(id);
    profile.onboardingStage = dto.stage;
    // Keep status in sync
    if (dto.stage === 'approved') profile.status = 'active';
    if (dto.stage === 'rejected') profile.status = 'inactive';
    return this.freelancerProfileRepository.save(profile);
  }

  async updateStatus(id: string, status: string): Promise<FreelancerProfile> {
    const profile = await this.findOne(id);
    profile.status = status;
    return this.freelancerProfileRepository.save(profile);
  }

  async updateVerifications(id: string, verifications: Record<string, boolean>): Promise<FreelancerProfile> {
    const profile = await this.findOne(id);
    profile.verifications = { ...(profile.verifications ?? {}), ...verifications };
    return this.freelancerProfileRepository.save(profile);
  }
}
