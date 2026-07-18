import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: { watchlist: true, reviews: true, followers: true, following: true },
        },
      },
    });
    if (!user) throw new NotFoundException('User không tồn tại');
    return user;
  }

  async updateMe(userId: string, dto: { displayName?: string; bio?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true, username: true, displayName: true, avatarUrl: true, bio: true,
      },
    });
  }

  async getRecentActivity(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User không tồn tại');

    return this.prisma.review.findMany({
      where: { userId: user.id },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { movie: true },
    });
  }
}
