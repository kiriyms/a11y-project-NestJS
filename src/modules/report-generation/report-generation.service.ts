/* eslint-disable no-fallthrough */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { jsPDF } from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';
import * as Sharp from 'sharp';
import axe, { AxeResults } from 'axe-core';

// 1 inch : 25.4 mm
// 0.5 inch : 12.7 mm
const PPMM = 2.83464567;
const MARGIN_TOP = 12.7;
const MARGIN_BOTTOM = 12.7;
const MARGIN_LEFT = 12.7;
const MARGIN_RIGHT = 12.7;
const LINE_SPACING = 12 / PPMM;
const INDENT_SPACING = 12 / PPMM;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const PAGE_WORK_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
// const PAGE_WORK_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
const FONT_SIZE_TITLE = 32;
const FONT_SIZE_LARGE = 20;
const FONT_SIZE_MEDIUM = 16;
const FONT_SIZE_SMALL = 12;
const FONT_FAMILY = 'helvetica';
const COLOR_BLACK = '#000000';
const COLOR_WHITE = '#ffffff';
const COLOR_LIGHT_GREY = '#e3e3e3';
const COLOR_MINOR = '#45ffd4';
const COLOR_MODERATE = '#c1ff45';
const COLOR_SERIOUS = '#ff9945';
const COLOR_CRITICAL = '#ff4545';
const MAX_Y_OFFSET = PAGE_HEIGHT - MARGIN_BOTTOM;
// const HIGHLIGHT_MARGIN_TOP = 0;
const HIGHLIGHT_MARGIN_BOTTOM = 1.5;
const HIGHLIGHT_MARGIN_LEFT = 1;
const HIGHLIGHT_MARGIN_RIGHT = 2.5;

