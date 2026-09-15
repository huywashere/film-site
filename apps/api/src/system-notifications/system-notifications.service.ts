import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../redis/redis.service';
import {
  CreateSystemNotificationDto,
  UpdateSystemNotificationDto,
} from './system-notifications.dto';

const PUBLIC_CACHE_KEY = 'system-notifications:public';

const DEFAULT_SEEDS = [
  {
    title: 'Chào mừng bạn đến với FlexPhim',
    message:
      'Xem phim chuẩn 4K siêu nét, tự động lọc sạch quảng cáo nhà cái từ gốc M3U8.',
    tag: 'Hệ thống',
    priority: 10,
    isActive: true,
  },
  {
    title: 'Chế độ Rạp Phim Mở Rộng',
    message:
      "Tính năng mở rộng khung hình cực đại (bấm nút 'Rạp phim' hoặc phím tắt 'T').",
    tag: 'Tính năng',
    priority: 8,
    isActive: true,
  },
  {
    title: 'Phòng Xem Chung (Watch Party)',
    message:
      'Tạo phòng xem cùng bạn bè, đồng bộ tua phim và trò chuyện trực tiếp mượt mà.',
    tag: 'Watch Party',
    link: '/watch-party',
    priority: 6,
    isActive: true,
  },
  {
    title: 'Bộ Lọc Luồng Tự Động',
    message:
      'Hệ thống tự động định tuyến máy chủ m3u8 tối ưu nhất cho từng tập phim.',
    tag: 'Hệ thống',
    priority: 4,
    isActive: true,
  },
];

@Injectable()
export class SystemNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  private async invalidateCache() {
    await this.cache.del(PUBLIC_CACHE_KEY).catch(() => undefined);
  }

  /**
   * Public: Get all active, unexpired notifications for user-facing site
   */
  async getPublicNotifications() {
    const cached = await this.cache.getJson<any[]>(PUBLIC_CACHE_KEY).catch(() => null);
    if (cached && Array.isArray(cached)) {
      return cached;
    }

    const count = await this.prisma.systemNotification.count();
    if (count === 0) {
      // Auto-seed default notifications on first run
      await this.prisma.systemNotification.createMany({
        data: DEFAULT_SEEDS,
        skipDuplicates: true,
      });
    }

    const now = new Date();
    const items = await this.prisma.systemNotification.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });

    await this.cache.setJson(PUBLIC_CACHE_KEY, items, 300).catch(() => undefined);
    return items;
  }

  /**
   * Admin: Get all notifications with pagination and search
   */
  async getAllAdmin(query: {
    page?: number;
    limit?: number;
    search?: string;
    tag?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.tag && query.tag !== 'all') {
      where.tag = query.tag;
    }
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { message: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.systemNotification.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.systemNotification.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: Create notification
   */
  async create(dto: CreateSystemNotificationDto) {
    const created = await this.prisma.systemNotification.create({
      data: {
        title: dto.title.trim(),
        message: dto.message.trim(),
        tag: dto.tag?.trim() || 'Hệ thống',
        link: dto.link?.trim() || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        priority: dto.priority !== undefined ? dto.priority : 0,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    await this.invalidateCache();
    return created;
  }

  /**
   * Admin: Update notification
   */
  async update(id: string, dto: UpdateSystemNotificationDto) {
    const existing = await this.prisma.systemNotification.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy thông báo hệ thống');
    }

    const updated = await this.prisma.systemNotification.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.message !== undefined ? { message: dto.message.trim() } : {}),
        ...(dto.tag !== undefined ? { tag: dto.tag.trim() } : {}),
        ...(dto.link !== undefined ? { link: dto.link?.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
          : {}),
      },
    });

    await this.invalidateCache();
    return updated;
  }

  /**
   * Admin: Toggle active state
   */
  async toggle(id: string) {
    const existing = await this.prisma.systemNotification.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy thông báo hệ thống');
    }

    const updated = await this.prisma.systemNotification.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    await this.invalidateCache();
    return updated;
  }

  /**
   * Admin: Delete notification
   */
  async delete(id: string) {
    const existing = await this.prisma.systemNotification.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy thông báo hệ thống');
    }

    const deleted = await this.prisma.systemNotification.delete({
      where: { id },
    });

    await this.invalidateCache();
    return deleted;
  }
}
