/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Request,
  Controller,
  Get,
  Body,
  Post,
  BadRequestException,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { Report } from '@prisma/client';
import { NewReportDto } from './dto/new-report.dto';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // @Roles('ADMIN')
  // @UseGuards(RolesGuard)
  // @HttpCode(HttpStatus.OK)
  // @Get('users')
  // async login(@Request() req): Promise<User[]> {
  //   return await this.reportService.getAllUsers()
  // }

  @Post()
  async generateReport(
    @Request() req,
    @Body() data: NewReportDto,
  ): Promise<Report> {
    console.log(`generateReport user: ${JSON.stringify(req.user)}`);
    return await this.reportService.generateReport(req.user.sub, data);
  }

  @Get('for-user')
  async getUserReports(@Request() req): Promise<Report[]> {
    console.log(`getUserReports user: ${JSON.stringify(req.user)}`);
    return await this.reportService.getUserReports(req.user.sub);
  }

  @Get('for-user/:reportId')
  async getUserReportById(@Request() req): Promise<Report> {
    console.log(`getUserReportById user: ${JSON.stringify(req.user)}`);
    const reportId: string | null = req.params.reportId;
    if (!reportId) {
      throw new BadRequestException('report ID is required');
    }
    return await this.reportService.getUserReportById(req.user.sub, reportId);
  }
}
