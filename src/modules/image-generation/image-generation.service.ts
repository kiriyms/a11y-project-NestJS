import { Injectable } from '@nestjs/common';
import { AxeResults } from 'axe-core';
import { By, IRectangle, ThenableWebDriver } from 'selenium-webdriver';
import * as Sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ImageGenerationService {
  async generateImages(
    results: AxeResults,
    driver: ThenableWebDriver,
    outputDir: string,
  ): Promise<string[]> {
    try {
      const rects: IRectangle[] = [];
      const screenPaths: string[] = [];
      const paths: string[] = [];

      if (!fs.existsSync(path.join(outputDir, 'screens')))
        fs.mkdirSync(path.join(outputDir, 'screens'));

      if (!fs.existsSync(path.join(outputDir, 'elements')))
        fs.mkdirSync(path.join(outputDir, 'elements'));

      if (!fs.existsSync(path.join(outputDir, 'overlays')))
        fs.mkdirSync(path.join(outputDir, 'overlays'));

      const violations = results.violations;
      for (let i = 0; i < violations.length; i++) {
        const violation = violations[i];
        for (let j = 0; j < violation.nodes.length; j++) {
          const target = violation.nodes[j].target;

          for (const selectorMain of target) {
            let selector: string;
            if (typeof selectorMain === 'string') {
              selector = selectorMain;
            } else {
              selector = selectorMain[0];
            }

            const element = await driver.findElement(By.css(selector));
            await driver.executeScript((el) => {
              el.scrollIntoView({ behavior: 'instant', block: 'center' });
            }, element);

            console.log(`attempting to screeshot element_${i}_${j}`);
            const rect: {
              x: number;
              y: number;
              width: number;
              height: number;
            } = await driver.executeScript((el) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return el.getBoundingClientRect();
            }, element);

            console.log(`attempting to screeshot screen_${i}_${j}`);
            try {
              const screenImage = await driver.takeScreenshot();
              const screenFilename = path.join(
                outputDir,
                'screens',
                `screen_${i + 1}_${j + 1}.png`,
              );
              console.log(`Saved screen to: ${screenFilename}`);

              const image = await element.takeScreenshot(true);
              rects.push(rect);
              const filename = path.join(
                outputDir,
                'elements',
                `element_${i + 1}_${j + 1}.png`,
              );
              fs.writeFileSync(screenFilename, screenImage, 'base64');
              screenPaths.push(screenFilename);
              fs.writeFileSync(filename, image, 'base64');
              paths.push(filename);
              console.log(`Saved element to: ${filename}`);
            } catch (error) {
              console.log(
                `failed at screenshot element_${i + 1}_${j + 1} taking: ${error}`,
              );
            }
          }
        }
      }

      console.log(`rects: ${JSON.stringify(rects)}`);

      if (screenPaths.length !== paths.length) {
        console.log(
          `WARNING!: screenPaths.length (${screenPaths.length}) !== paths.length (${paths.length})`,
        );
      }
      if (rects.length !== paths.length) {
        console.log(
          `WARNING!: rects.length (${rects.length}) !== paths.length (${paths.length})`,
        );
      }

      // const pageImage = await driver.takeScreenshot();
      // const pageFilename = path.join(outputDir, `page.png`);
      // fs.writeFileSync(pageFilename, pageImage, 'base64');

      const metadatas: Sharp.Metadata[] = [];
      const compositedBuffers: Buffer<ArrayBufferLike>[] = [];
      for (const screenPath of screenPaths) {
        const baseMetadata = await Sharp(screenPath).metadata();
        metadatas.push(baseMetadata);
        const mutedBaseBuffer = await Sharp(screenPath)
          .composite([
            {
              input: {
                create: {
                  width: baseMetadata.width,
                  height: baseMetadata.height,
                  channels: 4,
                  background: { r: 255, g: 255, b: 255, alpha: 0.2 },
                },
              },
              blend: 'over',
            },
          ])
          .png()
          .toBuffer();

        compositedBuffers.push(mutedBaseBuffer);
      }

      for (let i = 0; i < rects.length; i++) {
        const el = rects[i];
        const metadata = metadatas[i];
        el.x = Math.min(metadata.width, Math.ceil(el.x));
        el.y = Math.min(metadata.height, Math.ceil(el.y));
        el.width = Math.ceil(el.width);
        el.height = Math.ceil(el.height);
      }

      for (let i = 0; i < rects.length; i++) {
        const { x, y } = rects[i];
        const smallPath = paths[i];
        const mutedBaseBuffer = compositedBuffers[i];

        const smallImageBuffer = await Sharp(smallPath).toBuffer();
        const borderedBuffer = await this.addRedBorder(smallImageBuffer);

        const compositedBuffer = await Sharp(mutedBaseBuffer)
          .composite([{ input: borderedBuffer, top: y, left: x }])
          .png()
          .toBuffer();

        const base = paths[i].substring(paths[i].lastIndexOf('/') + 1);
        const regex = /_(\d+)_(\d+)\./;
        const match = base.match(regex);

        let firstNum: number = 0;
        let secondNum: number = i + 1;
        if (match) {
          firstNum = parseInt(match[1], 10);
          secondNum = parseInt(match[2], 10);
          console.log({ firstNum, secondNum });
        } else {
          console.error('Filename does not match expected pattern');
        }

        const outPath = path.join(
          outputDir,
          'overlays',
          `overlay_${firstNum}_${secondNum}.png`,
        );
        await Sharp(compositedBuffer).toFile(outPath);
        console.log(`Saved: ${outPath}`);
      }
      await this.generateCroppedRegions(rects, paths, metadatas, outputDir);
    } catch (error) {
      console.log(`Error during image generation: ${error}`);
      return [];
    }

    return [];
  }

  private async addRedBorder(imageBuffer) {
    const borderSize = 2;
    const metadata = await Sharp(imageBuffer).metadata();
    const width = metadata.width;
    const height = metadata.height;

    const borderOverlay = await Sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: {
            create: {
              width,
              height: borderSize,
              channels: 4,
              background: { r: 255, g: 0, b: 0, alpha: 1 },
            },
          },
          top: 0,
          left: 0,
        },
        {
          input: {
            create: {
              width,
              height: borderSize,
              channels: 4,
              background: { r: 255, g: 0, b: 0, alpha: 1 },
            },
          },
          top: height - borderSize,
          left: 0,
        },
        {
          input: {
            create: {
              width: borderSize,
              height,
              channels: 4,
              background: { r: 255, g: 0, b: 0, alpha: 1 },
            },
          },
          top: 0,
          left: 0,
        },
        {
          input: {
            create: {
              width: borderSize,
              height,
              channels: 4,
              background: { r: 255, g: 0, b: 0, alpha: 1 },
            },
          },
          top: 0,
          left: width - borderSize,
        },
      ])
      .png()
      .toBuffer();

    return await Sharp(imageBuffer)
      .composite([{ input: borderOverlay }])
      .png()
      .toBuffer();
  }

  private async generateCroppedRegions(
    smallImagesInfo: IRectangle[],
    paths: string[],
    baseMetadata: { width: number; height: number }[],
    outputDir: string,
  ) {
    const cropOutputDir = path.join(outputDir, 'output_crops');
    if (!fs.existsSync(cropOutputDir)) fs.mkdirSync(cropOutputDir);

    for (let i = 0; i < smallImagesInfo.length; i++) {
      const maxWidth = baseMetadata[i].width;
      const maxHeight = baseMetadata[i].height;
      const minWidth = 0;
      const minHeight = 0;

      // eslint-disable-next-line prefer-const
      let { x, y, width, height } = smallImagesInfo[i];
      const smallMetaData = await Sharp(paths[i]).metadata();

      const base = paths[i].substring(paths[i].lastIndexOf('/') + 1);
      const regex = /_(\d+)_(\d+)\./;
      const match = base.match(regex);

      let firstNum: number = 0;
      let secondNum: number = i + 1;
      if (match) {
        firstNum = parseInt(match[1], 10);
        secondNum = parseInt(match[2], 10);
        console.log({ firstNum, secondNum });
      } else {
        console.error('Filename does not match expected pattern');
      }

      width = smallMetaData.width;
      height = smallMetaData.height;
      const overlayPath = path.join(
        outputDir,
        'overlays',
        `overlay_${firstNum}_${secondNum}.png`,
      );
      const cropPath = path.join(
        cropOutputDir,
        `crop_${firstNum}_${secondNum}.png`,
      );
      const minMargin = 25;

      let cropHeight: number;
      let cropWidth: number;
      let margin: number;
      let cropX: number;
      let cropY: number;
      let squareSize: number;

      if (width < height) {
        cropHeight = minMargin * 2 + height;
        margin = Math.ceil((cropHeight - width) / 2);
        cropWidth = margin * 2 + width;
        cropX = Math.max(x - margin, minWidth);
        cropY = Math.max(y - minMargin, minHeight);
        squareSize = cropHeight;
      } else {
        cropWidth = minMargin * 2 + width;
        margin = Math.ceil((cropWidth - height) / 2);
        cropHeight = margin * 2 + height;
        cropX = Math.max(x - minMargin, minWidth);
        cropY = Math.max(y - margin, minHeight);
        squareSize = cropWidth;
      }

      console.log(`x: ${x}, y: ${y}, w: ${width}, h: ${height}`);
      console.log(
        `crop x: ${cropX}, y: ${cropY}, w: ${cropWidth}, h: ${cropHeight}`,
      );

      if (cropX + cropWidth > maxWidth) {
        cropWidth = maxWidth - cropX;
      }
      if (cropY + cropHeight > maxHeight) {
        cropHeight = maxHeight - cropY;
      }

      if (cropWidth <= 0 || cropHeight <= 0) {
        console.warn(`Skipping crop_${i + 1}. Invalid crop dimensions.`);
        continue;
      }

      try {
        const croppedBuffer = await Sharp(overlayPath)
          .extract({
            left: cropX,
            top: cropY,
            width: cropWidth,
            height: cropHeight,
          })
          .png()
          .toBuffer();

        await Sharp(croppedBuffer).toFile(cropPath);
        console.log(`Saved crop: ${cropPath}`);
      } catch (error) {
        console.log(`Error cropping image ${i + 1}, failed to extract:`, error);
      }
    }
  }
}
