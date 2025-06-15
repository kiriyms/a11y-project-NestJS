import { Module } from '@nestjs/common';
import { ResendModule } from 'nestjs-resend';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { ReportModule } from './modules/report/report.module';
import { DatabaseModule } from './modules/database/database.module';
import { ReportGenerationModule } from './modules/report-generation/report-generation.module';
import { JwtAccessAuthGuard } from './guards/jwt-access-auth.guard';
import { TokenGenerationModule } from './modules/token-generation/token-generation.module';
import { JwtModule } from '@nestjs/jwt';
import { StrategiesVerificationModule } from './modules/strategies-verification/strategies-verification.module';
import { BullModule } from '@nestjs/bullmq';
import {
  ACCESSIBILITY_ANALYSIS_QUEUE,
  REPORT_GENERATION_QUEUE,
} from './common/constants';
import { AccessibilityWorker } from './queue-processing/workers/accessibility.worker';
import { ReportWorker } from './queue-processing/workers/report.worker';
import { AccessibilityQueueEventsListener } from './queue-processing/event-listeners/accessibility-queue.events';
import { ReportQueueEventsListener } from './queue-processing/event-listeners/report-queue.events';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    AuthModule,
    ReportModule,
    DatabaseModule,
    ReportGenerationModule,
    TokenGenerationModule,
    StrategiesVerificationModule,
    ResendModule.forRoot({
      apiKey: process.env.MAIL_API_KEY || '',
    }),
    JwtModule.register({
      global: true,
    }),
    BullModule.forRoot({
      connection: { host: 'localhost', port: 6379 },
      defaultJobOptions: {
        attempts: 1,
        backoff: 1000,
        delay: 1000,
      },
    }),
    BullModule.registerQueue(
      { name: ACCESSIBILITY_ANALYSIS_QUEUE },
      { name: REPORT_GENERATION_QUEUE },
    ),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'reports'),
      // rootPath: join(__dirname, 'reports'),
      serveRoot: '/reports',
      serveStaticOptions: {
        setHeaders: (res, path, stat) => {
          res.setHeader('Content-Type', 'application/pdf');
        },
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: 'APP_GUARD',
      useClass: JwtAccessAuthGuard,
    },
    AccessibilityWorker,
    ReportWorker,
    AccessibilityQueueEventsListener,
    ReportQueueEventsListener,
  ],
})
export class AppModule {}
