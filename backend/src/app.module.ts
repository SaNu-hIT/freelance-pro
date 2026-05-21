import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { FreelancerProfile } from './entities/freelancer-profile.entity';
import { Project } from './entities/project.entity';
import { Worklog } from './entities/worklog.entity';
import { Payment } from './entities/payment.entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { WorklogsModule } from './worklogs/worklogs.module';
import { FreelancersModule } from './freelancers/freelancers.module';
import { PaymentsModule } from './payments/payments.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { Inquiry } from './inquiries/inquiry.entity';
import { TasksModule } from './tasks/tasks.module';
import { ProjectTask } from './entities/project-task.entity';
import { SprintsModule } from './sprints/sprints.module';
import { ProjectSprint } from './entities/project-sprint.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        host: configService.get<string>('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get<string>('DATABASE_USER', 'postgres'),
        password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
        database: configService.get<string>('DATABASE_NAME', 'freelance_pro'),
        entities: [User, FreelancerProfile, Project, Worklog, Payment, Inquiry, ProjectTask, ProjectSprint],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ProjectsModule,
    WorklogsModule,
    FreelancersModule,
    PaymentsModule,
    InquiriesModule,
    TasksModule,
    SprintsModule,
  ],
})
export class AppModule {}
