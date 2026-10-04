import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Correction } from './correction.entity';
import { User } from './user.entity';
import type { NoteVisibility } from './page-note.entity';

// question: the team needs the client's input. answer: the client's reply to one. status: a status change.
export type CorrectionCommentKind =
  | 'comment'
  | 'question'
  | 'answer'
  | 'status';

@Entity('correction_comments')
export class CorrectionComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  correctionId: string;

  @ManyToOne(() => Correction, (c) => c.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'correctionId' })
  correction: Correction;

  @Column('uuid', { nullable: true })
  authorId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorId' })
  author: User | null;

  @Column({ type: 'varchar', length: 16, default: 'comment' })
  kind: CorrectionCommentKind;

  @Column('text')
  body: string;

  @Column({ type: 'varchar', length: 16, default: 'client' })
  visibility: NoteVisibility;

  @CreateDateColumn()
  createdAt: Date;
}
