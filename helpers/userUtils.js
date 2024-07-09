import moment from 'moment';

import User from '../models/User.js';
import Timer from '../models/Timer.js';
import { active, role_uers } from './variables.js';
import mongoose from 'mongoose';

const countWorkingDays = (startTime, endTime) => {
  // Convert Unix timestamps to Date objects
  let startDate = new Date(startTime * 1000);
  let endDate = new Date(endTime * 1000);

  // Initialize the count of working days
  let workingDaysCount = 0;

  // Iterate through each day between startDate and endDate
  while (startDate <= endDate) {
    // Get the day of the week (0 = Sunday, 6 = Saturday)
    let dayOfWeek = startDate.getDay();

    // If the day is a weekday (Monday to Friday), increment the count
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDaysCount++;
    }

    // Move to the next day
    startDate.setDate(startDate.getDate() + 1);
  }

  return workingDaysCount;
};

//get user activity as today, weekly and monthly in hours and minutes
const getUserActivity = async (timeFrame, startDate, endDate, user) => {
  try {
    const now = moment().utc();
    let startTime;
    let workDaysInTimeFrame;

    if (timeFrame === 'today') {
      startTime = now.startOf('day');
      workDaysInTimeFrame = 1;
    }
    if (timeFrame === 'week') {
      startTime = now.startOf('isoWeek');
      workDaysInTimeFrame = 5;
    }
    if (timeFrame === 'month') {
      startTime = now.startOf('month');
      workDaysInTimeFrame = 22;
    }

    if (startDate && endDate) {
      workDaysInTimeFrame = countWorkingDays(startDate, endDate);
    }

    const startTimestamp = startDate || startTime.unix();
    const endTimestamp = endDate || moment().utc().unix();

    const matchStage = {
      role: role_uers,
      status: active,
    };
    if (user) {
      matchStage._id = user._id;
    }
    const timerPipeline = [
      {
        $match: matchStage,
      },
      {
        $lookup: {
          from: 'timers',
          localField: '_id',
          foreignField: 'userId',
          as: 'timers',
        },
      },
      {
        $unwind: { path: '$timers', preserveNullAndEmptyArrays: true },
      },
      {
        $match: {
          'timers.startTime': { $gte: Number(startTimestamp) },
          'timers.endTime': { $lte: Number(endTimestamp) },
        },
      },
      {
        $group: {
          _id: {
            userId: '$_id',
            first_name: '$first_name',
            last_name: '$last_name',
          },
          totalSeconds: { $sum: { $subtract: ['$timers.endTime', '$timers.startTime'] } },
        },
      },
      {
        $project: {
          _id: 0,
          userId: '$_id.userId',
          first_name: '$_id.first_name',
          last_name: '$_id.last_name',
          totalSeconds: 1,
        },
      },
      {
        $sort: { totalSeconds: -1 },
      },
    ];

    const usersWithTotalTime = await User.aggregate(timerPipeline);
    console.log('usersWithTotalTime', usersWithTotalTime);

    if (!usersWithTotalTime.length) {
      return [];
    }

    const formatResult = usersWithTotalTime.map((user) => {
      const totalSeconds = user.totalSeconds;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
        2,
        '0'
      )}:${String(seconds).padStart(2, '0')}`;
      const totalWorkHours = workDaysInTimeFrame * 8 * 3600; // Assuming 8-hour work days
      let totalWorkPercentage = (totalSeconds / totalWorkHours) * 100;
      // Ensure the percentage doesn't exceed 100%
      totalWorkPercentage = Math.min(totalWorkPercentage, 100);
      // Round to 2 decimal places
      totalWorkPercentage = totalWorkPercentage.toFixed(2) + '%';
      return {
        userId: user.userId,
        first_name: user.first_name,
        last_name: user.last_name,
        totalTime: formattedTime,
        totalWorkPercentage,
      };
    });

    return formatResult;
  } catch (error) {
    console.error('Error getting user activity:', error);
    throw error;
  }
};

//get user dailyHours and weekHours for checkIn and checkOut
const userAggregatedHoursForLogin = async (userId, startTime, endTime) => {
  let startTimestamp;
  let endTimestamp;

  if (startTime && endTime) {
    startTimestamp = startTime;
    endTimestamp = endTime;
  } else {
    startTimestamp = moment().utc().startOf('day').unix();
    endTimestamp = moment().utc().endOf('day').unix();
  }

  try {
    const dailyResult = await Timer.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          startTime: { $gte: startTimestamp },
          endTime: { $lt: endTimestamp },
        },
      },
      {
        $project: {
          userId: 1,
          duration: { $subtract: ['$endTime', '$startTime'] },
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: { $toDate: { $multiply: ['$startTime', 1000] } },
            },
          },
        },
      },
      {
        $group: {
          _id: '$date',
          totalSeconds: { $sum: '$duration' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          dailyWorkHours: {
            $let: {
              vars: {
                hours: { $floor: { $divide: ['$totalSeconds', 3600] } },
                minutes: { $floor: { $divide: [{ $mod: ['$totalSeconds', 3600] }, 60] } },
                seconds: { $mod: ['$totalSeconds', 60] },
              },
              in: {
                $concat: [
                  {
                    $cond: {
                      if: { $lt: ['$$hours', 10] },
                      then: { $concat: ['0', { $toString: '$$hours' }] },
                      else: { $toString: '$$hours' },
                    },
                  },
                  ':',
                  {
                    $cond: {
                      if: { $lt: ['$$minutes', 10] },
                      then: { $concat: ['0', { $toString: '$$minutes' }] },
                      else: { $toString: '$$minutes' },
                    },
                  },
                  ':',
                  {
                    $cond: {
                      if: { $lt: ['$$seconds', 10] },
                      then: { $concat: ['0', { $toString: '$$seconds' }] },
                      else: { $toString: '$$seconds' },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ]);

    // Calculate the start and end dates of the current week
    const startOfWeek = moment().startOf('isoWeek').toDate();
    const endOfWeek = moment().endOf('isoWeek').toDate();

    const weeklyResult = await Timer.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          startTime: { $gte: startOfWeek.getTime() / 1000 },
          endTime: { $lt: endOfWeek.getTime() / 1000 },
        },
      },
      {
        $project: {
          userId: 1,
          duration: { $subtract: ['$endTime', '$startTime'] },
          week: {
            $dateToString: {
              format: '%Y-%U',
              date: { $toDate: { $multiply: ['$startTime', 1000] } },
            },
          },
        },
      },
      {
        $group: {
          _id: '$week',
          totalSeconds: { $sum: '$duration' },
        },
      },
      {
        $project: {
          _id: 0,
          week: '$_id',
          weeklyWorkHours: {
            $let: {
              vars: {
                hours: { $floor: { $divide: ['$totalSeconds', 3600] } },
                minutes: { $floor: { $divide: [{ $mod: ['$totalSeconds', 3600] }, 60] } },
                seconds: { $mod: ['$totalSeconds', 60] },
              },
              in: {
                $concat: [
                  {
                    $cond: {
                      if: { $lt: ['$$hours', 10] },
                      then: { $concat: ['0', { $toString: '$$hours' }] },
                      else: { $toString: '$$hours' },
                    },
                  },
                  ':',
                  {
                    $cond: {
                      if: { $lt: ['$$minutes', 10] },
                      then: { $concat: ['0', { $toString: '$$minutes' }] },
                      else: { $toString: '$$minutes' },
                    },
                  },
                  ':',
                  {
                    $cond: {
                      if: { $lt: ['$$seconds', 10] },
                      then: { $concat: ['0', { $toString: '$$seconds' }] },
                      else: { $toString: '$$seconds' },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ]);

    // return result[0] || { dailyWorkHours: 0, weeklyHours: 0};
    return {
      dailyWorkHours: dailyResult[0]?.dailyWorkHours || '00:00:00',
      weeklyHours: weeklyResult[0]?.weeklyWorkHours || '00:00:00',
    };
  } catch (error) {
    console.error('Aggregation error (combined):', error);
    throw new Error('Failed to calculate hours');
  }
};

export { getUserActivity, userAggregatedHoursForLogin };
