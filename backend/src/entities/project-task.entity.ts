import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { ProjectSprint } from './project-sprint.entity';
import { FreelancerProfile } from './freelancer-profile.entity';

@Entity('project_tasks')
export class ProjectTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'uuid', nullable: true })
  sprintId: string | null;

  // Deleting a sprint moves its tasks back to the backlog
  @ManyToOne(() => ProjectSprint, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sprintId' })
  sprint: ProjectSprint | null;

  @Column({ type: 'uuid', nullable: true })
  assignedFreelancerId: string | null;

  @ManyToOne(() => FreelancerProfile, { nullable: true })
  @JoinColumn({ name: 'assignedFreelancerId' })
  assignedFreelancer: FreelancerProfile | null;

  @Column()
  title: string;

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  // When the task was marked in progress; stays set until it is done or moved back to to-do
  @Column({ type: 'timestamp', nullable: true })
  inProgressAt: Date | null;

  // Set while a freelancer's worklog timer is running on this task
  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  startedById: string | null;

  @ManyToOne(() => FreelancerProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'startedById' })
  startedBy: FreelancerProfile | null;

  // Filed by the external assistant (WhatsApp intake). All null on tasks made in the app.
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  type: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  priority: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  source: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  customerName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customerPhone: string | null;

  @Column({ type: 'text', nullable: true })
  originalMessage: string | null;

  // One task per source message: a retried delivery finds the task it already made
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  messageId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  receivedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  attachments: { url: string; type: 'image' | 'audio' | 'document' }[] | null;
}