@Injectable()
export class ReportGenerationService {
  async generateReport(
    results: AxeResults,
    imagesDir: string,
    reportId: string,
  ): Promise<jsPDF> {
    const doc = new jsPDF();

    const imagesPath = path.join(imagesDir, reportId, 'output_crops');
    console.log(`Images path: ${imagesPath}`);

    // make the pdf here!
    let page_Y_offset = MARGIN_TOP;

    doc.setTextColor(COLOR_BLACK);
    doc.setFontSize(FONT_SIZE_TITLE);
    doc.setFont(FONT_FAMILY, 'bold');

    doc.text(
      'Accessibility Report',
      MARGIN_LEFT + PAGE_WORK_WIDTH * 0.5,
      page_Y_offset + FONT_SIZE_TITLE / PPMM,
      { align: 'center' },
    );
    page_Y_offset = newLine(doc, page_Y_offset, 3);
    page_Y_offset = applyText(
      doc,
      page_Y_offset,
      INDENT_SPACING,
      COLOR_BLACK,
      FONT_SIZE_MEDIUM,
      'normal',
      `${results.url}`,
    );
    console.log(`RESULTS URL: ${results.url}`);

    doc.setFontSize(FONT_SIZE_SMALL);
    doc.text(
      'Alpha version 0.1.0 report',
      MARGIN_LEFT + PAGE_WORK_WIDTH * 0.5,
      PAGE_HEIGHT - MARGIN_BOTTOM,
      { align: 'center' },
    );
    doc.text(
      'Generated at: https://a11y-project-steel.vercel.app',
      MARGIN_LEFT + PAGE_WORK_WIDTH * 0.5,
      PAGE_HEIGHT - MARGIN_BOTTOM - FONT_SIZE_SMALL / PPMM - LINE_SPACING,
      { align: 'center' },
    );

    doc.addPage();
    page_Y_offset = MARGIN_TOP;

    page_Y_offset = applyText(
      doc,
      page_Y_offset,
      0,
      COLOR_BLACK,
      FONT_SIZE_LARGE,
      'bold',
      'Description & Terminology',
    );
    page_Y_offset = newLine(doc, page_Y_offset);
    page_Y_offset = applyText(
      doc,
      page_Y_offset,
      INDENT_SPACING,
      COLOR_BLACK,
      FONT_SIZE_MEDIUM,
      'normal',
      'This report compares the given web page against WCAG standard for accessibility. If the given web page was not compliant to the criteria, you will find the violations and their descriptions on the following pages of this report.',
    );

    page_Y_offset = newLine(doc, page_Y_offset, 0.6);
    page_Y_offset = applyText(
      doc,
      page_Y_offset,
      INDENT_SPACING,
      COLOR_BLACK,
      FONT_SIZE_SMALL,
      'bold',
      'More information about WCAG: https://www.w3.org/TR/WCAG22/',
      'F',
      COLOR_LIGHT_GREY,
    );

    page_Y_offset = newLine(doc, page_Y_offset, 1);
    page_Y_offset = applyText(
      doc,
      page_Y_offset,
      0,
      COLOR_BLACK,
      FONT_SIZE_MEDIUM,
      'bold',
      'What are violations?',
    );
    page_Y_offset = applyText(
      doc,
      page_Y_offset,
      INDENT_SPACING,
      COLOR_BLACK,
      FONT_SIZE_MEDIUM,
      'normal',
      'Violations are collections of failing elements that were not compliant to a specific WCAG success criteria.',
    );
    page_Y_offset = newLine(doc, page_Y_offset, 0.8);
    page_Y_offset = applyText(
      doc,
      page_Y_offset,
      0,
      COLOR_BLACK,
      FONT_SIZE_MEDIUM,
      'bold',
      'What are failing elements?',
    );
    page_Y_offset = applyText(
      doc,
      page_Y_offset,
      INDENT_SPACING,
      COLOR_BLACK,
      FONT_SIZE_MEDIUM,
      'normal',
      'A web page is composed of many HTML elements. Failing elements are particular HTML elements that were not compliant to WCAG success criteria within a given violation.',
    );
    page_Y_offset = newLine(doc, page_Y_offset, 0.8);
    page_Y_offset = applyText(
      doc,
      page_Y_offset,
      0,
      COLOR_BLACK,
      FONT_SIZE_MEDIUM,
      'bold',
      'What are impact levels?',
    );
    page_Y_offset = applyText(
      doc,
      page_Y_offset,
      INDENT_SPACING,
      COLOR_BLACK,
      FONT_SIZE_MEDIUM,
      'normal',
      'Impact levels are descriptions of how severe the violation of a criteria is. It is recommended to prioritize fixing violations with high severity. Here are the available levels of impact and their color codes:',
    );

    doc.setFontSize(FONT_SIZE_MEDIUM);
    doc.setFont(FONT_FAMILY, 'bold');

    const bottomImpactTextOffset = 5.5;
    doc.text(
      'minor',
      MARGIN_LEFT + PAGE_WORK_WIDTH * 0.2,
      PAGE_HEIGHT -
        MARGIN_BOTTOM -
        (FONT_SIZE_SMALL / PPMM) * bottomImpactTextOffset -
        LINE_SPACING * bottomImpactTextOffset,
      { align: 'center' },
    );
    doc.text(
      'moderate',
      MARGIN_LEFT + PAGE_WORK_WIDTH * 0.4,
      PAGE_HEIGHT -
        MARGIN_BOTTOM -
        (FONT_SIZE_SMALL / PPMM) * bottomImpactTextOffset -
        LINE_SPACING * bottomImpactTextOffset,
      { align: 'center' },
    );
    doc.text(
      'serious',
      MARGIN_LEFT + PAGE_WORK_WIDTH * 0.6,
      PAGE_HEIGHT -
        MARGIN_BOTTOM -
        (FONT_SIZE_SMALL / PPMM) * bottomImpactTextOffset -
        LINE_SPACING * bottomImpactTextOffset,
      { align: 'center' },
    );
    doc.text(
      'critical',
      MARGIN_LEFT + PAGE_WORK_WIDTH * 0.8,
      PAGE_HEIGHT -
        MARGIN_BOTTOM -
        (FONT_SIZE_SMALL / PPMM) * bottomImpactTextOffset -
        LINE_SPACING * bottomImpactTextOffset,
      { align: 'center' },
    );

    const colorSquareLength = 10;
    doc.setFillColor(COLOR_MINOR);

    const bottomImpactColorOffset = 7.75;
    doc.rect(
      MARGIN_LEFT + PAGE_WORK_WIDTH * 0.2 - colorSquareLength / 2,
      PAGE_HEIGHT -
        MARGIN_BOTTOM -
        (FONT_SIZE_SMALL / PPMM) * bottomImpactColorOffset -
        LINE_SPACING * bottomImpactColorOffset,
      colorSquareLength,
      colorSquareLength,
      'F',
    );
    doc.setFillColor(COLOR_MODERATE);
    doc.rect(
      MARGIN_LEFT + PAGE_WORK_WIDTH * 0.4 - colorSquareLength / 2,
      PAGE_HEIGHT -
        MARGIN_BOTTOM -
        (FONT_SIZE_SMALL / PPMM) * bottomImpactColorOffset -
        LINE_SPACING * bottomImpactColorOffset,
      colorSquareLength,
      colorSquareLength,
      'F',
    );
    doc.setFillColor(COLOR_SERIOUS);
    doc.rect(
      MARGIN_LEFT + PAGE_WORK_WIDTH * 0.6 - colorSquareLength / 2,
      PAGE_HEIGHT -
        MARGIN_BOTTOM -
        (FONT_SIZE_SMALL / PPMM) * bottomImpactColorOffset -
        LINE_SPACING * bottomImpactColorOffset,
      colorSquareLength,
      colorSquareLength,
      'F',
    );
    doc.setFillColor(COLOR_CRITICAL);
    doc.rect(
      MARGIN_LEFT + PAGE_WORK_WIDTH * 0.8 - colorSquareLength / 2,
      PAGE_HEIGHT -
        MARGIN_BOTTOM -
        (FONT_SIZE_SMALL / PPMM) * bottomImpactColorOffset -
        LINE_SPACING * bottomImpactColorOffset,
      colorSquareLength,
      colorSquareLength,
      'F',
    );

    const bottomNoteTextOffset = 5;
    page_Y_offset =
      PAGE_HEIGHT -
      MARGIN_BOTTOM -
      (FONT_SIZE_SMALL / PPMM) * bottomNoteTextOffset -
      LINE_SPACING * bottomNoteTextOffset;
    page_Y_offset = applyText(
      doc,
      page_Y_offset,
      0,
      COLOR_BLACK,
      FONT_SIZE_SMALL,
      'bold',
      "Note: this is an alpha version of the report. It does not show the 'passed' and 'incomplete' categories of elements. Additionally, some WCAG criteria cannot be tested for using an algorithm, and need to be examined manually.",
      'F',
      COLOR_LIGHT_GREY,
    );

    doc.addPage();
    page_Y_offset = MARGIN_TOP;
    page_Y_offset = applyText(
      doc,
      page_Y_offset,
      0,
      COLOR_BLACK,
      FONT_SIZE_MEDIUM,
      'bold',
      `Total violations: ${results.violations.length}`,
    );
    for (
      let violation_i = 0;
      violation_i < results.violations.length;
      violation_i++
    ) {
      const violation = results.violations[violation_i];
      page_Y_offset = applyText(
        doc,
        page_Y_offset,
        INDENT_SPACING,
        COLOR_BLACK,
        FONT_SIZE_MEDIUM,
        'normal',
        `${violation_i + 1}. ${violation.help}`,
      );
      page_Y_offset = applyText(
        doc,
        page_Y_offset,
        INDENT_SPACING,
        COLOR_BLACK,
        FONT_SIZE_MEDIUM,
        'normal',
        `Suggestion: ${violation.description}`,
      );

      const color = getFontColorFromImpactValue(violation.impact);
      const impactText =
        color === COLOR_BLACK ? 'not specified' : violation.impact;

      page_Y_offset = applyText(
        doc,
        page_Y_offset,
        INDENT_SPACING,
        COLOR_BLACK,
        FONT_SIZE_MEDIUM,
        'normal',
        `Overall impact level: ${impactText}`,
        'F',
        color,
      );
      page_Y_offset = applyText(
        doc,
        page_Y_offset,
        INDENT_SPACING * 2,
        COLOR_BLACK,
        FONT_SIZE_SMALL,
        'normal',
        `Additional information: ${violation.helpUrl}`,
      );

      page_Y_offset = newLine(doc, page_Y_offset);

      page_Y_offset = applyText(
        doc,
        page_Y_offset,
        INDENT_SPACING * 2,
        COLOR_BLACK,
        FONT_SIZE_MEDIUM,
        'bold',
        `Failing elements:`,
      );

      for (let node_i = 0; node_i < violation.nodes.length; node_i++) {
        const node = violation.nodes[node_i];
        const color = getFontColorFromImpactValue(node.impact);
        const impactText =
          color === COLOR_BLACK ? 'not specified' : node.impact;
        page_Y_offset = applyText(
          doc,
          page_Y_offset,
          INDENT_SPACING * 2,
          COLOR_BLACK,
          FONT_SIZE_SMALL,
          'normal',
          `${violation_i + 1}.${node_i + 1}. Element impact: ${impactText}`,
        );
        try {
          const imagePath = path.join(
            imagesPath,
            `crop_${violation_i + 1}_${node_i + 1}.png`,
          );
          const metadata = await Sharp(imagePath).metadata();
          console.log(`adding image to pdf from path: ${imagePath}`);
          const base64 = fs.readFileSync(imagePath, { encoding: 'base64' });
          const imgData = `data:image/png;base64,${base64}`;
          doc.addImage(
            imgData,
            'PNG',
            MARGIN_LEFT + INDENT_SPACING * 4,
            page_Y_offset,
            15,
            15,
            `crop_${violation_i + 1}_${node_i + 1}`,
          );
        } catch (error) {
          console.error(
            `Error adding image for violation ${violation_i + 1}, node ${node_i + 1}: ${error}`,
          );
        }
        page_Y_offset = applyText(
          doc,
          page_Y_offset,
          INDENT_SPACING * 12,
          COLOR_BLACK,
          FONT_SIZE_SMALL,
          'italic',
          `${node.html}`,
          'F',
          COLOR_LIGHT_GREY,
        );

        const summaryTextRaw = node.failureSummary
          ? node.failureSummary
          : 'not specified';
        const summaryTextNoNewLine = summaryTextRaw.replace(/\n/g, '');
        page_Y_offset = applyText(
          doc,
          page_Y_offset,
          INDENT_SPACING * 2,
          COLOR_BLACK,
          FONT_SIZE_SMALL,
          'bold',
          `Suggestion: ${summaryTextNoNewLine}`,
        );

        page_Y_offset = newLine(doc, page_Y_offset, 0.5);
      }

      if (violation_i < results.violations.length - 1) {
        page_Y_offset = newLine(doc, page_Y_offset);
        page_Y_offset = newLine(doc, page_Y_offset);
      }
    }

    return doc;
  }
}

