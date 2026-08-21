import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { CreateIssueReportDto } from "./reports.dto";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @HttpCode(201)
  create(@Body() body: CreateIssueReportDto) {
    return this.reports.create(body);
  }
}
