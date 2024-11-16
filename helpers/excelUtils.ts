import ExcelJS from 'exceljs';
import { Leave } from '../models';
import { getLeaveExportDataQuery } from '../query/leave';

export const createLeaveReportWorkbook = async (): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();

  const pipeline = getLeaveExportDataQuery();
  const leaveData = await Leave.aggregate(pipeline);

  function applyHeaderStyles(
    cell: ExcelJS.Cell,
    options: { alignment?: ExcelJS.Alignment; font?: Partial<ExcelJS.Font>; fill?: ExcelJS.Fill; color?: string } = {},
  ) {
    cell.alignment = options.alignment || { vertical: 'middle', horizontal: 'center' };
    cell.font = options.font || { size: 12, bold: true };
    cell.fill = options.fill || { type: 'pattern', pattern: 'solid', fgColor: { argb: options.color || 'FFFFFF' } };
  }

  function applyCellBorder(cell: ExcelJS.Cell) {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  function setWorksheetColumns(worksheet: ExcelJS.Worksheet, months: string[], carryForwardHeader: string) {
    const columns = [
      { header: 'Employee Name', key: 'employeeName', width: 20 },
      { header: carryForwardHeader, key: 'carryForward', width: 25 },
      { header: 'NPL', key: 'npl', width: 10 },
      { header: 'Total', key: 'total', width: 10 },
    ];

    months.forEach(month => {
      columns.push({ header: `${month}_PL`, key: `${month.toLowerCase()}Pl`, width: 10 });
      columns.push({ header: `${month}_UPL`, key: `${month.toLowerCase()}Upl`, width: 10 });
      columns.push({ header: `${month}_Total Leave`, key: `${month.toLowerCase()}Total`, width: 15 });
    });

    columns.push({ header: 'Available PL Leave', key: 'availableLeave', width: 25 });
    worksheet.columns = columns;
  }

  function createQuarterSheet(quarter: string, data: any[], months: string[], nplValue: number) {
    const worksheet = workbook.addWorksheet(quarter);
    const carryForwardHeader = quarter.startsWith('Q1') ? 'Carry Forward from last year' : 'Carry Forward from last month';
    setWorksheetColumns(worksheet, months, carryForwardHeader);

    worksheet.mergeCells('A1:A2');
    applyHeaderStyles(worksheet.getCell('A1'), { color: 'FFD3D3D3' });
    worksheet.getCell('A1').value = 'Employee Name';

    worksheet.mergeCells('B1:D1');
    applyHeaderStyles(worksheet.getCell('B1'), { color: 'FFCCFFCC' });
    worksheet.getCell('B1').value = 'All Leave';

    worksheet.getCell('B2').value = carryForwardHeader;
    worksheet.getCell('C2').value = `NPL (Q${quarter[1]})`;
    worksheet.getCell('D2').value = 'Total';

    ['B2', 'C2', 'D2'].forEach(cell => {
      worksheet.getCell(cell).alignment = { horizontal: 'center' };
      worksheet.getCell(cell).font = { bold: true };
      worksheet.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
    });

    months.forEach((month, index) => {
      const colStart = 4 + index * 3;
      const colLetterStart = String.fromCharCode(65 + colStart);
      const monthColors = ['FFFFE0B2', 'FFD3D3D3', 'FFFFE0B2'];
      const monthColor = monthColors[index % monthColors.length];

      worksheet.mergeCells(`${colLetterStart}1:${String.fromCharCode(65 + colStart + 2)}1`);
      applyHeaderStyles(worksheet.getCell(`${colLetterStart}1`), { color: monthColor });
      worksheet.getCell(`${colLetterStart}1`).value = month;

      ['PL', 'UPL', 'Total Leave'].forEach((header, i) => {
        const col = String.fromCharCode(65 + colStart + i);
        worksheet.getCell(`${col}2`).value = header;
        worksheet.getCell(`${col}2`).alignment = { horizontal: 'center' };
        worksheet.getCell(`${col}2`).font = { bold: true };
        worksheet.getCell(`${col}2`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: monthColor } };
      });
    });

    const availableLeaveCol = String.fromCharCode(65 + 4 + months.length * 3);
    worksheet.mergeCells(`${availableLeaveCol}1:${availableLeaveCol}2`);
    applyHeaderStyles(worksheet.getCell(`${availableLeaveCol}1`), { color: 'FFCCFFCC' });
    worksheet.getCell(`${availableLeaveCol}1`).value = 'Available PL Leave';

    data.forEach(employee => {
      const qData = (employee.quarterlyData || []).find((q: { quarter: string }) => q.quarter === quarter);
      if (!qData) return;

      const rowData: Record<string, any> = {
        employeeName: employee.userName,
        carryForward: employee.carryForward || 0,
        npl: nplValue,
        total: qData.total || 0,
        availableLeave: employee.availablePL || 0,
      };

      months.forEach(month => {
        const monthEntry = (qData.months || []).find((m: { month: string }) => m.month === month) || {};
        rowData[`${month.toLowerCase()}Pl`] = monthEntry.totalPaidLeave || 0;
        rowData[`${month.toLowerCase()}Upl`] = monthEntry.totalUnpaidLeave || 0;
        rowData[`${month.toLowerCase()}Total`] = monthEntry.totalLeaveCount || 0;
      });

      const row = worksheet.addRow(rowData);
      row.eachCell({ includeEmpty: true }, cell => applyCellBorder(cell));
    });

    worksheet.eachRow(row => row.eachCell(cell => applyCellBorder(cell)));
  }

  const quarters = [
    { name: 'Q1 (January - March - 2024)', months: ['January', 'February', 'March'], nplValue: 3 },
    { name: 'Q2 (April - June - 2024)', months: ['April', 'May', 'June'], nplValue: 4 },
    { name: 'Q3 (July - September - 2024)', months: ['July', 'August', 'September'], nplValue: 4 },
    { name: 'Q4 (October - December - 2024)', months: ['October', 'November', 'December'], nplValue: 4 },
  ];

  quarters.forEach(({ name, months, nplValue }) => {
    createQuarterSheet(name, leaveData, months, nplValue);
  });

  return workbook;
};
