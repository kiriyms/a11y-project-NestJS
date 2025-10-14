import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { BullModule } from '@nestjs/bullmq';
import {
  ACCESSIBILITY_ANALYSIS_QUEUE,
  REPORT_GENERATION_QUEUE,
} from 'src/common/constants';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: ACCESSIBILITY_ANALYSIS_QUEUE },
      { name: REPORT_GENERATION_QUEUE },
    ),
  ],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
