import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('freelancer_profiles')
export class FreelancerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @OneToOne(() => User, (user) => user.freelancerProfile)
  @JoinColumn()
  user: User;

  @Column('text', { array: true, default: [] })
  skills: string[];

  @Column({ default: 0 })
  experience: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  hourlyRate: number;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'pending'],
    default: 'pending',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['applied', 'reviewing', 'assessment', 'approved', 'rejected'],
    default: 'applied',
  })
  onboardingStage: string;

  @Column({ nullable: true, type: 'text' })
  bio: string;

  @Column({ nullable: true, type: 'text' })
  portfolioUrl: string;

  @Column({
    type: 'enum',
    enum: ['professional', 'intern'],
    default: 'professional',
    nullable: true,
  })
  track: string;

  @Column({ nullable: true, type: 'text' })
  rejectionReason: string;

  @Column({ nullable: true, type: 'text' })
  adminNotes: string;

  @Column({ type: 'jsonb', nullable: true, default: null })
  verifications: Record<string, boolean> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
