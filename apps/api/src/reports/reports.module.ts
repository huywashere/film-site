import { Module } from '@nestjs/common';
import { ContactController, ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController, ContactController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
