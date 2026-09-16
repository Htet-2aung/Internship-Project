import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';

@Module({
  controllers: [ChatController],
  providers: [PrismaService, ChatService],
})
export class ChatModule {}