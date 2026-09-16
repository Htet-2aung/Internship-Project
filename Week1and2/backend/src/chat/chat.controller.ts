import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { User } from '@prisma/client';
import { ChatService } from './chat.service.js';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('sessions')
  listSessions(@Req() request: { user: User }) { return this.chatService.listSessions(request.user.id); }

  @Post('sessions')
  createSession(@Req() request: { user: User }, @Body() body: { title?: string }) { return this.chatService.createSession(request.user.id, body.title); }

  @Patch('sessions/:id')
  updateSession(@Req() request: { user: User }, @Param('id', ParseIntPipe) id: number, @Body() body: { title: string }) { return this.chatService.updateSession(request.user.id, id, body.title); }

  @Delete('sessions/:id')
  deleteSession(@Req() request: { user: User }, @Param('id', ParseIntPipe) id: number) { return this.chatService.deleteSession(request.user.id, id); }

  @Get('sessions/:id/messages')
  listMessages(@Req() request: { user: User }, @Param('id', ParseIntPipe) id: number) { return this.chatService.listMessages(request.user.id, id); }

  @Post('sessions/:id/messages')
  ask(@Req() request: { user: User }, @Param('id', ParseIntPipe) id: number, @Body() body: { content: string }) { return this.chatService.ask(request.user.id, id, body.content); }
}