import { Request, Response } from 'express';
import utils from '../helpers/utils';
import { errorResponse, notFoundResponse, successResponseWithPagination, validationError } from '../helpers/api-responses';
import constants from '../helpers/constants';
import { generateAttendanceExcel, getAttendanceData } from '../helpers/AttendanceUtils';
import { User } from '../models';

const getAttendance = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);

    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 1;
    const { startTime, endTime, searchText, memberId, exportExcel } = req.body;

    if (!startTime || !endTime) {
      return validationError(res, 'startTime and endTime are required');
    }

    if (Number(startTime) > Number(endTime)) {
      return validationError(res, 'startTime should be less than endTime');
    }

    const userIds: string[] = user.role === constants.ROLE.EMPLOYEE ? [userId] : memberId;
    const { totalRecords, data: trackedHours } = await getAttendanceData(startTime, endTime, limit, offset, searchText, userIds);

    // If the exportExcel flag is true, generate the Excel file
    if (exportExcel) {
      const excelBuffer = await generateAttendanceExcel(trackedHours, startTime, endTime);
      res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(excelBuffer);
    }

    return successResponseWithPagination(res, 'Attendance retrieved successfully', totalRecords, trackedHours);
  } catch (error: any) {
    console.error('Error in getAttendance:', error);
    return errorResponse(res, error.message);
  }
};


export default { getAttendance };
