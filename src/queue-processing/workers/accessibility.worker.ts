import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { ACCESSIBILITY_ANALYSIS_QUEUE } from 'src/common/constants';
import { ReportGenerationDto } from 'src/modules/report/dto/report-generation.dto';
import { AxeBuilder } from '@axe-core/webdriverjs';
import { Builder, ThenableWebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import { AxeResults } from 'axe-core';
import { InternalServerErrorException } from '@nestjs/common';
import { AccessibilityAnalysisDto } from 'src/modules/report/dto/accessibility-analysis.dto';
import { ImageGenerationService } from 'src/modules/image-generation/image-generation.service';

@Processor(ACCESSIBILITY_ANALYSIS_QUEUE, { concurrency: 2 })
export class AccessibilityWorker extends WorkerHost {
  constructor(private readonly imageGenerationService: ImageGenerationService) {
    super();
  }

  async process(
    job: Job<AccessibilityAnalysisDto>,
  ): Promise<ReportGenerationDto> {
    const userDataDir = `tempdir_${Date.now()}`;
    const userDataDirPath = `/${process.env.USER_DATA_DIR}/${userDataDir}`;
    // fs.mkdirSync(userDataDirPath, { recursive: true });

    let driver: ThenableWebDriver;
    try {
      const opts = new chrome.Options();
      console.log(
        `User data dir for this user: ${`--user-data-dir=${userDataDirPath}`}`,
      );
      opts.addArguments(
        // `--user-data-dir=${userDataDirPath}`,
        '--headless=new',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--incognito',
        '--disable-gpu',
        '--window-size=1920,1080',
      );
      driver = new Builder()
        .forBrowser('chrome')
        .setChromeOptions(opts)
        .build();
      await driver
        .manage()
        .setTimeouts({ implicit: 300000, pageLoad: 300000, script: 600000 });
    } catch (error) {
      console.log(
        `Failed to generate report for user: ${job.data.userEmail}, for domain "${job.data.domain}", error: ${error}`,
      );
      throw new InternalServerErrorException(
        '[ERROR] failed to generate report. Algorithm could not be started. ' +
          error,
      );
    }

    let accessibilityAnalysisFilePath = '';

    try {
      await driver.get(job.data.domain);

      const { width, height } = await driver.executeScript<{
        width: number;
        height: number;
      }>(`
        return {
          width: Math.max(document.body.scrollWidth, document.documentElement.clientWidth),
          height: Math.max(document.body.scrollHeight, document.documentElement.clientHeight)
        };
      `);
      await driver.manage().window().setRect({ x: 0, y: 0, width, height });
      await driver.executeScript(`
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      `);

      const results: AxeResults = await new AxeBuilder(driver).analyze();

      const fileName = 'report_' + Date.now();
      const outputDir = path.join(
        __dirname,
        'reports',
        'raw',
        job.data.reportId,
      );
      accessibilityAnalysisFilePath = path.join(outputDir, fileName + '.json');
      console.log(accessibilityAnalysisFilePath);
      console.log(__dirname);
      // SAVE JSON FILE
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(
        accessibilityAnalysisFilePath,
        JSON.stringify(results, null, 2),
        'utf8',
      );

      // await driver.takeScreenshot().then((image) => {
      //   const screenshotPath = path.join(outputDir, fileName + '.png');
      //   fs.writeFileSync(screenshotPath, image, 'base64');
      //   console.log(`Screenshot saved to ${screenshotPath}`);
      // });

      await this.imageGenerationService.generateImages(
        results,
        driver,
        outputDir,
      );

      await driver.quit();

      console.log(
        `Success to generate report for user: ${job.data.userEmail}, for domain "${job.data.domain}"`,
      );
    } catch (error) {
      console.log(
        `Failed to generate report for user: ${job.data.userEmail}, for domain "${job.data.domain}", error: ${error}`,
      );
      await driver.quit();
      throw new InternalServerErrorException(
        '[ERROR] failed to generate report. Please make sure the URL is correct and contains "https://": ' +
          error,
      );
    }

    return {
      userEmail: job.data.userEmail,
      accessibilityAnalysisFilePath,
      reportId: job.data.reportId,
    };
  }
}
