import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';

@Entity('project_documents')
export class ProjectDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  uploadedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @Column()
  name: string;

  @Column()
  mimeType: string;

  @Column('int')
  size: number;

  @Column({ type: 'enum', enum: ['deliverable', 'contract', 'report', 'invoice', 'attachment'], default: 'attachment' })
  type: string;

  @Column({ type: 'enum', enum: ['delivered', 'in-review'], default: 'delivered' })
  status: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // File bytes live in Postgres so uploads survive container redeploys
  @Column({ type: 'bytea', select: false })
  data: Buffer;

  @CreateDateColumn()
  createdAt: Date;
}
