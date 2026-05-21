import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { FreelancerProfile } from './freelancer-profile.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, (p) => p.payments)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  freelancerId: string;

  @ManyToOne(() => FreelancerProfile)
  @JoinColumn({ name: 'freelancerId' })
  freelancer: FreelancerProfile;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  deductions: number;

  @Column('decimal', { precision: 12, scale: 2 })
  netAmount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'paid', 'partial'],
    default: 'pending',
  })
  status: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
