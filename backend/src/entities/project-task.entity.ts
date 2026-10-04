import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
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

  // Set while a freelancer's worklog timer is running on this task
  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  startedById: string | null;

  @ManyToOne(() => FreelancerProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'startedById' })
  startedBy: FreelancerProfile | null;
}
