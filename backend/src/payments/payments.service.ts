import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payment.dto';

export interface PaymentQuery {
  freelancerId?: string;
  projectId?: string;
  status?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {}

  async findAll(query: PaymentQuery): Promise<Payment[]> {
    const { freelancerId, projectId, status } = query;
    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.project', 'project')
      .leftJoinAndSelect('payment.freelancer', 'freelancer')
      .leftJoinAndSelect('freelancer.user', 'user');

    if (freelancerId) qb.andWhere('payment.freelancerId = :freelancerId', { freelancerId });
    if (projectId) qb.andWhere('payment.projectId = :projectId', { projectId });
    if (status) qb.andWhere('payment.status = :status', { status });

    qb.orderBy('payment.createdAt', 'DESC');
    return qb.getMany();
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: { project: true, freelancer: { user: true } },
    });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);
    return payment;
  }

  async create(dto: CreatePaymentDto): Promise<Payment> {
    const deductions = dto.deductions || 0;
    const netAmount = dto.amount - deductions;

    const payment = this.paymentsRepository.create({
      ...dto,
      deductions,
      netAmount,
      status: 'pending',
    });
    return this.paymentsRepository.save(payment);
  }

  async update(id: string, dto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id);
    Object.assign(payment, dto);

    // Recalculate netAmount if amount or deductions changed
    if (dto.amount !== undefined || dto.deductions !== undefined) {
      const amount = dto.amount !== undefined ? dto.amount : payment.amount;
      const deductions = dto.deductions !== undefined ? dto.deductions : payment.deductions;
      payment.netAmount = Number(amount) - Number(deductions);
    }

    return this.paymentsRepository.save(payment);
  }
}
