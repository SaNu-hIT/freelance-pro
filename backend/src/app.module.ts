import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ProfilePrivacyInterceptor } from './common/profile-privacy.interceptor';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { FreelancerProfile } from './entities/freelancer-profile.entity';
import { Project } from './entities/project.entity';
import { Worklog } from './entities/worklog.entity';
import { Payment } from './entities/payment.entity';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
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
import { SkillGroupsModule } from './skill-groups/skill-groups.module';
import { SkillGroup } from './entities/skill-group.entity';
import { PlatformSettingsModule } from './platform-settings/platform-settings.module';
import { PlatformSettings } from './entities/platform-settings.entity';
import { ChatModule } from './chat/chat.module';
import { ChatMessage } from './entities/chat-message.entity';
import { ProjectRequest } from './entities/project-request.entity';
import { ProjectRequestsModule } from './project-requests/project-requests.module';
import { ProjectDocument } from './entities/project-document.entity';
import { DocumentsModule } from './documents/documents.module';
import { ProjectPage } from './entities/project-page.entity';
import { PageNote } from './entities/page-note.entity';
import { PagesModule } from './pages/pages.module';
import { Correction } from './entities/correction.entity';
import { CorrectionComment } from './entities/correction-comment.entity';
import { CorrectionsModule } from './corrections/corrections.module';

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
        entities: [User, FreelancerProfile, Project, Worklog, Payment, Inquiry, ProjectTask, ProjectSprint, SkillGroup, PlatformSettings, ChatMessage, ProjectRequest, ProjectDocument, ProjectPage, PageNote, Correction, CorrectionComment],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),
    MailModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    ProjectRequestsModule,
    DocumentsModule,
    PagesModule,
    CorrectionsModule,
    WorklogsModule,
    FreelancersModule,
    PaymentsModule,
    InquiriesModule,
    TasksModule,
    SprintsModule,
    SkillGroupsModule,
    PlatformSettingsModule,
    ChatModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: ProfilePrivacyInterceptor }],
})
export class AppModule {}
