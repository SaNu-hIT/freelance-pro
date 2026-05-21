import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Inquiry } from './inquiry.entity'

@Injectable()
export class InquiriesService {
  constructor(
    @InjectRepository(Inquiry)
    private repo: Repository<Inquiry>,
  ) {}

  create(data: Partial<Inquiry>) {
    const inquiry = this.repo.create(data)
    return this.repo.save(inquiry)
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } })
  }

  async updateStatus(id: string, status: string) {
    await this.repo.update(id, { status })
    return this.repo.findOne({ where: { id } })
  }
}
