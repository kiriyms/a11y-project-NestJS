import {
  InjectQueue,
  OnQueueEvent,
  QueueEventsHost,
  QueueEventsListener,
} from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  ACCESSIBILITY_ANALYSIS_QUEUE,
  QueueName,
  REPORT_GENERATION_QUEUE,
} from 'src/common/constants';
import { ReportGenerationDto } from 'src/modules/report/dto/report-generation.dto';
import { ReportService } from 'src/modules/report/report.service';

@QueueEventsListener(ACCESSIBILITY_ANALYSIS_QUEUE)
export class AccessibilityQueueEventsListener extends QueueEventsHost {
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
    console.log(`[accessibility] completed job ${job.jobId}`);
    await this.reportService.queueAddReportGenerationJob(job.returnvalue);
  }

  @OnQueueEvent('failed')
  async onFailed(job: {
    jobId: string;
    failedReason: string;
    prev: string;
  }): Promise<void> {
    // log this
    console.log(`[accessibility] failed job ${job.jobId}`);
    await this.reportService.incrementRemainingReports(
      job.jobId,
      QueueName.AccessibilityQueue,
    );
    await this.reportService.queueUpdateReportStatus(
      job.jobId,
      QueueName.AccessibilityQueue,
      'FAILED',
      '',
    );
  }
}
