import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('inquiries')
export class Inquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  type: 'project_idea' | 'callback'

  @Column({ type: 'varchar' })
  name: string

  @Column({ type: 'varchar' })
  email: string

  @Column({ type: 'varchar', nullable: true })
  phone: string

  @Column({ type: 'varchar', nullable: true })
  projectTitle: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ type: 'varchar', nullable: true })
  budgetRange: string

  @Column({ type: 'varchar', nullable: true })
  timeline: string

  @Column({ type: 'varchar', nullable: true })
  preferredCallbackTime: string

  @Column({ type: 'varchar', default: 'new' })
  status: string

  @CreateDateColumn()
  createdAt: Date
}
