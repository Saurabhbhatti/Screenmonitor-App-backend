import mongoose, { PipelineStage } from 'mongoose';
import utils from '../helpers/utils';

export const getDsrActivityQuery = (startTime: number, endTime: number, memberId?: string[]) => {
  const startTimestampIST: number = utils.getUnixTimeInIST(startTime);
  const endTimestampIST: number = utils.getUnixTimeInIST(endTime);
  const filterOptions: any = {
    startTime: { $gte: Number(startTimestampIST), $lte: Number(endTimestampIST) },
  };

  // If memberId is provided, filter by userId
  if (memberId) {
    filterOptions.userId = { $in: memberId.map(id => new mongoose.Types.ObjectId(id)) };
  }

  const startDate = new Date(startTimestampIST * 1000);
  const endDate = new Date(endTimestampIST * 1000);
  const dateRange = [];
  let currentDate = new Date(startDate);

  // Create an array of dates in the range
  while (currentDate <= endDate) {
    dateRange.push({
      date: currentDate.toISOString().split('T')[0],
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const pipeline: PipelineStage[] = [
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
      $addFields: {
        day: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: { $multiply: ['$startTime', 1000] } } } },
      },
    },
    {
      $group: {
        _id: { userId: '$userId', day: '$day' },
        firstName: { $first: '$user.firstName' },
        lastName: { $first: '$user.lastName' },
        designation: { $first: '$user.designation' },
        email: { $first: '$user.email' },
        empCode: { $first: '$user.empCode' },
        hoursTracked: { $sum: { $subtract: ['$endTime', '$startTime'] } },
      },
    },
    {
      $group: {
        _id: { userId: '$_id.userId', day: '$_id.day' },
        firstName: { $first: '$firstName' },
        lastName: { $first: '$lastName' },
        designation: { $first: '$designation' },
        email: { $first: '$email' },
        empCode: { $first: '$empCode' },
        hoursTracked: { $sum: '$hoursTracked' },
      },
    },
    {
      $lookup: {
        from: 'holidays',
        let: { startTime: startDate, endTime: endDate },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $gte: ['$date', { $toDate: '$$startTime' }] }, { $lte: ['$date', { $toDate: '$$endTime' }] }],
              },
            },
          },
          {
            $project: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            },
          },
        ],
        as: 'holidays',
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
                {
                  $cond: [{ $lt: ['$$minutes', 10] }, { $concat: ['0', { $toString: '$$minutes' }] }, { $toString: '$$minutes' }],
                },
              ],
            },
          },
        },
        holidayDates: '$holidays.date',
      },
    },
    {
      $lookup: {
        from: 'dsrs',
        let: {
          userId: '$_id.userId',
          day: '$_id.day',
          startTime: startDate,
          endTime: endDate,
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$userId', '$$userId'] },
                  { $gte: ['$createdAt', { $toDate: '$$startTime' }] },
                  { $lte: ['$createdAt', { $toDate: '$$endTime' }] },
                  { $eq: [{ $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, '$$day'] },
                ],
              },
            },
          },
          {
            $project: {
              description: 1,
            },
          },
        ],
        as: 'dsr',
      },
    },
    {
      $addFields: {
        dsr: { $arrayElemAt: ['$dsr', 0] },
      },
    },
    {
      $group: {
        _id: '$_id.userId',
        firstName: { $first: '$firstName' },
        lastName: { $first: '$lastName' },
        designation: { $first: '$designation' },
        email: { $first: '$email' },
        empCode: { $first: '$empCode' },
        totalHoursTracked: { $sum: '$hoursTracked' },
        activities: {
          $push: {
            date: '$_id.day',
            dailyHoursTracked: '$dailyHoursTracked',
            dsr: '$dsr',
          },
        },
        holidayDates: { $first: '$holidayDates' },
      },
    },
    {
      $addFields: {
        totalDays: { $size: '$activities' },
        Period: {
          $concat: [{ $dateToString: { format: '%Y-%m-%d', date: startDate } }, ' to ', { $dateToString: { format: '%Y-%m-%d', date: endDate } }],
        },
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
                  isHoliday: { $in: ['$$date.date', '$holidayDates'] },
                },
                in: {
                  date: '$$date.date',
                  dailyHoursTracked: {
                    $cond: [
                      { $eq: ['$$isHoliday', true] },
                      'Holiday',
                      {
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
                    ],
                  },
                  dsr: {
                    $cond: [
                      { $eq: ['$$isHoliday', true] },
                      'Holiday',
                      {
                        $cond: [
                          {
                            $in: [
                              { $dayOfWeek: { date: { $dateFromString: { dateString: '$$date.date' } } } },
                              [1, 7], // 1 = Sunday, 7 = Saturday
                            ],
                          },
                          'WO',
                          {
                            $cond: [{ $ifNull: ['$$activity', false] }, '$$activity.dsr', {}],
                          },
                        ],
                      },
                    ],
                  },
                  leave: {
                    $cond: [{ $eq: ['$$isHoliday', true] }, 'Holiday', '-'],
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
        data: [{ $sort: { _id: 1 } }],
      },
    },
    {
      $project: {
        totalRecords: { $arrayElemAt: ['$totalRecords.count', 0] },
        data: 1,
      },
    },
  ];

  return pipeline;
};
