import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}

  async rate(userId: string, movieId: string, score: number) {
    await this.prisma.movie.upsert({
      where: { id: movieId },
      create: { id: movieId, title: movieId, type: "unknown" },
      update: {},
    });

    return this.prisma.rating.upsert({
      where: { userId_movieId: { userId, movieId } },
      create: { userId, movieId, score },
      update: { score },
    });
  }

  async getAverage(movieId: string) {
    const result = await this.prisma.rating.aggregate({
      where: { movieId },
      _avg: { score: true },
      _count: true,
    });
    return { average: result._avg.score || 0, count: result._count };
  }

  async getUserRating(userId: string, movieId: string) {
    return this.prisma.rating.findUnique({
      where: { userId_movieId: { userId, movieId } },
    });
  }
}
