import ExcelJS from 'exceljs';
import { PipelineStage } from 'mongoose';
import { Timer } from '../models';
import { getDsrActivityQuery } from '../query/dsr';
import utils from './utils';
import { TimesheetEntry } from '../types/dsr';

export const getDsrActivityData = async (startTime: number, endTime: number, memberId?: string[]) => {
  try {
    const DsrActivityPipeline: PipelineStage[] = getDsrActivityQuery(startTime, endTime, memberId);

    const [result] = await Timer.aggregate(DsrActivityPipeline as PipelineStage[]);

    const totalRecords = result.totalRecords || 0;
    const data = result.data || [];

    return { totalRecords, data };
  } catch (error: any) {
    console.error('Error in getDsrActivityData:', error);
    throw new Error('Failed to get dsr activity data');
  }
};

export const exportToExcel = async (
  data: {
    _id: string;
    firstName: string;
    lastName: string;
    designation: string;
    email: string;
    empCode: string;
    totalHoursTracked: string;
    totalDays: number;
    Period: string;
    activities: TimesheetEntry[];
  }[],
): Promise<Buffer> => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Timesheet');

    // Define Styles
    const borderStyle: Partial<ExcelJS.Style> = {
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '0070C0' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: borderStyle.border,
    };

    const rowStyle: Partial<ExcelJS.Style> = {
      font: { color: { argb: '000000' } },
      alignment: { horizontal: 'left', vertical: 'middle' },
      border: borderStyle.border,
    };

    const centerAlignStyle: Partial<ExcelJS.Style> = {
      alignment: { horizontal: 'center', vertical: 'middle' },
    };

    const wrapTextStyle: Partial<ExcelJS.Style> = {
      alignment: { wrapText: true },
    };

    // Page Setup
    worksheet.pageSetup = {
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      orientation: 'portrait',
      paperSize: 9, // A4 size
    };

    // Add Title
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = 'Employee Timesheet';
    worksheet.getCell('A1').style = {
      ...headerStyle,
      font: { ...headerStyle.font, size: 18 },
      alignment: { horizontal: 'center', vertical: 'middle' },
    };

    // Employee Details Section
    worksheet.mergeCells('A3:B3');
    worksheet.mergeCells('D3:E3');
    worksheet.getCell('A3').value = 'Employee Details';
    worksheet.getCell('D3').value = 'Timesheet Details';
    worksheet.getCell('A3').style = headerStyle;
    worksheet.getCell('D3').style = headerStyle;

    // Employee Details
    const employeeDetails = [
      { label: 'Name:', value: `${data[0]?.firstName} ${data[0]?.lastName}` },
      { label: 'Designation:', value: data[0]?.designation },
      { label: 'Email:', value: data[0]?.email },
      { label: 'Employee Code:', value: data[0]?.empCode },
    ];

    employeeDetails.forEach(({ label, value }, index) => {
      worksheet.getCell(`A${4 + index}`).value = label;
      worksheet.getCell(`B${4 + index}`).value = value;
      worksheet.getCell(`A${4 + index}`).style = rowStyle;
      worksheet.getCell(`B${4 + index}`).style = rowStyle;
    });

    const timesheetDetails = [
      { label: 'Total Hours Tracked:', value: `${data[0]?.totalHoursTracked}` },
      { label: 'Total Days:', value: `${data[0]?.totalDays} days` },
      { label: 'Period:', value: data[0]?.Period },
    ];

    timesheetDetails.forEach(({ label, value }, index) => {
      worksheet.getCell(`D${4 + index}`).value = label;
      worksheet.getCell(`E${4 + index}`).value = value;
      worksheet.getCell(`D${4 + index}`).style = rowStyle;
      worksheet.getCell(`E${4 + index}`).style = rowStyle;
    });

    // Add a space between the details and the timesheet data
    worksheet.addRow([]);

    // Header Row
    const headers = ['Date', 'Day', 'DSR (Task)', 'Total Hours', 'Leave'];
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell({ includeEmpty: true }, cell => {
      cell.style = headerStyle;
    });

    // Add Data Rows
    data.forEach(entry => {
      console.log('object', entry.activities);
      entry.activities.forEach(activity => {
        const formattedDate = utils.formatDateForExcel(new Date(activity.date));
        const dayName = utils.getDayName(new Date(activity.date));

        // Check if dailyHoursTracked is present, otherwise use a default value
        const totalHours = activity.dailyHoursTracked !== '-' ? activity.dailyHoursTracked : '0:00';

        // Extract the DSR description or provide a default if it's not available
        const dsrDescription = activity.dsr && activity.dsr.description ? utils.stripHtmlTags(activity.dsr.description) : 'No Data Found';

        // Add the row to the worksheet
        const row = worksheet.addRow([
          formattedDate,
          dayName,
          dsrDescription,
          totalHours,
          activity.leave || 'N/A', // Handle undefined leave case
        ]);

        // Apply styles to each cell in the row
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.style = { ...rowStyle, ...centerAlignStyle };
          if (colNumber === 3) {
            cell.style = { ...cell.style, ...wrapTextStyle };
          }
        });
      });
    });

    // Set Column Widths
    worksheet.columns = [
      { width: 15 }, // Date
      { width: 25 }, // Day
      { width: 50 }, // DSR (Task)
      { width: 20 }, // Total Hours
      { width: 15 }, // Leave
    ];

    // Export to Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  } catch (error: any) {
    console.error('Error generating Excel file:', error);
    throw new Error(error.message);
  }
};

