import { Body, Controller, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { CreateIssueReportDto } from './reports.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Max 5 issue reports per minute per IP to prevent spamming
  create(
    @Request() req: { user: { id: string; email?: string } },
    @Body() body: CreateIssueReportDto,
  ) {
    return this.reports.create(body, req.user);
  }
}
