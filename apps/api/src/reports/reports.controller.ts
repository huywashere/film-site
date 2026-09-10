import { Body, Controller, HttpCode, Ip, Post, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { CreateContactMessageDto, CreateIssueReportDto } from './reports.dto';
import { ReportsService } from './reports.service';
import { TurnstileService } from '../auth/turnstile.service';

@Controller('contact')
export class ContactController {
  constructor(
    private readonly reports: ReportsService,
    private readonly turnstile: TurnstileService,
  ) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  async create(@Ip() ip: string, @Body() body: CreateContactMessageDto) {
    await this.turnstile.verify(body.turnstileToken, ip, 'contact');
    return this.reports.createContact(body);
  }
}

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
