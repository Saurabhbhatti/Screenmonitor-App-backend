import { Request, Response } from 'express';
import mongoose from 'mongoose';
import moment from 'moment';
import { UploadedFile } from 'express-fileupload';

import { errorResponse, successResponse, validationError } from '../helpers/api-responses';
import { User, Screenshot, Timer } from '../models';
import utils from '../helpers/utils';
import { ScreenshotFilterOptions } from '../types';

// Upload Screenshot
const uploadScreenshot = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return validationError(res, 'User not found');
    }

    const { projectId, activities } = req.body;
    const screenshot = req.files?.screenshot as UploadedFile;

    const uploadScreenshot = screenshot ? await utils.uploadToCloudinary(screenshot.tempFilePath, 'screenshots') : null;

    // Check if activities is defined and is a string before parsing
    let parsedActivities = [];
    if (activities) {
      try {
        parsedActivities = JSON.parse(activities);
      } catch (error) {
        return validationError(res, 'Invalid activities format');
      }
    } else {
      return validationError(res, 'Activities not provided');
    }

    // Find latest previous screenshot and calculate total minutes
    const todayStart: Date = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const lastScreenshot = await Screenshot.findOne({ userId, projectId, createdAt: { $gte: todayStart } }).sort({ createdAt: -1 });

    let totalMinutes: number = 0;
    if (lastScreenshot) {
      const previousTime = lastScreenshot.createdAt ? new Date(lastScreenshot.createdAt).getTime() : 0;
      const currentTime = new Date().getTime();
      totalMinutes = Math.floor((currentTime - previousTime) / 60000);
    }

    const newScreenshot = new Screenshot({
      companyId: user.companyId,
      userId: userId,
      projectId,
      screenshot: {
        fileName: screenshot ? screenshot.name : '',
        fileType: screenshot ? screenshot.mimetype : '',
        fileUrl: uploadScreenshot ? uploadScreenshot : '',
      },
      activities: parsedActivities,
      totalMouseClicks: parsedActivities.reduce((total: number, activity: any) => total + activity.mouseClicks, 0),
      totalMouseScrolls: parsedActivities.reduce((total: number, activity: any) => total + activity.mouseScrolls, 0),
      totalKeyStrokes: parsedActivities.reduce((total: number, activity: any) => total + activity.keyStrokes, 0),
      totalMinutes,
    });

    const saveScreenshot = await newScreenshot.save();

    return successResponse(res, 'Screenshot uploaded successfully', saveScreenshot);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to upload screenshot');
  }
};

// Get Hourly Screenshots
const getHourlyScreenshots = async (req: Request, res: Response) => {
  try {
    const loginUserId = await utils.getUserId(req);
    const user = await User.findById(loginUserId);
    if (!user) {
      return validationError(res, 'User not found');
    }

    const { userId, projectId, date } = req.body;

    const screenshotQuery: ScreenshotFilterOptions = { userId: new mongoose.Types.ObjectId(userId as string) };

    let startTime: number = utils.getDefaultStartTime();
    let endTime: number = utils.getDefaultEndTime();

    if (date) {
      const searchDate = moment.tz(date, 'DD-MM-YYYY', 'Asia/Kolkata').startOf('day');
      screenshotQuery.createdAt = {
        $gte: searchDate.toDate(),
        $lt: searchDate.clone().add(1, 'day').toDate(),
      };

      startTime = searchDate.unix();
      endTime = searchDate.clone().add(1, 'day').unix();
    }

    if (projectId) {
      screenshotQuery.projectId = new mongoose.Types.ObjectId(projectId as string);
    }

    // Get total hours from start to end of the day from timers collection
    const totalHours = await Timer.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId as string),
          startTime: { $gte: startTime },
          endTime: { $lte: endTime },
        },
      },
      {
        $group: {
          _id: null,
          totalHours: { $sum: { $subtract: ['$endTime', '$startTime'] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalHours: {
            $let: {
              vars: {
                hours: { $floor: { $divide: ['$totalHours', 3600] } },
                minutes: { $floor: { $divide: [{ $mod: ['$totalHours', 3600] }, 60] } },
              },
              in: {
                $concat: [
                  { $toString: '$$hours' },
                  ':',
                  { $cond: [{ $lt: ['$$minutes', 10] }, { $concat: ['0', { $toString: '$$minutes' }] }, { $toString: '$$minutes' }] },
                ],
              },
            },
          },
        },
      },
    ]);

    const screenShots = await Screenshot.aggregate([
      { $match: screenshotQuery },
      {
        $lookup: {
          from: 'projects',
          localField: 'projectId',
          foreignField: '_id',
          as: 'projectDetails',
        },
      },
      { $unwind: { path: '$projectDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            hour: { $hour: { date: '$createdAt', timezone: 'Asia/Kolkata' } },
          },
          count: { $sum: 1 },
          screenshots: { $push: '$$ROOT' },
        },
      },
      { $sort: { '_id.hour': 1 } },
    ]);

    if (screenShots.length === 0) {
      return successResponse(res, 'No data found', null);
    }

    const hourlyScreenShots = screenShots.map(hourlyGroup => {
      const startHour = hourlyGroup._id.hour;
      const endHour = (startHour + 1) % 24;

      return {
        time: `${startHour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`,
        count: hourlyGroup.count,
        screenshots: hourlyGroup.screenshots
          .filter((screenshot: any) => screenshot && screenshot.screenshot)
          .map((screenshot: any) => ({
            fileName: screenshot.screenshot.fileName,
            fileType: screenshot.screenshot.fileType,
            fileUrl: screenshot.screenshot.fileUrl,
            createdAt: screenshot.createdAt,
            projectId: screenshot.projectId,
            projectName: screenshot.projectDetails ? screenshot.projectDetails.projectName : '',
            totalMouseClicks: screenshot.totalMouseClicks,
            totalMouseScrolls: screenshot.totalMouseScrolls,
            totalKeyStrokes: screenshot.totalKeyStrokes,
            totalMinutes: screenshot.activities.length,
            activities: screenshot.activities,
          })),
      };
    });

    return successResponse(res, 'Data received successfully', {
      totalHours: totalHours.length ? totalHours[0].totalHours : 0,
      hourlyScreenshots: hourlyScreenShots,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to get hourly screenshots');
  }
};

export default { uploadScreenshot, getHourlyScreenshots };
