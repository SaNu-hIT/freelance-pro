import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('platform_settings')
export class PlatformSettings {
  @PrimaryColumn({ default: 'singleton' })
  id: string;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ default: 'UTC+5:30' })
  timezone: string;

  @Column({ default: false })
  maintenanceMode: boolean;

  @Column({ default: true })
  newRegistrations: boolean;

  @Column({ default: true })
  requireApproval: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
