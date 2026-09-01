import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIssueReportDto } from './reports.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateIssueReportDto, reporter: { id: string; email?: string }) {
    const criticalCategories = new Set(['playback', 'audio']);
    return this.prisma.$transaction(async (transaction) => {
      const report = await transaction.issueReport.create({
        data: {
          ...data,
          email: reporter.email || data.email,
          priority: criticalCategories.has(data.category) ? 'HIGH' : 'NORMAL',
        },
        select: { id: true, status: true, priority: true, createdAt: true },
      });
      await transaction.adminNotification.create({
        data: {
          type: 'issue_report',
          title: data.filmTitle ? `Báo lỗi: ${data.filmTitle}` : 'Báo lỗi hệ thống mới',
          message: `[${reporter.id}] ${data.description.slice(0, 500)}`,
          severity: criticalCategories.has(data.category) ? 'critical' : 'warning',
          link: `/reports?report=${report.id}`,
        },
      });
      return report;
    });
  }
}
