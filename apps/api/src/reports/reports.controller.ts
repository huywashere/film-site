import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { CreateIssueReportDto } from "./reports.dto";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(ThrottlerGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Max 5 issue reports per minute per IP to prevent spamming
  create(@Body() body: CreateIssueReportDto) {
    return this.reports.create(body);
  }
}
