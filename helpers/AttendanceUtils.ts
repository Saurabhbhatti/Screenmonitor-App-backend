import { PipelineStage } from 'mongoose';
import Timer from '../models/Timer';
import { getAttendanceQuery } from '../query/attendance';
import ExcelJS from 'exceljs';

export const getAttendanceData = async (
  startTime: number,
  endTime: number,
  limit: number,
  offset: number,
  searchText?: string,
  memberId?: Array<string>,
) => {
  try {
    const pipeline: PipelineStage[] = getAttendanceQuery(startTime, endTime, limit, offset, searchText, memberId);

    const [result] = await Timer.aggregate(pipeline as PipelineStage[]);

    const totalRecords = result.totalRecords || 0;
    const data = result.data || [];

    return { totalRecords, data };
  } catch (error: any) {
    console.error('Error in getAttendanceData:', error);
    throw new Error('Failed to get attendance data');
  }
};


export const generateAttendanceExcel = async (
  trackedHours: any[],
  startTime: number,
  endTime: number
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance');

  const startDate = new Date(startTime * 1000);
  const endDate = new Date(endTime * 1000);
  const dateRange: Date[] = [];

  while (startDate <= endDate) {
    dateRange.push(new Date(startDate));
    startDate.setDate(startDate.getDate() + 1);
  }

  // Set up headers
  const headers = ['Name', ...dateRange.map(date => date.toISOString().split('T')[0]), 'Total Hours Tracked', 'Total Leave Days'];
  const headerRow = worksheet.addRow(headers);

  // Style the header row
  headerRow.font = {
    bold: true,
    color: { argb: 'FFFFFF' }, // White text
  };
  headerRow.fill = {
    type: 'pattern', // Corrected fill type
    pattern: 'solid', // Fill pattern
    fgColor: { argb: '4F81BD' }, // Light blue background
  };
  headerRow.alignment = { horizontal: 'center' };

  // Apply borders to the header
  headerRow.border = {
    top: { style: 'thick', color: { argb: '000000' } },
    bottom: { style: 'thick', color: { argb: '000000' } },
    left: { style: 'thick', color: { argb: '000000' } },
    right: { style: 'thick', color: { argb: '000000' } },
  };

  // Process the trackedHours data and fill the worksheet
  trackedHours.forEach((employee) => {
    const employeeRow = [];
    
    // Check if employee has the required properties
    employeeRow.push(`${employee.firstName} ${employee.lastName}`);

    // Fill in the attendance activities for each date
    dateRange.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      const trackedData = employee.activities ? employee.activities.find((data: { date: string; }) => data.date === dateKey) : null; // Check for activities existence
      
      // Get daily hours tracked and attendance status
      const dailyHours = trackedData ? trackedData.dailyHoursTracked : 'No Data';
      const attendance = trackedData ? trackedData.attendance : 'No Data'; 

      // Combine attendance status and daily hours for display
      const activityDisplay = `${attendance} (${dailyHours})`;
      employeeRow.push(activityDisplay);
    });

    // Add total hours tracked and leave days (if applicable)
    employeeRow.push(employee.totalHoursTracked || 0); 
    employeeRow.push(employee.totalLeaveDays || 0); 

    // Add the employee row to the worksheet
    const newRow = worksheet.addRow(employeeRow);
    
    // Apply borders to the employee row
    newRow.border = {
      top: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: '000000' } },
    };
  });

  // Set column widths
  worksheet.columns.forEach(column => {
    column.width = 25; // Adjust width as necessary for better readability
  });

  // Export to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};


