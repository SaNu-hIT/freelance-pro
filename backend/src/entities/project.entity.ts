import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { User } from './user.entity';
import { FreelancerProfile } from './freelancer-profile.entity';
import { Worklog } from './worklog.entity';
import { Payment } from './payment.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 12, scale: 2 })
  budget: number;

  @Column('date')
  deadline: string;

  @Column({
    type: 'enum',
    enum: ['new', 'assigned', 'in_progress', 'blocked', 'pending_approval', 'completed', 'delayed'],
    default: 'new',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  priority: string;

  @Column('uuid')
  clientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'clientId' })
  client: User;

  // Legacy single-assignee kept for compatibility
  @Column('uuid', { nullable: true })
  assignedTo: string;

  @ManyToOne(() => FreelancerProfile, { nullable: true })
  @JoinColumn({ name: 'assignedTo' })
  assignedFreelancer: FreelancerProfile;

  // Team: multiple freelancers per project
  @ManyToMany(() => FreelancerProfile, { eager: false })
  @JoinTable({
    name: 'project_team_members',
    joinColumn: { name: 'projectId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'freelancerId', referencedColumnName: 'id' },
  })
  teamMembers: FreelancerProfile[];

  @Column({ default: 0 })
  progress: number;

  @Column('text', { nullable: true })
  requirements: string;

  @Column({ nullable: true, type: 'varchar' })
  repoUrl: string;

  @Column({ nullable: true, type: 'varchar' })
  liveUrl: string;

  @Column({ nullable: true, type: 'varchar' })
  correctionSheetUrl: string;

  @Column('text', { array: true, default: [] })
  fileUrls: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Worklog, (w) => w.project)
  worklogs: Worklog[];

  @OneToMany(() => Payment, (p) => p.project)
  payments: Payment[];
}
