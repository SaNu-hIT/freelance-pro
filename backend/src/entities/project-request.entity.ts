import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';

// question: team asks the client. change: client asks the team for changes.
// escalation: client raises an issue with the admins.
export type ProjectRequestKind = 'question' | 'change' | 'escalation';

@Entity('project_requests')
export class ProjectRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'enum', enum: ['question', 'change', 'escalation'] })
  kind: ProjectRequestKind;

  @Column('uuid')
  fromUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'fromUserId' })
  fromUser: User;

  @Column()
  subject: string;

  @Column('text')
  body: string;

  @Column({ type: 'enum', enum: ['normal', 'high', 'critical'], default: 'normal' })
  urgency: string;

  @Column({ type: 'enum', enum: ['open', 'resolved'], default: 'open' })
  status: string;

  @Column({ type: 'text', nullable: true })
  reply: string | null;

  @Column('uuid', { nullable: true })
  resolvedById: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
