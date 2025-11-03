/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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

    const reportsDir = path.join(__dirname, 'reports');
    const rawDir = path.join(reportsDir, 'raw');

    // Ensure the output directories exist
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.mkdirSync(rawDir, { recursive: true });

    const doc = await this.reportGenerationService.generateReport(
      axeResults,
      rawDir,
      job.data.reportId,
    );

    const reportPath = path.join(
      rawDir,
      path.basename(job.data.accessibilityAnalysisFilePath, '.json') + '.pdf',
    );

    console.log('Saving PDF to:', reportPath);

    // Save the PDF safely
    doc.save(reportPath);

    job.data.accessibilityAnalysisFilePath = reportPath;
    return job.data;
  }
}
