import mongoose, { PipelineStage } from 'mongoose';
import utils from '../helpers/utils';
import { TimerActivityFilterOptions } from '../types';

export const getAttendanceQuery = (
  startTime: number,
  endTime: number,
  limit: number,
  offset: number,
  searchText?: string,
  memberId?: Array<string>,
) => {
  const startTimestampIST: number = utils.getUnixTimeInIST(startTime);
  const endTimestampIST: number = utils.getUnixTimeInIST(endTime);
  const filterOptions: TimerActivityFilterOptions = {
    startTime: { $gte: Number(startTimestampIST), $lte: Number(endTimestampIST) },
  };

  if (memberId) {
    filterOptions.userId = { $in: memberId.map(id => new mongoose.Types.ObjectId(id)) };
  }

  const startDate = new Date(startTimestampIST * 1000);
  const endDate = new Date(endTimestampIST * 1000);
  const dateRange: Array<{ date: string }> = [];
  let currentDate = new Date(startDate);

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
        _id: { userId: '$userId', day: '$day' },
        firstName: { $first: '$user.firstName' },
        lastName: { $first: '$user.lastName' },
        hoursTracked: { $sum: { $subtract: ['$endTime', '$startTime'] } },
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
              $cond: [
                { $eq: ['$hoursTracked', 0] }, // If hours tracked are 0
                { dailyHoursTracked: '0', attendance: 'Absent' }, // Default to 'Absent'
                {
                  $concat: [
                    { $toString: '$$hours' },
                    ':',
                    { $cond: [{ $lt: ['$$minutes', 10] }, { $concat: ['0', { $toString: '$$minutes' }] }, { $toString: '$$minutes' }] },
                  ],
                },
              ],
            },
          },
        },
        attendance: {
          $switch: {
            branches: [
              {
                case: { $gte: ['$hoursTracked', 6 * 3600] }, // If hours tracked are 6 or more
                then: 'Present',
              },
              {
                case: { $gt: ['$hoursTracked', 0] }, // If hours tracked are greater than 0 but less than 5
                then: 'Half-Day',
              },
            ],
            default: 'Absent', // Set a default attendance status
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
            attendance: '$attendance',
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
                        $in: [{ $dayOfWeek: { $dateFromString: { dateString: '$$date.date' } } }, [1, 7]],
                      },
                      'WO', // Weekend
                      {
                        $cond: [{ $ifNull: ['$$activity', false] }, '$$activity.dailyHoursTracked', '-'],
                      },
                    ],
                  },
                  attendance: {
                    $cond: [
                      {
                        $in: [{ $dayOfWeek: { $dateFromString: { dateString: '$$date.date' } } }, [1, 7]],
                      },
                      'WO', // Weekend
                      {
                        $cond: [{ $ifNull: ['$$activity', false] }, '$$activity.attendance', 'Absent'],
                      },
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
      $unwind: { path: '$activities' },
    },
    {
      $lookup: {
        from: 'holidays',
        let: { day: '$activities.date' },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [{ $toDate: '$$day' }, '$date'],
              },
            },
          },
        ],
        as: 'holiday',
      },
    },
    {
      $addFields: {
        'activities.attendance': {
          $cond: [{ $gt: [{ $size: '$holiday' }, 0] }, 'Holiday', '$activities.attendance'],
        },
      },
    },
    {
      $group: {
        _id: '$_id',
        firstName: { $first: '$firstName' },
        lastName: { $first: '$lastName' },
        totalHoursTracked: { $first: '$totalHoursTracked' },
        activities: { $push: '$activities' },
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

  return pipeline;
};
