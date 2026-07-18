import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });

    if (existingUser) {
      throw new ConflictException('Email hoặc username đã tồn tại');
    }

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash: hash,
        displayName: dto.username,
      },
    });

    return this.signTokens(user.id, user.email, user.username);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.email }] },
    });

    if (!user) throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');

    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');

    return this.signTokens(user.id, user.email, user.username);
  }

  async signTokens(userId: string, email: string, username: string) {
    const payload = { sub: userId, email, username };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
        secret: this.config.get('JWT_SECRET'),
      }),
      this.jwt.signAsync(payload, {
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
        secret: this.config.get('JWT_REFRESH_SECRET'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async refreshTokens(token: string) {
    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      return this.signTokens(payload.sub, payload.email, payload.username);
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
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
  }
}
