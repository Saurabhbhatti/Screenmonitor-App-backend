import mongoose, { PipelineStage } from 'mongoose';

import { DailyWeeklyHourPipeline, TimerActivityFilterOptions, GetDsrForUserPipeline, GetDsrWithFiltersPipeline } from '../types';
import utils from '../helpers/utils';

export const getDailyAndWeeklyHourQuery = (
  startTime: number,
  endTime: number,
  weekStartTime: number,
  weekEndTime: number,
  userId: string,
): DailyWeeklyHourPipeline => {
  const pipeline: DailyWeeklyHourPipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $facet: {
        daily: [
          {
            $match: {
              startTime: { $gte: startTime, $lt: endTime },
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
        ],
        weekly: [
          {
            $match: {
              startTime: { $gte: weekStartTime, $lt: weekEndTime },
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
        ],
      },
    },
  ];

  return pipeline;
};

export const getDsrForUserQuery = (startTime: number, endTime: number, userId: string): GetDsrForUserPipeline => {
  const pipeline: GetDsrForUserPipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        startTime: { $gte: startTime, $lte: endTime },
        type: { $in: ['work', 'meeting'] },
      },
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'projectId',
        foreignField: '_id',
        as: 'project',
      },
    },
    { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$project._id',
        projectName: { $first: '$project.projectName' },
        descriptions: { $push: '$description' },
      },
    },
    {
      $project: {
        _id: 0,
        projectName: 1,
        descriptions: 1,
      },
    },
  ];

  return pipeline;
};

