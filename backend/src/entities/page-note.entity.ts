import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProjectPage } from './project-page.entity';
import { User } from './user.entity';

// internal: only the team sees it. client: the project's client sees it too.
export type NoteVisibility = 'internal' | 'client';

@Entity('page_notes')
export class PageNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  pageId: string;

  @ManyToOne(() => ProjectPage, (page) => page.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pageId' })
  page: ProjectPage;

  @Column('uuid', { nullable: true })
  authorId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorId' })
  author: User | null;

  @Column('text')
  body: string;

  @Column({ type: 'varchar', length: 16, default: 'internal' })
  visibility: NoteVisibility;

  @CreateDateColumn()
  createdAt: Date;
}
