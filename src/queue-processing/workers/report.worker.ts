/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { AxeResults } from 'axe-core';
import { REPORT_GENERATION_QUEUE } from 'src/common/constants';
import { ReportGenerationService } from 'src/modules/report-generation/report-generation.service';
import { ReportGenerationDto } from 'src/modules/report/dto/report-generation.dto';

@Processor(REPORT_GENERATION_QUEUE, { concurrency: 2 })
export class ReportWorker extends WorkerHost {
  constructor(
    private readonly reportGenerationService: ReportGenerationService,
  ) {
    super();
  }

  async process(job: Job<ReportGenerationDto>): Promise<ReportGenerationDto> {
    const fileContents = fs.readFileSync(
      job.data.accessibilityAnalysisFilePath,
      'utf8',
    );
    const axeResults: AxeResults = JSON.parse(fileContents);
    const doc = this.reportGenerationService.generateReport(
      axeResults,
      path.join(__dirname, 'reports', 'raw'),
      job.data.reportId,
    );
    const reportPath = path.join(
      'reports',
      path.basename(job.data.accessibilityAnalysisFilePath, '.json') + '.pdf',
    );
    console.log(reportPath);
    doc.save(reportPath);
    job.data.accessibilityAnalysisFilePath = reportPath;
    return job.data;
  }
}
