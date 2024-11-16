import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { createLeaveReportWorkbook } from '../helpers/excelUtils';

import { errorResponse, notFoundResponse, successResponse, validationError, successResponseWithPagination } from '../helpers/api-responses';
import { User, Leave, LeaveHistory, Holiday } from '../models';
import constants from '../helpers/constants';
import utils from '../helpers/utils';
import { getLeaveQuery, getLeaveHistoryQuery } from '../query/leave';
import { LeaveFilterOptions } from '../types';

const createLeave = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const { leaveType, applyDate, leaveReason, remarks } = req.body;

    if (!leaveType || !applyDate || !leaveReason) {
      return validationError(res, 'Missing required fields');
    }

    const leaveExists = await Leave.findOne({
      userId,
      applyDate,
    });

    if (leaveExists) {
      return validationError(res, 'Leave already exists');
    }

    // New validation for weekends and holidays
    const holidays = await Holiday.find({ companyId: user.companyId }).lean();
    const holidayDates = holidays.map(holiday => holiday.date.toISOString().split('T')[0]); // Format to YYYY-MM-DD

    for (const dateObj of applyDate) {
      const date = new Date(dateObj.date);
      const day = date.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = day === 0 || day === 6;
      const isHoliday = holidayDates.includes(date.toISOString().split('T')[0]);

      if (isWeekend || isHoliday) {
        return validationError(res, `Leave cannot be applied on ${dateObj.date} as it is a weekend or holiday`);
      }
    }

    const newLeave = new Leave({
      companyId: user.companyId,
      userId,
      leaveType,
      applyDate,
      totalDays: applyDate.reduce((total: number, dateObj: any) => total + dateObj.count, 0),
      leaveReason,
      remarks,
      status: constants.LEAVE_STATUS.PENDING,
    });

    const savedLeave = await newLeave.save();

    return successResponse(res, 'Leave request created successfully', savedLeave);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const getLeaves = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId).lean();
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 1;

    const { userFilterId, startDate, endDate, status, isSelf } = req.query;

    // Determine the filter criteria based on user role
    let filterCriteria: LeaveFilterOptions = {};
    const userIdStr = new mongoose.Types.ObjectId(userId as string);

    if (user.role === constants.ROLE.COMPANY_ADMIN) {
      filterCriteria =
        isSelf === 'true'
          ? { userId: userIdStr }
          : { $and: [{ userId: { $ne: userIdStr } }, { companyId: new mongoose.Types.ObjectId(user.companyId!.toString()) }] };
    } else if (user.role === constants.ROLE.HR || user.role === constants.ROLE.PROJECT_MANAGER) {
      filterCriteria =
        isSelf === 'true'
          ? { userId: userIdStr }
          : {
              companyId: new mongoose.Types.ObjectId(user.companyId!.toString()),
              $and: [{ userId: { $ne: userIdStr } }, { 'user.role': { $nin: [constants.ROLE.HR, constants.ROLE.PROJECT_MANAGER] } }],
            };
    } else {
      filterCriteria = { userId: userIdStr };
    }

    if (userFilterId) {
      filterCriteria.userId = new mongoose.Types.ObjectId(userFilterId as string);
    }

    if (startDate && endDate) {
      filterCriteria['applyDate.date'] = { $gte: new Date(startDate as string), $lte: new Date(endDate as string) };
    }

    if (status) {
      filterCriteria.status = status as string;
    }

    // Fetch the leaves based on the filter criteria
    const leaveQuery = getLeaveQuery(filterCriteria, limit, offset, user.role, isSelf === 'true');
    const leaves = await Leave.aggregate(leaveQuery);

    // Adjust the count query to include the role filter for HR and PM
    let countQuery: LeaveFilterOptions = filterCriteria;
    if ((user.role === constants.ROLE.HR || user.role === constants.ROLE.PROJECT_MANAGER) && isSelf !== 'true') {
      const userIds = await User.find({
        companyId: user.companyId,
        role: { $nin: [constants.ROLE.HR, constants.ROLE.PROJECT_MANAGER] },
      }).distinct('_id');
      countQuery = { ...countQuery, userId: { $in: userIds.map((id: any) => new mongoose.Types.ObjectId(id)) } };
    }
    const totalLeaves = await Leave.countDocuments(countQuery);

    const lastLeaveHistory = await LeaveHistory.findOne({ userId: userIdStr }).sort({ createdAt: -1 }).lean();
    const firstLeaveHistory = await LeaveHistory.findOne({ userId: userIdStr }).sort({ createdAt: 1 }).lean();

    const unpaidLeaveCount = await Leave.countDocuments({
      userId: userIdStr,
      leaveType: constants.LEAVE_TYPE.UNPAID,
    });

    const pendingRequestCount = await Leave.countDocuments({
      userId: userIdStr,
      status: constants.LEAVE_STATUS.PENDING,
    });

    const additionalCounts = {
      paidLeave: lastLeaveHistory?.availablePL || 0,
      compoffLeave: lastLeaveHistory?.availableCompOff || 0,
      totalLeaves: firstLeaveHistory?.availablePL || 0,
      unpaidLeave: unpaidLeaveCount,
      pendingRequest: pendingRequestCount,
      leaveTypes: constants.LEAVE_TYPES,
    };

    return successResponseWithPagination(res, 'Leaves fetched successfully', totalLeaves, leaves, additionalCounts);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const actionOnLeave = async (req: Request, res: Response) => {
  try {
    const userIdFromToken = await utils.getUserId(req);
    const user = await User.findById(userIdFromToken);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const { userId, leaveId, status, comment } = req.body;
    if (!userId || !leaveId || !status) {
      return validationError(res, 'Missing required fields');
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      return notFoundResponse(res, 'User not found');
    }

    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return notFoundResponse(res, 'Leave not found');
    }

    const leaveHistory = await LeaveHistory.findOne({ userId }).sort({ createdAt: -1 });
    if (!leaveHistory) {
      return notFoundResponse(res, 'Leave history not found');
    }

    if (status === constants.LEAVE_STATUS.CANCELLED && leave.status !== constants.LEAVE_STATUS.PENDING) {
      return validationError(res, 'Leave status cannot be changed now');
    }

    if (
      status === constants.LEAVE_STATUS.APPROVED &&
      leave.leaveType !== constants.LEAVE_TYPE.UNPAID &&
      leaveHistory.availablePL! < leave.totalDays
    ) {
      return validationError(res, 'Not enough PL available');
    }

    const updatedLeave = await Leave.findByIdAndUpdate(leaveId, { actionBy: user._id, status, comment }, { new: true });

    const newLeaveHistory = {
      companyId: user.companyId,
      userId: user._id,
      leaveId: leave._id,
      status,
      description: comment,
      credited: 0,
      debited: status === constants.LEAVE_STATUS.APPROVED && leave.leaveType !== constants.LEAVE_TYPE.UNPAID ? leave.totalDays : 0,
      availablePL:
        status === constants.LEAVE_STATUS.APPROVED && leave.leaveType !== constants.LEAVE_TYPE.UNPAID
          ? leaveHistory.availablePL! - leave.totalDays
          : leaveHistory.availablePL,
      availableCompoff: leaveHistory.availableCompOff,
    };

    await LeaveHistory.create(newLeaveHistory);

    return successResponse(res, `Leave request ${status} successfully`, updatedLeave);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const addLeaveHistory = async (req: Request, res: Response) => {
  const { description, credited, debited, availablePL, availableCompOff } = req.body;

  const users = await User.find({});

  users.forEach(async (user: any) => {
    if (user.role !== constants.ROLE.SUPER_ADMIN) {
      const newLeaveHistory = {
        companyId: user.companyId,
        userId: user._id,
        description,
        credited,
        debited,
        availablePL,
        availableCompOff,
      };
      await LeaveHistory.create(newLeaveHistory);
    }
  });

  const leaveHistory = await LeaveHistory.find({});

  return successResponse(res, 'Leave history added successfully for all users', leaveHistory);
};

const getUpcomingLeaves = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 1;
    const isSelf = req.query.isSelf === 'true';

    const today = new Date();
    const baseQuery = {
      status: constants.LEAVE_STATUS.APPROVED,
      'applyDate.0.date': { $gte: today },
    };

    let query;
    if (user.role === constants.ROLE.COMPANY_ADMIN || user.role === constants.ROLE.HR) {
      query = isSelf ? { ...baseQuery, userId: new mongoose.Types.ObjectId(userId as string) } : baseQuery;
    } else {
      query = { ...baseQuery, userId: new mongoose.Types.ObjectId(userId as string) };
    }

    const upcomingLeaves = await Leave.find(query)
      .populate('userId', 'firstName lastName empCode')
      .sort({ 'applyDate.0.date': 1 })
      .skip((offset - 1) * limit)
      .limit(limit);

    return successResponse(res, 'Upcoming leaves fetched successfully', upcomingLeaves);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const getLeaveHistory = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 1;

    const { userFilterId, startDate, endDate, status, isSelf } = req.query;

    // Determine the filter criteria based on user role
    let filterCriteria: LeaveFilterOptions = {};
    const userIdStr = new mongoose.Types.ObjectId(userId as string);

    if (user.role === constants.ROLE.COMPANY_ADMIN) {
      filterCriteria =
        isSelf === 'true'
          ? { userId: userIdStr }
          : { $and: [{ userId: { $ne: userIdStr } }, { companyId: new mongoose.Types.ObjectId(user.companyId!.toString()) }] };
    } else if (user.role === constants.ROLE.HR || user.role === constants.ROLE.PROJECT_MANAGER) {
      filterCriteria =
        isSelf === 'true'
          ? { userId: userIdStr }
          : {
              companyId: new mongoose.Types.ObjectId(user.companyId!.toString()),
              $and: [{ userId: { $ne: userIdStr } }, { 'user.role': { $nin: [constants.ROLE.HR, constants.ROLE.PROJECT_MANAGER] } }],
            };
    } else {
      filterCriteria = { userId: userIdStr };
    }

    if (userFilterId) {
      filterCriteria.userId = new mongoose.Types.ObjectId(userFilterId as string);
    }

    if (startDate && endDate) {
      filterCriteria.createdAt = { $gte: new Date(startDate as string), $lte: new Date(endDate as string) };
    }

    if (status) {
      filterCriteria.status = status as string;
    }

    const leaveHistoryQuery = getLeaveHistoryQuery(filterCriteria, limit, offset, user.role, isSelf === 'true');
    const leaveHistory = await LeaveHistory.aggregate(leaveHistoryQuery);

    // Adjust the count query to include the role filter for HR and PM
    let countQuery: LeaveFilterOptions = filterCriteria;
    if ((user.role === constants.ROLE.HR || user.role === constants.ROLE.PROJECT_MANAGER) && isSelf !== 'true') {
      const userIds = await User.find({
        companyId: user.companyId,
        role: { $nin: [constants.ROLE.HR, constants.ROLE.PROJECT_MANAGER] },
      }).distinct('_id');
      countQuery = { ...countQuery, userId: { $in: userIds.map((id: any) => new mongoose.Types.ObjectId(id)) } };
    }

    const totalLeaves = await LeaveHistory.countDocuments(countQuery);

    return successResponseWithPagination(res, 'Leave history fetched successfully', totalLeaves, leaveHistory);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const checkExistingLeaveAndHoliday = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);

    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [leaves, holidays] = await Promise.all([
      Leave.aggregate([
        {
          $match: {
            userId: user._id,
            'applyDate.date': { $gte: today },
            status: { $in: [constants.LEAVE_STATUS.PENDING, constants.LEAVE_STATUS.APPROVED] },
          },
        },
        {
          $project: {
            totalDays: 1,
            status: 1,
            _id: 1,
            applyDate: {
              $filter: {
                input: '$applyDate',
                as: 'dateObj',
                cond: { $gte: ['$$dateObj.date', today] },
              },
            },
          },
        },
      ]),
      Holiday.aggregate([
        {
          $match: {
            date: { $gte: today },
          },
        },
        {
          $project: {
            date: 1,
            name: 1,
            day: {
              $dateToString: {
                format: '%u',
                date: '$date',
              },
            },
          },
        },
      ]),
    ]);

    return successResponse(res, 'Existing leave and holiday data fetched successfully', { leaves, holidays });
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

export const LeaveHistoryReport = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);

    if (!user) {
      return notFoundResponse(res, 'User not found');
    }
    const workbook = await createLeaveReportWorkbook();

    res.setHeader('Content-Disposition', 'attachment; filename=leave_data.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel file:', error);
    res.status(500).send('Error generating Excel file');
  }
};

export default {
  createLeave,
  getLeaves,
  actionOnLeave,
  addLeaveHistory,
  getUpcomingLeaves,
  getLeaveHistory,
  checkExistingLeaveAndHoliday,
  LeaveHistoryReport,
};
