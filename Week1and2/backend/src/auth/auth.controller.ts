import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: Record<string, any>) {
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  async login(@Body() body: Record<string, any>) {
    return this.authService.login(body.email, body.password);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() request: { user: User }) {
    const { password, ...profile } = request.user;
    return profile;
  }
}