import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { FreelancerProfile } from './freelancer-profile.entity';

@Entity('worklogs')
export class Worklog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, (p) => p.worklogs)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  freelancerId: string;

  @ManyToOne(() => FreelancerProfile)
  @JoinColumn({ name: 'freelancerId' })
  freelancer: FreelancerProfile;

  @Column('date')
  date: string;

  @Column('decimal', { precision: 5, scale: 2 })
  hoursWorked: number;

  @Column('text')
  tasksCompleted: string;

  @Column({ default: 0 })
  progress: number;

  @Column({ nullable: true, type: 'text' })
  blockers: string;

  @Column({ nullable: true, type: 'text' })
  nextSteps: string;

  @Column('text', { array: true, default: [] })
  fileUrls: string[];

  @CreateDateColumn()
  createdAt: Date;
}
