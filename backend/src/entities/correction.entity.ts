import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Project } from './project.entity';
import { ProjectPage } from './project-page.entity';
import { User } from './user.entity';
import { CorrectionComment } from './correction-comment.entity';
import { ProjectDocument } from './project-document.entity';

// open: waiting for the team. needs_info: waiting for the client. fixed: waiting for the client to confirm.
export const CORRECTION_STATUSES = [
  'open',
  'triaged',
  'needs_info',
  'in_progress',
  'fixed',
  'confirmed',
  'reopened',
  'wontfix',
] as const;
export type CorrectionStatus = (typeof CORRECTION_STATUSES)[number];
export type CorrectionPriority = 'low' | 'normal' | 'high';
export type CorrectionViewport = 'desktop' | 'mobile' | 'both';

// A change the client asks for on one page of the delivered website
@Entity('corrections')
@Unique(['projectId', 'number'])
export class Correction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  // C-1, C-2, … per project
  @Column('int')
  number: number;

  // Null for a correction that is about the whole site, or whose page was deleted
  @Column('uuid', { nullable: true })
  pageId: string | null;

  @ManyToOne(() => ProjectPage, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pageId' })
  page: ProjectPage | null;

  // The page address when the correction was made, kept if the page is deleted
  @Column({ type: 'text', nullable: true })
  pageUrl: string | null;

  @Column('uuid', { nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column('text')
  body: string;

  @Column({ type: 'varchar', length: 16, default: 'normal' })
  priority: CorrectionPriority;

  @Column({ type: 'varchar', length: 16, nullable: true })
  viewport: CorrectionViewport | null;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: CorrectionStatus;

  // How many times the client sent it back after it was marked fixed
  @Column('int', { default: 0 })
  reopenCount: number;

  @OneToMany(() => CorrectionComment, (c) => c.correction)
  comments: CorrectionComment[];

  @OneToMany(() => ProjectDocument, (d) => d.correction)
  screenshots: ProjectDocument[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
