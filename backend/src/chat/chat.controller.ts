import { Controller, Get, Post, Patch, Body, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatQuery, MarkReadDto, SendMessageDto } from './chat.dto';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private service: ChatService) {}

  @Get('messages')
  getMessages(@Request() req: any, @Query() query: ChatQuery) {
    return this.service.getMessages(req.user, query.projectId);
  }

  // Sender, side and project title come from the signed-in user and the project, never the body
  @Post('messages')
  send(@Request() req: any, @Body() body: SendMessageDto) {
    return this.service.send(req.user, body.projectId, body.text);
  }

  @Patch('messages/mark-read')
  async markRead(@Request() req: any, @Body() body: MarkReadDto) {
    await this.service.markRead(req.user, body.projectId);
  }

  @Get('unread')
  async unread(@Request() req: any, @Query() query: ChatQuery) {
    return { count: await this.service.unreadCount(req.user, query.projectId) };
  }
}
