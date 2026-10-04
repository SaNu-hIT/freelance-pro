import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Project } from './project.entity';
import { PageNote } from './page-note.entity';

// How a page got into the list: read from sitemap.xml, found by following links, or added by hand
export type PageSource = 'sitemap' | 'crawl' | 'manual';

// One page (link) of the website a project delivers
@Entity('project_pages')
@Unique(['projectId', 'url'])
export class ProjectPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  // Normalized absolute URL: origin + path, no query, hash or trailing slash
  @Column('text')
  url: string;

  @Column('text')
  path: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 16, default: 'manual' })
  source: PageSource;

  @Column({ default: false })
  archived: boolean;

  // Last time discovery saw this page on the site
  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @OneToMany(() => PageNote, (note) => note.page)
  notes: PageNote[];

  @CreateDateColumn()
  createdAt: Date;
}
