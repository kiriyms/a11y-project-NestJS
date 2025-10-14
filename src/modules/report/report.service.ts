import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Report, ReportStatus } from '@prisma/client';
import { NewReportDto } from './dto/new-report.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { AccessibilityAnalysisDto } from './dto/accessibility-analysis.dto';
import { ReportGenerationDto } from './dto/report-generation.dto';
import {
  ACCESSIBILITY_ANALYSIS_QUEUE,
  QueueName,
  REPORT_GENERATION_QUEUE,
} from 'src/common/constants';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ResendService } from 'nestjs-resend';

@Injectable()
export class ReportService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectQueue(ACCESSIBILITY_ANALYSIS_QUEUE)
    private readonly accessibilityQueue: Queue,
    @InjectQueue(REPORT_GENERATION_QUEUE) private readonly reportQueue: Queue,
    private readonly resendService: ResendService,
  ) {}

  // async getAllUsers(): Promise<User[]> {
  //     return this.databaseService.getUsers()
  // }

  async generateReport(userId: string, data: NewReportDto): Promise<Report> {
    const report = await this.databaseService.createReport(userId, data.domain);
    const user = await this.databaseService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    if (user.subscription !== 'PREMIUM' && user.remainingReports <= 0) {
      throw new ForbiddenException('user has no remaining reports');
    }
    // try/catch starting a job. If fails, change report status to failed
    // OR use a queue listener to change job to failed/completed
    const jobData: AccessibilityAnalysisDto = {
      domain: data.domain,
      userEmail: user.email,
      reportId: report.id,
    };
    await this.accessibilityQueue.add('analyze-domain', jobData);

    if (user.subscription !== 'PREMIUM') {
      await this.databaseService.updateUserRemainingReportsDecrement(user.id);
    }

    return report;
  }

  async incrementRemainingReports(
    jobId: string,
    queueName: QueueName,
  ): Promise<void> {
    let job: Job;
    switch (queueName) {
      case QueueName.AccessibilityQueue:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        job = await this.accessibilityQueue.getJob(jobId);
        break;
      case QueueName.ReportQueue:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        job = await this.reportQueue.getJob(jobId);
        break;
      default:
        // log error
        return;
    }
    console.log(
      `job data queried from ${queueName} queue: ${JSON.stringify(job.data)}`,
    );
    if (!job) {
      // log error
    }

    const user = await this.databaseService.getUserByEmail(job.data.userEmail);
    if (!user) {
      return;
    }
    if (user.subscription === 'PREMIUM') {
      return;
    }

    await this.databaseService.updateUserRemainingReportsIncrement(user.id);
  }

  async getUserReports(userId: string): Promise<Report[]> {
    const user = await this.databaseService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    return this.databaseService.getUserReportsByUserId(userId);
  }

  async getUserReportById(userId: string, reportId: string): Promise<Report> {
    const user = await this.databaseService.getReportUserById(reportId);
    if (!user) {
      throw new NotFoundException('user not found');
    }

    if (user.id !== userId) {
      throw new ForbiddenException(
        'user does not have permission to access this report',
      );
    }

    return this.databaseService.getReportById(reportId);
  }

  async queueAddReportGenerationJob(data: ReportGenerationDto): Promise<void> {
    await this.reportQueue.add('generate-report', data);
  }

  async queueUpdateReportStatus(
    jobId: string,
    queueName: QueueName,
    status: ReportStatus,
    fileName: string,
  ): Promise<void> {
    let job: Job;
    switch (queueName) {
      case QueueName.AccessibilityQueue:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        job = await this.accessibilityQueue.getJob(jobId);
        break;
      case QueueName.ReportQueue:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        job = await this.reportQueue.getJob(jobId);
        break;
      default:
        // log error
        return;
    }
    console.log(
      `job data queried from ${queueName} queue: ${JSON.stringify(job.data)}`,
    );
    if (!job) {
      // log error
    }
    await this.databaseService.updateReportStatusById(
      job.data.reportId,
      status,
      fileName,
    );
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async scheduledEmail(): Promise<void> {
    console.log('email!');
    await this.resendService.send({
      from: 'no-reply@a11y-server.xyz',
      to: 'samcolserra@gmail.com',
      subject: 'A11yReport Monthly',
      text: `Monthly report email sent at ${new Date().toISOString()}`,
    });
    await this.resendService.send({
      from: 'no-reply@a11y-server.xyz',
      to: 'kiriyms@gmail.com',
      subject: 'A11yReport Monthly',
      text: `Monthly report email sent at ${new Date().toISOString()}`,
    });
  }

  // ADD CRON FOR REFRESHING ALL REPORT LIMITS MONTHLY
}
