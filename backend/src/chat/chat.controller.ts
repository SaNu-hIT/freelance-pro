import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private service: ChatService) {}

  @Get('messages')
  getMessages(@Query('projectId') projectId?: string) {
    return this.service.getMessages(projectId);
  }

  @Post('messages')
  send(@Body() body: {
    projectId: string;
    projectTitle: string;
    from: 'client' | 'admin';
    sender: string;
    senderId: string;
    text: string;
    readByAdmin?: boolean;
    readByClient?: boolean;
  }) {
    return this.service.send(body);
  }

  @Patch('messages/mark-read')
  markRead(@Body() body: { projectId: string; by: 'admin' | 'client' }) {
    if (body.by === 'admin') return this.service.markReadByAdmin(body.projectId);
    return this.service.markReadByClient(body.projectId);
  }

  @Get('unread')
  async unread(@Query('by') by: 'admin' | 'client', @Query('projectId') projectId?: string) {
    const count = by === 'admin'
      ? await this.service.unreadCountForAdmin(projectId)
      : await this.service.unreadCountForClient(projectId);
    return { count };
  }
}
