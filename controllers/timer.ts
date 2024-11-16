import { Request, Response } from 'express';
import axios from 'axios';

import { User, Timer } from '../models';
import { errorResponse, notFoundResponse, successResponse, successResponseWithPagination, validationError } from '../helpers/api-responses';
import utils from '../helpers/utils';
import { getDailyAndWeeklyHours, getTimerActivityData, getTimelineActivity, getDsrWithFilters } from '../helpers/timerUtils';
import constants from '../helpers/constants';

// Check In
const checkIn = async (req: Request, res: Response) => {
  try {
    const { projectId, description, type } = req.body;

    const userId = await utils.getUserId(req);
    const isUser = await User.findById(userId);
    if (!isUser) {
      return validationError(res, 'User not found');
    }

    // Check if userId and type are provided - mandatory fields
    if (!userId || !type) {
      return validationError(res, 'userId and type are required');
    }

    // Check if the type is valid
    if (!['work', 'meeting', 'activity'].includes(type)) {
      return validationError(res, 'Invalid type, should be work, meeting or activity');
    }

    const startTime = utils.getCurrentTime();

    // Create new timer instance and save to database
    const timer = new Timer({
      companyId: isUser.companyId,
      userId,
      projectId,
      description,
      startTime,
      type,
    });

    await timer.save();

    // Fetch aggregated daily and weekly hours for the user
    const { dailyWorkHours, weeklyWorkHours } = await getDailyAndWeeklyHours(userId);

    // Prepare response with timer details and aggregated hours
    const response = {
      _id: timer._id,
      userId: timer.userId,
      projectId: timer.projectId,
      description: timer.description,
      startTime: timer.startTime,
      endTime: timer.endTime,
      type: timer.type,
      dailyTotalWorkingHour: dailyWorkHours,
      weeklyTotalWorkingHour: weeklyWorkHours,
    };

    return successResponse(res, 'Time added successfully', response);
  } catch (error: any) {
    console.error('Error in checkIn:', error);
    return errorResponse(res, error.message);
  }
};

// Check Out
const checkOut = async (req: Request, res: Response) => {
  try {
    const { id, isAutoCheckout, issueId, comment } = req.body;

    const userId = await utils.getUserId(req);
    const isUser = await User.findById(userId);
    if (!isUser) {
      return validationError(res, 'User not found');
    }

    const timer = await Timer.findById(id);

    // Check if timer exists
    if (!timer) {
      return errorResponse(res, 'Timer not found');
    }

    // Set end time and calculate total time duration
    const endTime = utils.getCurrentTime();
    // const timeDiff = endTime - timer.startTime;

    timer.endTime = endTime;
    // timer.totalTime = timeDiff;
    timer.isAutoCheckout = isAutoCheckout;

    await timer.save();

    // Fetch aggregated daily and weekly hours for the user
    const { dailyWorkHours, weeklyWorkHours } = await getDailyAndWeeklyHours(timer.userId);

    // Prepare response with updated timer details and aggregated hours
    const response = {
      _id: timer._id,
      userId: timer.userId,
      projectId: timer.projectId,
      description: timer.description,
      startTime: timer.startTime,
      endTime: timer.endTime,
      type: timer.type,
      isAutoCheckout: timer.isAutoCheckout,
      dailyTotalWorkingHour: dailyWorkHours,
      weeklyTotalWorkingHour: weeklyWorkHours,
    };

    const timeSpent = timer.endTime - timer.startTime;

    const worklogData = {
      comment: {
        content: [
          {
            content: [
              {
                text: comment || '',
                type: 'text',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      },
      started: '2024-10-15T12:34:00.000+0000',
      timeSpentSeconds: timeSpent,
    };

    const jiraURL = `${process.env.JIRA_BASE_URL}/rest/api/3/issue/${issueId}/worklog`;

    // Make the request to JIRA API
    await axios.post(jiraURL, worklogData, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    return successResponse(res, 'End time updated successfully', response);
  } catch (error: any) {
    console.error('Error in checkOut:', error);
    return errorResponse(res, error.message);
  }
};

// Daily Working Hours
const dailyWorkingHours = async (req: Request, res: Response) => {
  try {
    const loginUserId = await utils.getUserId(req);
    const isUser = await User.findById(loginUserId);
    if (!isUser) {
      return validationError(res, 'User not found');
    }

    const { startTime, endTime, userId } = req.body;

    // Fetch aggregated daily and weekly hours for the user
    const { dailyWorkHours, weeklyWorkHours } = await getDailyAndWeeklyHours(userId, startTime, endTime);

    // Prepare response with daily and weekly hours
    const response = {
      dailyTotalWorkingHour: dailyWorkHours,
      weeklyTotalWorkingHour: weeklyWorkHours,
    };

    return successResponse(res, 'Daily working hours retrieved successfully', response);
  } catch (error: any) {
    console.error('Error in dailyWorkingHours:', error);
    return errorResponse(res, error.message);
  }
};

const timerActivity = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);

    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 1;
    const { startTime, endTime, searchText, projectId, memberId } = req.body;

    if (!startTime || !endTime) {
      return validationError(res, 'startTime and endTime are required');
    }

    if (Number(startTime) > Number(endTime)) {
      return validationError(res, 'startTime should be less than endTime');
    }

    const userIds: string[] = user.role === constants.ROLE.EMPLOYEE ? [userId] : memberId;
    const { totalRecords, data: trackedHours } = await getTimerActivityData(startTime, endTime, limit, offset, searchText, projectId, userIds);

    return successResponseWithPagination(res, 'Timer activity retrieved successfully', totalRecords, trackedHours);
  } catch (error: any) {
    console.error('Error in timerActivity:', error);
    return errorResponse(res, error.message);
  }
};

const timelineActivity = async (req: Request, res: Response) => {
  const tokenUserId = await utils.getUserId(req);
  const user = await User.findById(tokenUserId);

  if (!user) {
    return notFoundResponse(res, 'User not found');
  }

  const { startTime, endTime, userId } = req.body;

  if (!startTime || !endTime) {
    return validationError(res, 'startTime and endTime are required');
  }

  if (Number(startTime) > Number(endTime)) {
    return validationError(res, 'startTime should be less than endTime');
  }

  const userExists = await User.findById(userId);
  if (!userExists) {
    return notFoundResponse(res, 'User not found');
  }

  // convert unix timestamp to date
  const startDate = new Date(startTime * 1000);
  const endDate = new Date(endTime * 1000);

  const timelineActivity = await getTimelineActivity(startTime, endTime, userId);
  const dsr = await getDsrWithFilters(startDate, endDate, [userId]);
  const response = {
    timelineActivity,
    dsr,
  };
  return successResponse(res, 'Timeline activity retrieved successfully', response);
};

export default { checkIn, checkOut, dailyWorkingHours, timerActivity, timelineActivity };
