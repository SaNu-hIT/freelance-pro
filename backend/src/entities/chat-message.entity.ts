import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @Column()
  projectTitle: string;

  @Column({ type: 'varchar', enum: ['client', 'admin'] })
  from: 'client' | 'admin';

  @Column()
  sender: string;

  @Column()
  senderId: string;

  @Column('text')
  text: string;

  @Column({ default: false })
  readByAdmin: boolean;

  @Column({ default: false })
  readByClient: boolean;

  @CreateDateColumn()
  ts: Date;
}
