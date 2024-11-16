import { Request, Response } from 'express';
import moment from 'moment';
import mongoose, { PipelineStage } from 'mongoose';

import { errorResponse, successResponse, notFoundResponse, validationError } from '../helpers/api-responses';
import { User, Leave, LeaveHistory, Timer, Screenshot } from '../models';
import utils from '../helpers/utils';
import constants from '../helpers/constants';
import { getTotalHours } from '../helpers/timerUtils';
import { getWeeklyAndMonthlyHoursQuery } from '../query/timer';
import { calculateProductivity } from '../helpers/productivity';
import { getProductivityQuery } from '../query/screenshot';

// Modules that we need inside dashboard:
// 1. Total hours ( Current month records). Yesterday, Weekly, Monthly and Daily average hours
// 2. Leaves info (Available leave, used leave, compoff leave - Total )
// 3. Hours report Bar chart.  Filters: 1) Weekly -> Date range  2) Monthly -> Year (dropdown)
// 4. Hours Pie Chart. Display Work, Activity & Meetings based on filters.
// 5. Productivity Report (line chart).
// 6. Calendar -> We need to show who is on leave, holiday and birthday & anniversary(optional) in calendar.
// 7. Upcoming Leave and Holiday

const getTotalHoursData = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);

    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    if (user.role === constants.ROLE.EMPLOYEE) {
      const currentDate = moment();
      const yesterday = moment().subtract(1, 'day');
      const startOfWeek = moment().startOf('week');
      const startOfMonth = moment().startOf('month');

      // Get yesterday's hours
      const yesterdayHours = await getTotalHours(userId, yesterday.unix(), yesterday.endOf('day').unix());

      // Get current week's hours
      const weeklyHours = await getTotalHours(userId, startOfWeek.unix(), currentDate.unix());

      // Get current month's hours
      const monthlyHours = await getTotalHours(userId, startOfMonth.unix(), currentDate.unix());

      const response = {
        yesterday: yesterdayHours.totalHours,
        weekly: weeklyHours.totalHours,
        monthly: monthlyHours.totalHours,
      };

      return successResponse(res, 'Total hours data retrieved successfully', response);
    } else {
      return validationError(res, 'This endpoint functionality is not available for your role');
    }
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const getTotalLeavesData = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);

    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    if (user.role === constants.ROLE.EMPLOYEE) {
      // Get the latest leave history entry for the user
      const latestLeaveHistory = await LeaveHistory.findOne({ userId }).sort({ createdAt: -1 }).lean();

      if (!latestLeaveHistory) {
        return notFoundResponse(res, 'Leave history not found');
      }

      // Get the total leaves allocated to the user
      const firstLeaveHistory = await LeaveHistory.findOne({ userId }).sort({ createdAt: 1 }).lean();

      const totalLeaves = firstLeaveHistory?.availablePL || 0;

      // Calculate used leaves
      const usedLeaves = totalLeaves - (latestLeaveHistory.availablePL || 0);

      // Get approved leaves count for the current year
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31);

      const approvedLeaves = await Leave.find({
        userId: new mongoose.Types.ObjectId(userId),
        status: constants.LEAVE_STATUS.APPROVED,
        'applyDate.date': { $gte: startOfYear, $lte: endOfYear },
      });

      const response = {
        availableLeaves: latestLeaveHistory.availablePL || 0,
        usedLeaves,
        availableCompoffLeaves: latestLeaveHistory.availableCompOff || 0,
        totalLeaves,
        approvedLeaves: approvedLeaves.length,
        approvedLeavesData: approvedLeaves,
      };

      return successResponse(res, 'Total leaves data retrieved successfully', response);
    } else {
      return validationError(res, 'This endpoint functionality is not available for your role');
    }
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const getChartData = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);

    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    if (user.role === constants.ROLE.EMPLOYEE) {
      const { startTime, endTime, isMonthly } = req.query;
      const isMonthlyBool = isMonthly === 'true';
      const pipeline: PipelineStage[] = getWeeklyAndMonthlyHoursQuery(userId, isMonthlyBool, Number(startTime), Number(endTime));
      const barChartData = await Timer.aggregate(pipeline);

      const pieChartData = barChartData.reduce(
        (acc, curr) => {
          acc.totalHours += curr.totalHours;
          acc.totalWorkHours += curr.workHours;
          acc.totalMeetingHours += curr.meetingHours;
          acc.totalActivityHours += curr.activityHours;
          return acc;
        },
        { totalHours: 0, totalWorkHours: 0, totalMeetingHours: 0, totalActivityHours: 0 },
      );

      // New logic to get productivity data
      const productivityPipeline: PipelineStage[] = getProductivityQuery(userId, isMonthlyBool, Number(startTime), Number(endTime));
      const productivityData = await Screenshot.aggregate(productivityPipeline);
      console.log(productivityData)

      const productivityResults = productivityData.map(day => ({
        date: day._id,
        productivity: calculateProductivity(day.totalKeyStrokes, day.totalMouseScrolls, day.totalMouseClicks, day.totalMinutes),
      }));

      let response = {
        barChartData,
        pieChartData,
        productivityData: productivityResults,
      };
      return successResponse(res, 'Chart data retrieved successfully', response);
    } else {
      return validationError(res, 'This endpoint functionality is not available for your role');
    }
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

export default { getTotalHoursData, getTotalLeavesData, getChartData };