export const getDsrWithFiltersQuery = (startDate: Date, endDate: Date, memberIds?: string[]): GetDsrWithFiltersPipeline => {
  const matchStage: any = {
    createdAt: { $gte: startDate, $lte: endDate },
  };

  if (memberIds && memberIds.length > 0) {
    matchStage.userId = { $in: memberIds.map(id => new mongoose.Types.ObjectId(id)) };
  }

  const pipeline: GetDsrWithFiltersPipeline = [
    {
      $match: matchStage,
    },
    {
      $project: {
        userId: 1,
        description: 1,
        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      },
    },
    {
      $group: {
        _id: {
          date: '$date',
          userId: '$userId',
        },
        descriptions: { $push: '$description' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id.userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        userId: '$_id.userId',
        userName: '$user.name',
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        date: '$_id.date',
        descriptions: 1,
      },
    },
    {
      $group: {
        _id: '$date',
        members: {
          $push: {
            userId: '$userId',
            userName: '$userName',
            firstName: '$firstName',
            lastName: '$lastName',
            descriptions: '$descriptions',
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        members: 1,
      },
    },
    {
      $sort: { date: 1 },
    },
  ];
  return pipeline;
};

export const getTimerActivityQuery = (
  startTime: number,
  endTime: number,
  limit: number,
  offset: number,
  searchText?: string,
  projectId?: Array<string>,
  memberId?: Array<string>,
) => {
  const startTimestampIST: number = utils.getUnixTimeInIST(startTime);
  const endTimestampIST: number = utils.getUnixTimeInIST(endTime);
  const filterOptions: TimerActivityFilterOptions = {
    startTime: { $gte: Number(startTimestampIST), $lte: Number(endTimestampIST) },
  };

  if (projectId) {
    filterOptions.projectId = { $in: projectId.map(id => new mongoose.Types.ObjectId(id)) };
  }

  if (memberId) {
    filterOptions.userId = { $in: memberId.map(id => new mongoose.Types.ObjectId(id)) };
  }

  const startDate = new Date(startTimestampIST * 1000);
  const endDate = new Date(endTimestampIST * 1000);
  const dateRange = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dateRange.push({
      date: currentDate.toISOString().split('T')[0],
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const pipleline: PipelineStage[] = [
    {
      $match: filterOptions,
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
    },
    {
      $match: searchText
        ? { $or: [{ 'user.firstName': { $regex: searchText, $options: 'i' } }, { 'user.lastName': { $regex: searchText, $options: 'i' } }] }
        : {},
    },
    {
      $addFields: {
        day: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: { $multiply: ['$startTime', 1000] } } } },
      },
    },
    {
      $group: {
        _id: { userId: '$userId', day: '$day', type: '$type' },
        firstName: { $first: '$user.firstName' },
        lastName: { $first: '$user.lastName' },
        hoursTracked: { $sum: { $subtract: ['$endTime', '$startTime'] } },
      },
    },
    {
      $group: {
        _id: { userId: '$_id.userId', day: '$_id.day' },
        firstName: { $first: '$firstName' },
        lastName: { $first: '$lastName' },
        hoursTracked: { $sum: '$hoursTracked' },
        types: {
          $push: {
            type: '$_id.type',
            hoursTracked: '$hoursTracked',
          },
        },
      },
    },
    {
      $addFields: {
        dailyHoursTracked: {
          $let: {
            vars: {
              hours: { $floor: { $divide: ['$hoursTracked', 3600] } },
              minutes: { $floor: { $divide: [{ $mod: ['$hoursTracked', 3600] }, 60] } },
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
        types: {
          $map: {
            input: '$types',
            as: 'type',
            in: {
              type: '$$type.type',
              hoursTracked: {
                $let: {
                  vars: {
                    hours: { $floor: { $divide: ['$$type.hoursTracked', 3600] } },
                    minutes: { $floor: { $divide: [{ $mod: ['$$type.hoursTracked', 3600] }, 60] } },
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
        },
      },
    },
    {
      $group: {
        _id: '$_id.userId',
        firstName: { $first: '$firstName' },
        lastName: { $first: '$lastName' },
        totalHoursTracked: { $sum: '$hoursTracked' },
        activities: {
          $push: {
            date: '$_id.day',
            dailyHoursTracked: '$dailyHoursTracked',
            types: '$types',
          },
        },
      },
    },
    {
      $addFields: {
        totalHoursTracked: {
          $let: {
            vars: {
              hours: { $floor: { $divide: ['$totalHoursTracked', 3600] } },
              minutes: { $floor: { $divide: [{ $mod: ['$totalHoursTracked', 3600] }, 60] } },
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
        activities: {
          $map: {
            input: dateRange,
            as: 'date',
            in: {
              $let: {
                vars: {
                  activity: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$activities',
                          as: 'activity',
                          cond: { $eq: ['$$activity.date', '$$date.date'] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: {
                  date: '$$date.date',
                  dailyHoursTracked: {
                    $cond: [
                      {
                        $in: [
                          { $dayOfWeek: { date: { $dateFromString: { dateString: '$$date.date' } } } },
                          [1, 7], // 1 = Sunday, 7 = Saturday
                        ],
                      },
                      'WO',
                      {
                        $cond: [{ $ifNull: ['$$activity', false] }, '$$activity.dailyHoursTracked', '-'],
                      },
                    ],
                  },
                  types: {
                    $cond: [{ $ifNull: ['$$activity', false] }, '$$activity.types', []],
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $facet: {
        totalRecords: [{ $count: 'count' }],
        data: [{ $sort: { _id: 1 } }, { $skip: (Number(offset) - 1) * Number(limit) }, { $limit: Number(limit) }],
      },
    },
    {
      $project: {
        totalRecords: { $arrayElemAt: ['$totalRecords.count', 0] },
        data: 1,
      },
    },
  ];

  return pipleline;
};

export const getTimelineActivityQuery = (startTime: number, endTime: number, userId: string) => {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        startTime: { $gte: startTime },
        endTime: { $lte: endTime },
      },
    },
    {
      $sort: { startTime: 1 },
    },
    {
      $addFields: {
        hoursTracked: {
          $divide: [{ $subtract: ['$endTime', '$startTime'] }, 3600],
        },
      },
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'projectId',
        foreignField: '_id',
        as: 'project',
      },
    },
    {
      $unwind: {
        path: '$project',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: null,
        userId: { $first: '$userId' },
        firstCheckin: { $min: '$startTime' },
        lastCheckout: { $max: '$endTime' },
        totalHoursTracked: { $sum: '$hoursTracked' },
        activities: {
          $push: {
            projectName: '$project.projectName',
            type: '$type',
            checkin: '$startTime',
            checkout: '$endTime',
            hoursTracked: '$hoursTracked',
            description: '$description',
            isAutoCheckout: '$isAutoCheckout',
          },
        },
        totalActivityHours: {
          $sum: {
            $cond: [{ $eq: ['$type', 'activity'] }, '$hoursTracked', 0],
          },
        },
        totalMeetingHours: {
          $sum: {
            $cond: [{ $eq: ['$type', 'meeting'] }, '$hoursTracked', 0],
          },
        },
        totalWorkHours: {
          $sum: {
            $cond: [{ $eq: ['$type', 'work'] }, '$hoursTracked', 0],
          },
        },
        totalManualHours: {
          $sum: {
            $cond: [{ $eq: ['$type', 'manual'] }, '$hoursTracked', 0],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    {
      $project: {
        _id: 0,
        userId: '$userId',
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        firstCheckin: {
          $dateToString: {
            format: '%H:%M',
            date: {
              $add: [
                { $toDate: { $multiply: ['$firstCheckin', 1000] } },
                19800000, // Adding 5 hours and 30 minutes in milliseconds
              ],
            },
          },
        },
        lastCheckout: {
          $dateToString: {
            format: '%H:%M',
            date: {
              $add: [
                { $toDate: { $multiply: ['$lastCheckout', 1000] } },
                19800000, // Adding 5 hours and 30 minutes in milliseconds
              ],
            },
          },
        },
        totalHoursTracked: {
          $concat: [
            { $toString: { $floor: '$totalHoursTracked' } },
            ':',
            {
              $substr: [
                {
                  $concat: [
                    { $cond: [{ $lt: [{ $mod: [{ $multiply: ['$totalHoursTracked', 60] }, 60] }, 10] }, '0', ''] },
                    { $toString: { $mod: [{ $multiply: ['$totalHoursTracked', 60] }, 60] } },
                  ],
                },
                0,
                2,
              ],
            },
          ],
        },
        totalActivityHours: {
          $concat: [
            { $toString: { $floor: '$totalActivityHours' } },
            ':',
            {
              $substr: [
                {
                  $concat: [
                    { $cond: [{ $lt: [{ $mod: [{ $multiply: ['$totalActivityHours', 60] }, 60] }, 10] }, '0', ''] },
                    { $toString: { $mod: [{ $multiply: ['$totalActivityHours', 60] }, 60] } },
                  ],
                },
                0,
                2,
              ],
            },
          ],
        },
        totalMeetingHours: {
          $concat: [
            { $toString: { $floor: '$totalMeetingHours' } },
            ':',
            {
              $substr: [
                {
                  $concat: [
                    { $cond: [{ $lt: [{ $mod: [{ $multiply: ['$totalMeetingHours', 60] }, 60] }, 10] }, '0', ''] },
                    { $toString: { $mod: [{ $multiply: ['$totalMeetingHours', 60] }, 60] } },
                  ],
                },
                0,
                2,
              ],
            },
          ],
        },
        totalWorkHours: {
          $concat: [
            { $toString: { $floor: '$totalWorkHours' } },
            ':',
            {
              $substr: [
                {
                  $concat: [
                    { $cond: [{ $lt: [{ $mod: [{ $multiply: ['$totalWorkHours', 60] }, 60] }, 10] }, '0', ''] },
                    { $toString: { $mod: [{ $multiply: ['$totalWorkHours', 60] }, 60] } },
                  ],
                },
                0,
                2,
              ],
            },
          ],
        },
        totalManualHours: {
          $concat: [
            { $toString: { $floor: '$totalManualHours' } },
            ':',
            {
              $substr: [
                {
                  $concat: [
                    { $cond: [{ $lt: [{ $mod: [{ $multiply: ['$totalManualHours', 60] }, 60] }, 10] }, '0', ''] },
                    { $toString: { $mod: [{ $multiply: ['$totalManualHours', 60] }, 60] } },
                  ],
                },
                0,
                2,
              ],
            },
          ],
        },
        activities: {
          $map: {
            input: '$activities',
            as: 'activity',
            in: {
              projectName: '$$activity.projectName',
              type: '$$activity.type',
              checkin: {
                $dateToString: {
                  format: '%H:%M',
                  date: {
                    $add: [
                      { $toDate: { $multiply: ['$$activity.checkin', 1000] } },
                      19800000, // Adding 5 hours and 30 minutes in milliseconds to convert to IST
                    ],
                  },
                },
              },
              checkout: {
                $dateToString: {
                  format: '%H:%M',
                  date: {
                    $add: [
                      { $toDate: { $multiply: ['$$activity.checkout', 1000] } },
                      19800000, // Adding 5 hours and 30 minutes in milliseconds to convert to IST
                    ],
                  },
                },
              },
              hoursTracked: {
                $concat: [
                  { $toString: { $floor: '$$activity.hoursTracked' } },
                  ':',
                  {
                    $substr: [
                      {
                        $concat: [
                          { $cond: [{ $lt: [{ $mod: [{ $multiply: ['$$activity.hoursTracked', 60] }, 60] }, 10] }, '0', ''] },
                          { $toString: { $mod: [{ $multiply: ['$$activity.hoursTracked', 60] }, 60] } },
                        ],
                      },
                      0,
                      2,
                    ],
                  },
                ],
              },
              description: '$$activity.description',
              isAutoCheckout: '$$activity.isAutoCheckout',
            },
          },
        },
      },
    },
  ];

  return pipeline;
};

export const getTotalHoursQuery = (userId: string, startTime: number, endTime: number): PipelineStage[] => {
  console.log(userId, startTime, endTime);
  const pipeline: PipelineStage[] = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        startTime: { $gte: startTime, $lte: endTime },
      },
    },
    {
      $project: {
        duration: { $subtract: ['$endTime', '$startTime'] },
      },
    },
    {
      $group: {
        _id: null,
        totalSeconds: { $sum: '$duration' },
      },
    },
    {
      $project: {
        _id: 0,
        totalHours: {
          $let: {
            vars: {
              hours: { $floor: { $divide: ['$totalSeconds', 3600] } },
              minutes: { $floor: { $divide: [{ $mod: ['$totalSeconds', 3600] }, 60] } },
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
              ],
            },
          },
        },
      },
    },
  ];

  return pipeline;
};

export const getWeeklyAndMonthlyHoursQuery = (userId: string, isMonthly: string | boolean, startTime?: number, endTime?: number): PipelineStage[] => {
  const currentYear = new Date().getFullYear();

  const matchStage: any = {
    userId: new mongoose.Types.ObjectId(userId),
  };

  if (isMonthly || isMonthly === 'true') {
    matchStage.startTime = {
      $gte: new Date(currentYear, 0, 1).getTime() / 1000,
      $lt: new Date(currentYear + 1, 0, 1).getTime() / 1000,
    };
  } else if (startTime && endTime) {
    matchStage.startTime = { $gte: startTime, $lte: endTime };
  }
  const pipeline: PipelineStage[] = [
    { $match: matchStage },
    {
      $project: {
        date: {
          $cond: {
            if: { $eq: [isMonthly, true] },
            then: {
              $let: {
                vars: {
                  monthNames: [
                    'January',
                    'February',
                    'March',
                    'April',
                    'May',
                    'June',
                    'July',
                    'August',
                    'September',
                    'October',
                    'November',
                    'December',
                  ],
                },
                in: {
                  $arrayElemAt: ['$$monthNames', { $subtract: [{ $month: { $toDate: { $multiply: ['$startTime', 1000] } } }, 1] }],
                },
              },
            },
            else: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: { $toDate: { $multiply: ['$startTime', 1000] } },
              },
            },
          },
        },
        duration: { $subtract: ['$endTime', '$startTime'] },
        type: 1,
      },
    },
    {
      $group: {
        _id: '$date',
        totalSeconds: { $sum: '$duration' },
        workSeconds: {
          $sum: { $cond: [{ $eq: ['$type', 'work'] }, '$duration', 0] },
        },
        meetingSeconds: {
          $sum: { $cond: [{ $eq: ['$type', 'meeting'] }, '$duration', 0] },
        },
        activitySeconds: {
          $sum: { $cond: [{ $eq: ['$type', 'activity'] }, '$duration', 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        totalHours: { $round: [{ $divide: ['$totalSeconds', 3600] }, 2] },
        workHours: { $round: [{ $divide: ['$workSeconds', 3600] }, 2] },
        meetingHours: { $round: [{ $divide: ['$meetingSeconds', 3600] }, 2] },
        activityHours: { $round: [{ $divide: ['$activitySeconds', 3600] }, 2] },
      },
    },
    {
      $sort: { date: 1 },
    },
  ];

  return pipeline;
};
