import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    return this.prisma.user.findMany({
      select: { id: true, email: true, createdAt: true, updatedAt: true },
      orderBy: { id: 'asc' },
    });
  }

  async updateUser(id: number, email: string): Promise<Omit<User, 'password'>> {
    return this.prisma.user.update({
      where: { id },
      data: { email },
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });
  }

  async deleteUser(id: number): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}