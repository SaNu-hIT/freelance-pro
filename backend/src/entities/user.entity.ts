import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { FreelancerProfile } from './freelancer-profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  // Never returned by default; login selects it explicitly
  @Column({ select: false })
  password: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['admin', 'freelancer', 'client'] })
  role: string;

  // Set when an admin resets the password; the user must choose their own at next login
  @Column({ default: false })
  mustChangePassword: boolean;

  @Column({ nullable: true })
  profileImage: string;

  @Column({ nullable: true, type: 'varchar' })
  phone: string | null;

  @Column({ nullable: true, type: 'varchar' })
  company: string | null;

  @Column({ type: 'jsonb', nullable: true })
  notificationPrefs: Record<string, boolean> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => FreelancerProfile, (profile) => profile.user, {
    nullable: true,
  })
  freelancerProfile: FreelancerProfile;
}
