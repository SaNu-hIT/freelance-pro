import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from '../entities/chat-message.entity';
import { User } from '../entities/user.entity';
import { ProjectsModule } from '../projects/projects.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage, User]), ProjectsModule],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
