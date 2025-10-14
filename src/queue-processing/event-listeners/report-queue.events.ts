import {
  OnQueueEvent,
  QueueEventsHost,
  QueueEventsListener,
} from '@nestjs/bullmq';
import { QueueName, REPORT_GENERATION_QUEUE } from 'src/common/constants';
import { ReportGenerationDto } from 'src/modules/report/dto/report-generation.dto';
import { ReportService } from 'src/modules/report/report.service';

@QueueEventsListener(REPORT_GENERATION_QUEUE)
export class ReportQueueEventsListener extends QueueEventsHost {
  constructor(private readonly reportService: ReportService) {
    super();
  }

  @OnQueueEvent('added')
  async onAdded(job: { jobId: string; name: string }): Promise<void> {
    // log this
  }

  @OnQueueEvent('completed')
  async onCompleted(job: {
    jobId: string;
    returnvalue: ReportGenerationDto;
    prev: string;
  }): Promise<void> {
    // log this
    console.log(`[report] completed job ${job.jobId}`);
    console.log(
      `[report] completed job filePath: ${job.returnvalue.accessibilityAnalysisFilePath}`,
    );
    await this.reportService.queueUpdateReportStatus(
      job.jobId,
      QueueName.ReportQueue,
      'COMPLETED',
      job.returnvalue.accessibilityAnalysisFilePath,
    );
  }

  @OnQueueEvent('failed')
  async onFailed(job: {
    jobId: string;
    failedReason: string;
    prev: string;
  }): Promise<void> {
    // log this
    console.log(`[report] failed job ${job.jobId}`);
    await this.reportService.incrementRemainingReports(
      job.jobId,
      QueueName.ReportQueue,
    );
    await this.reportService.queueUpdateReportStatus(
      job.jobId,
      QueueName.ReportQueue,
      'FAILED',
      '',
    );
  }
}
