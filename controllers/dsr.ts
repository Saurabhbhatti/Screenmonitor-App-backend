import { Request, Response } from 'express';
import axios from 'axios';

import { validationError, successResponse, errorResponse, notFoundResponse, successResponseWithPagination } from '../helpers/api-responses';
import { exportToExcel, getDsrActivityData } from '../helpers/dsrUtils';
import { User, DSR, Setting } from '../models';
import utils from '../helpers/utils';
import { getStartAndEndOfDay } from '../helpers/utils';
import { getDsrForUser, getDsrWithFilters } from '../helpers/timerUtils';
import constants from '../helpers/constants';

const getDSR = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await utils.getUserId(req);
    const { startDate, endDate, memberIds } = req.body;

    // Check if the user is an admin or HR
    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    let timers;
    if (user.role === constants.ROLE.COMPANY_ADMIN || user.role === constants.ROLE.HR) {
      // companyAdmin or HR logic
      if (!startDate || !endDate) {
        return validationError(res, 'startDate and endDate are required for admin/HR requests');
      }

      // Parse dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return validationError(res, 'Invalid date format');
      }

      // Fetch DSR data based on provided filters
      timers = await getDsrWithFilters(start, end, memberIds);
      return successResponse(res, 'Descriptions fetched successfully', timers);
    } else {
      // Regular user logic
      timers = await getDsrForUser(userId);

      if (!timers.length) {
        return successResponse(res, 'No descriptions found', []);
      }

      const formattedResponse = timers
        .map(project => {
          const descriptionList = project.descriptions?.map((desc: string) => `<li>${desc}</li>`).join('') || '';
          return `<b>${project.projectName}:</b><ul>${descriptionList}</ul>`;
        })
        .join('');

      return successResponse(res, 'Descriptions fetched successfully', formattedResponse);
    }
  } catch (error: any) {
    console.error('Error in fetchDsrData:', error);
    return errorResponse(res, error.message);
  }
};

const createDSR = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await utils.getUserId(req);
    if (!userId) {
      return validationError(res, 'User ID not found in request');
    }

    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const { description } = req.body;
    if (!description) {
      return validationError(res, 'Description is required');
    }

    // Get start and end of day
    const { startOfDay, endOfDay } = getStartAndEndOfDay();

    // Find existing DSR for today or create a new one
    let existingDsr = await DSR.findOneAndUpdate(
      {
        userId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      },
      { userId, description, createdAt: new Date(), companyId: user.companyId }, // Update or create fields
      { new: true, upsert: true, setDefaultsOnInsert: true }, // Options: return new doc, create if not found, set default values
    );

    // get slack webhook URL from settings
    const settings = await Setting.aggregate([
      {
        $match: { companyId: user.companyId },
      },
      {
        $lookup: {
          from: 'users', // Collection name for User
          localField: 'userId',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $unwind: '$userDetails',
      },
      {
        $match: { 'userDetails.role': 'CA' },
      },
      {
        $project: {
          userDetails: 0, // Optionally exclude user details if not needed
        },
      },
    ]);

    // Convert HTML to Slack format and send to Slack webhook
    const slackWebhookURL = settings[0].slack.webhookUrl || process.env.SLACK_WEBHOOK_URL!;
    const convertedText = utils.convertHtmlToSlackFormat(description);
    await axios.post(slackWebhookURL, { text: convertedText });

    return successResponse(res, 'DSR submitted successfully', existingDsr);
  } catch (error: any) {
    console.error('Error in createDSR:', error);
    return errorResponse(res, error.message);
  }
};

const generateReport = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);

    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const { startTime, endTime, memberId, fileFormat, isFile } = req.body;

    if (!startTime || !endTime) {
      return validationError(res, 'startTime and endTime are required');
    }

    if (Number(startTime) > Number(endTime)) {
      return validationError(res, 'startTime should be less than endTime');
    }

    const userIds: string[] = user.role === constants.ROLE.EMPLOYEE ? [userId] : memberId;
    const { totalRecords, data: trackedHours } = await getDsrActivityData(startTime, endTime, userIds);

    // Handle file export if `isFile` is true
    if (isFile) {
      if (fileFormat === 'xlsx') {
        const buffer = await exportToExcel(trackedHours);

        res.setHeader('Content-Disposition', 'attachment; filename="dsr_activity_report.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        return res.send(buffer);
      } else {
        return validationError(res, 'Invalid file format. Supported formats are xlsx');
      }
    }

    return successResponseWithPagination(res, 'DSR activity retrieved successfully', totalRecords, trackedHours);
  } catch (error: any) {
    console.error('Error in generateReport:', error);
    return errorResponse(res, error.message);
  }
};

// const generateReport = async (req: Request, res: Response) => {
//   try {
//     const userId = await utils.getUserId(req);
//     if (!userId) {
//       return validationError(res, 'User ID not found in request');
//     }

//     // Destructure query parameters
//     const { startDate, endDate, format, isFile, memberId }: DateRangeQuery = req.query;

//     // Fetch the logged-in user's data
//     const user = await fetchUser(userId);
//     if (!user) {
//       return validationError(res, 'User not found');
//     }

//     // Determine which user's data to fetch
//     let selectUserId = user.role === constants.ROLE.EMPLOYEE ? userId : memberId;

//     // Validate startDate and endDate
//     if (!startDate || !endDate) {
//       return validationError(res, 'Start date and end date are required');
//     }

//     const { startUnixTime, endUnixTime } = utils.getStartAndEndUnixTimes(startDate, endDate);

//     // Fetch data for the specified user or member
//     const [dsrs, timers, selectUser] = await Promise.all([
//       fetchDsrs(selectUserId, startUnixTime, endUnixTime),
//       fetchTimers(selectUserId, startUnixTime, endUnixTime),
//       fetchUser(selectUserId),
//     ]);

//     if (!selectUser) {
//       return validationError(res, 'Target user not found');
//     }

//     // Calculate total hours and prepare timesheet data
//     const totalHoursByDate = calculateTotalHoursByDate(timers);
//     const allDates = generateAllDatesMap(startDate, endDate);
//     const { data, totalHoursSum, totalDays } = generateTimesheetData(dsrs, totalHoursByDate, allDates);

//     // Check if a file needs to be generated and sent
//     if (isFile === 'true') {
//       return generateAndSendFile(res, format, data, selectUser, totalHoursSum, totalDays, startDate, endDate);
//     } else {
//       // Return data as JSON
//       return res.json({
//         user: selectUser,
//         data,
//         totalHoursSum,
//         totalDays,
//         startDate,
//         endDate,
//       });
//     }
//   } catch (error: any) {
//     console.error('Error in generateReport:', error);
//     return errorResponse(res, error.message);
//   }
// };

export default { getDSR, createDSR, generateReport };
