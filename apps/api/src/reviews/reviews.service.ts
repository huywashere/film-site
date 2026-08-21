import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async getByMovie(movieId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { movieId, isHidden: false },
        include: {
          user: {
            select: { username: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { movieId, isHidden: false } }),
    ]);
    return { reviews, total, page, pages: Math.ceil(total / limit) };
  }

  async create(
    userId: string,
    dto: { movieId: string; content: string; rating?: number },
  ) {
    // Upsert movie record if not exists
    await this.prisma.movie.upsert({
      where: { id: dto.movieId },
      create: { id: dto.movieId, title: dto.movieId, type: "unknown" },
      update: {},
    });

    return this.prisma.review.create({
      data: {
        userId,
        movieId: dto.movieId,
        content: dto.content,
        rating: dto.rating,
      },
      include: {
        user: {
          select: { username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }

  async delete(userId: string, reviewId: string) {
    return this.prisma.review.deleteMany({
      where: { id: reviewId, userId },
    });
  }

  async toggleLike(userId: string, reviewId: string) {
    const existing = await this.prisma.reviewLike.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
    });

    if (existing) {
      await this.prisma.reviewLike.delete({
        where: { userId_reviewId: { userId, reviewId } },
      });
      await this.prisma.review.update({
        where: { id: reviewId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false };
    } else {
      await this.prisma.reviewLike.create({ data: { userId, reviewId } });
      await this.prisma.review.update({
        where: { id: reviewId },
        data: { likeCount: { increment: 1 } },
      });
      return { liked: true };
    }
  }

  async getRecent(page = 1, limit = 20) {
    return this.prisma.review.findMany({
      where: { isHidden: false },
      include: {
        user: {
          select: { username: true, displayName: true, avatarUrl: true },
        },
        movie: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async getMine(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { userId },
        include: { movie: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { userId } }),
    ]);

    return { reviews, total, page, pages: Math.ceil(total / limit) };
  }
}