function applyText(
  doc: jsPDF,
  y_offset: number,
  x_indent: number,
  fontColor: string,
  fontSize: number,
  fontStyle: string,
  text: string,
  fill: string = 'none',
  fillColor: string = COLOR_WHITE,
): number {
  // const startingOffset = y_offset;
  doc.setTextColor(fontColor);
  doc.setFontSize(fontSize);
  doc.setFont(FONT_FAMILY, fontStyle);
  const splitText = doc.splitTextToSize(text, PAGE_WORK_WIDTH - x_indent);
  if (checkOffsetOverflow(y_offset, splitText.length, fontSize)) {
    doc.addPage();
    y_offset = MARGIN_TOP;
  }

  switch (fill) {
    case 'none':
      doc.setFillColor(COLOR_WHITE);
      break;
    case 'F':
      doc.setFillColor(fillColor);
      const width =
        getLongestWidthOfStringFromArray(doc, splitText) +
        HIGHLIGHT_MARGIN_RIGHT;
      const height =
        (fontSize / PPMM) * splitText.length +
        LINE_SPACING * (splitText.length - 1) +
        HIGHLIGHT_MARGIN_BOTTOM;
      doc.rect(
        x_indent + MARGIN_LEFT - HIGHLIGHT_MARGIN_LEFT,
        y_offset,
        width,
        height,
        'F',
      );
    default:
      doc.setFillColor(COLOR_WHITE);
  }

  for (let i = 0; i < splitText.length; i++) {
    doc.text(splitText[i], MARGIN_LEFT + x_indent, y_offset + fontSize / PPMM);
    y_offset += fontSize / PPMM + LINE_SPACING;
  }

  return y_offset;
}

