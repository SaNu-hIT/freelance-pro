import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSettings } from '../entities/platform-settings.entity';

const SINGLETON_ID = 'singleton';

@Injectable()
export class PlatformSettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(PlatformSettings)
    private repo: Repository<PlatformSettings>,
  ) {}

  async onModuleInit() {
    const exists = await this.repo.findOne({ where: { id: SINGLETON_ID } });
    if (!exists) {
      await this.repo.save(this.repo.create({ id: SINGLETON_ID }));
    }
  }

  async get(): Promise<PlatformSettings> {
    return this.repo.findOne({ where: { id: SINGLETON_ID } }) as Promise<PlatformSettings>;
  }

  async update(data: Partial<Omit<PlatformSettings, 'id' | 'updatedAt'>>): Promise<PlatformSettings> {
    await this.repo.update(SINGLETON_ID, data);
    return this.get();
  }
}