// export const exportToPdf = async (res: Response, data: {
//   _id: string;
//   firstName: string;
//   lastName: string;
//   designation: string;
//   email: string;
//   empCode: string;
//   totalHoursTracked: string;
//   totalDays: number;
//   Period: string;
//   activities: TimesheetEntry[];
// }[]): Promise<Response> => {
//   try {
//     const pdfDoc = await PDFDocument.create();
//     const page = pdfDoc.addPage([600, 800]); // A4 size (portrait)
//     const { width, height } = page.getSize();

//     // Set the font size and color
//     const fontSize = 12;
//     const headerFontSize = 18;

//     // Title
//     page.drawText('Employee Timesheet', {
//       x: 50,
//       y: height - 50,
//       size: headerFontSize,
//       color: rgb(0, 0, 1),
//       font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
//     });

//     // Employee Details Section
//     const employeeDetailsY = height - 100;
//     page.drawText('Employee Details', { x: 50, y: employeeDetailsY, size: fontSize, color: rgb(0, 0, 0) });

//     const employeeDetails = [
//       { label: 'Name:', value: `${data[0]?.firstName} ${data[0]?.lastName}` },
//       { label: 'Designation:', value: data[0]?.designation },
//       { label: 'Email:', value: data[0]?.email },
//       { label: 'Employee Code:', value: data[0]?.empCode },
//     ];

//     let detailY = employeeDetailsY - 20;
//     employeeDetails.forEach(({ label, value }) => {
//       page.drawText(`${label} ${value}`, { x: 50, y: detailY, size: fontSize, color: rgb(0, 0, 0) });
//       detailY -= 15;
//     });

//     const timesheetDetailsY = detailY - 20;
//     page.drawText('Timesheet Details', { x: 50, y: timesheetDetailsY, size: fontSize, color: rgb(0, 0, 0) });

//     const timesheetDetails = [
//       { label: 'Total Hours Tracked:', value: `${data[0]?.totalHoursTracked}` },
//       { label: 'Total Days:', value: `${data[0]?.totalDays} days` },
//       { label: 'Period:', value: data[0]?.Period },
//     ];

//     detailY = timesheetDetailsY - 20;
//     timesheetDetails.forEach(({ label, value }) => {
//       page.drawText(`${label} ${value}`, { x: 50, y: detailY, size: fontSize, color: rgb(0, 0, 0) });
//       detailY -= 15;
//     });

//     // Add a space between the details and the timesheet data
//     detailY -= 20;

//     // Header Row
//     const headers = ['Date', 'Day', 'DSR (Task)', 'Total Hours', 'Leave'];
//     let headerX = 50;
//     headers.forEach(header => {
//       page.drawText(header, { x: headerX, y: detailY, size: fontSize, color: rgb(0, 0, 0) });
//       headerX += 100; // Adjust spacing as needed
//     });

//     detailY -= 20; // Move down for data rows

//     // Add Data Rows
//     data.forEach((entry) => {
//       entry.activities.forEach((activity) => {
//         const formattedDate = utils.formatDateForExcel(new Date(activity.date));
//         const dayName = utils.getDayName(new Date(activity.date));
//         const totalHours = activity.dailyHoursTracked !== '-' ? activity.dailyHoursTracked : '0:00';
//         const dsrDescription = activity.dsr && activity.dsr.description
//           ? utils.stripHtmlTags(activity.dsr.description)
//           : 'No Data Found';

//         page.drawText(formattedDate, { x: 50, y: detailY, size: fontSize, color: rgb(0, 0, 0) });
//         page.drawText(dayName, { x: 150, y: detailY, size: fontSize, color: rgb(0, 0, 0) });
//         page.drawText(dsrDescription, { x: 250, y: detailY, size: fontSize, color: rgb(0, 0, 0) });
//         page.drawText(totalHours, { x: 400, y: detailY, size: fontSize, color: rgb(0, 0, 0) });
//         page.drawText(activity.leave || 'N/A', { x: 500, y: detailY, size: fontSize, color: rgb(0, 0, 0) });

//         detailY -= 15; // Move down for the next row
//       });
//     });

//     // Export PDF to Buffer
//     const pdfBytes = await pdfDoc.save();

//     // Set PDF response headers
//     res.setHeader('Content-Disposition', 'attachment; filename="dsr_activity_report.pdf"');
//     res.setHeader('Content-Type', 'application/pdf');

//     return res.send(pdfBytes);

//   } catch (error: any) {
//     console.error('Error generating PDF file:', error);
//     throw new Error(error.message);
//   }
// };