function getLongestWidthOfStringFromArray(doc: jsPDF, array: string[]): number {
  let length = 0;
  for (let i = 0; i < array.length; i++) {
    const elementLength = doc.getTextWidth(array[i]);
    if (elementLength >= length) {
      length = elementLength;
    }
  }

  return length;
}

function newLine(doc: jsPDF, y_offset: number, multiplier: number = 1): number {
  const offset = (FONT_SIZE_SMALL / PPMM + LINE_SPACING) * multiplier;
  y_offset += offset;
  if (y_offset > MAX_Y_OFFSET) {
    doc.addPage();
    y_offset = MARGIN_TOP;
  }
  return y_offset;
}

function checkOffsetOverflow(
  y_offset: number,
  linesCount: number,
  fontSize: number,
): boolean {
  const linesOffsetSum = (fontSize / PPMM) * linesCount;
  const spacingOffsetSum = LINE_SPACING * linesCount;
  const finalOffset = y_offset + linesOffsetSum + spacingOffsetSum;
  return finalOffset > MAX_Y_OFFSET;
}

function getFontColorFromImpactValue(
  impact: axe.ImpactValue | undefined,
): string {
  if (!impact) return COLOR_BLACK;
  switch (impact) {
    case 'minor':
      return COLOR_MINOR;
    case 'moderate':
      return COLOR_MODERATE;
    case 'serious':
      return COLOR_SERIOUS;
    case 'critical':
      return COLOR_CRITICAL;
    default:
      return COLOR_BLACK;
  }
}
