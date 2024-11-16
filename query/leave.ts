import { PipelineStage } from 'mongoose';
import { LeaveFilterOptions } from '../types';
import constants from '../helpers/constants';

export const getLeaveQuery = (
  filterCriteria: LeaveFilterOptions,
  limit: number,
  offset: number,
  userRole: string,
  isSelf: boolean,
): PipelineStage[] => {
  const pipeline: PipelineStage[] = [
    { $match: filterCriteria },
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
  ];

  // Add role-based filtering for HR and PM
  if ((userRole === constants.ROLE.HR || userRole === constants.ROLE.PROJECT_MANAGER) && !isSelf) {
    pipeline.push({
      $match: {
        'user.role': constants.ROLE.EMPLOYEE,
      },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'actionBy',
        foreignField: '_id',
        as: 'actionBy',
      },
    },
    {
      $unwind: { path: '$actionBy', preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        _id: 1,
        companyId: 1,
        userId: {
          _id: '$user._id',
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          empCode: '$user.empCode',
        },
        actionBy: {
          _id: '$actionBy._id',
          firstName: '$actionBy.firstName',
          lastName: '$actionBy.lastName',
          empCode: '$actionBy.empCode',
        },
        leaveType: 1,
        applyDate: 1,
        totalDays: 1,
        leaveReason: 1,
        remarks: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
    { $sort: { createdAt: -1 } },
    { $skip: (offset - 1) * limit },
    { $limit: limit },
  );

  return pipeline;
};

export const getLeaveHistoryQuery = (
  filterCriteria: LeaveFilterOptions,
  limit: number,
  offset: number,
  userRole: string,
  isSelf: boolean,
): PipelineStage[] => {
  const pipeline: PipelineStage[] = [
    { $match: filterCriteria },
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
  ];

  // Add role-based filtering for HR and PM
  if ((userRole === constants.ROLE.HR || userRole === constants.ROLE.PROJECT_MANAGER) && !isSelf) {
    pipeline.push({
      $match: {
        'user.role': constants.ROLE.EMPLOYEE,
      },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'leaves',
        localField: 'leavId',
        foreignField: '_id',
        as: 'leave',
      },
    },
    {
      $unwind: { path: '$leave', preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        _id: 1,
        companyId: 1,
        user: {
          _id: '$user._id',
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          empCode: '$user.empCode',
        },
        leave: {
          _id: '$leave._id',
          leaveType: '$leave.leaveType',
          applyDate: '$leave.applyDate',
          totalDays: '$leave.totalDays',
          leaveReason: '$leave.leaveReason',
          remarks: '$leave.remarks',
          status: '$leave.status',
        },
        description: 1,
        credited: 1,
        debited: 1,
        availablePL: 1,
        availableCompOff: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
    { $sort: { createdAt: -1 } },
    { $skip: (offset - 1) * limit },
    { $limit: limit },
  );

  return pipeline;
};

export const getLeaveExportDataQuery = (): PipelineStage[] => {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        status: 'approved',
        leaveType: {
          $in: ['PL', 'UPL'],
        },
      },
    },
    {
      $addFields: {
        monthName: {
          $dateToString: {
            format: '%B',
            date: '$createdAt',
          },
        },
        leaveYear: {
          $year: '$createdAt',
        },
        quarter: {
          $switch: {
            branches: [
              {
                case: {
                  $lte: [
                    {
                      $month: '$createdAt',
                    },
                    3,
                  ],
                },
                then: 'Q1',
              },
              {
                case: {
                  $lte: [
                    {
                      $month: '$createdAt',
                    },
                    6,
                  ],
                },
                then: 'Q2',
              },
              {
                case: {
                  $lte: [
                    {
                      $month: '$createdAt',
                    },
                    9,
                  ],
                },
                then: 'Q3',
              },
              {
                case: {
                  $gte: [
                    {
                      $month: '$createdAt',
                    },
                    10,
                  ],
                },
                then: 'Q4',
              },
            ],
            default: 'Unknown',
          },
        },
      },
    },
    {
      $group: {
        _id: {
          userId: '$userId',
          leaveYear: '$leaveYear',
          monthName: '$monthName',
          quarter: '$quarter',
        },
        totalPaidLeave: {
          $sum: {
            $cond: [
              {
                $eq: ['$leaveType', 'PL'],
              },
              '$totalDays',
              0,
            ],
          },
        },
        totalUnpaidLeave: {
          $sum: {
            $cond: [
              {
                $eq: ['$leaveType', 'UPL'],
              },
              '$totalDays',
              0,
            ],
          },
        },
      },
    },
    {
      $group: {
        _id: {
          userId: '$_id.userId',
          leaveYear: '$_id.leaveYear',
          quarter: '$_id.quarter',
        },
        months: {
          $push: {
            month: '$_id.monthName',
            totalPaidLeave: '$totalPaidLeave',
            totalUnpaidLeave: '$totalUnpaidLeave',
            totalLeaveCount: {
              $add: ['$totalPaidLeave', '$totalUnpaidLeave'],
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id.userId',
        foreignField: '_id',
        as: 'userInfo',
      },
    },
    {
      $unwind: {
        path: '$userInfo',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        allQuarters: [
          {
            quarter: 'Q1',
            months: ['January', 'February', 'March'],
          },
          {
            quarter: 'Q2',
            months: ['April', 'May', 'June'],
          },
          {
            quarter: 'Q3',
            months: ['July', 'August', 'September'],
          },
          {
            quarter: 'Q4',
            months: ['October', 'November', 'December'],
          },
        ],
      },
    },
    {
      $project: {
        userId: '$_id.userId',
        userName: {
          $concat: ['$userInfo.firstName', ' ', '$userInfo.lastName'],
        },
        quarterlyData: {
          $map: {
            input: '$allQuarters',
            as: 'quarterData',
            in: {
              quarter: {
                $concat: [
                  '$$quarterData.quarter',
                  ' (',
                  {
                    $arrayElemAt: ['$$quarterData.months', 0],
                  },
                  ' - ',
                  {
                    $arrayElemAt: ['$$quarterData.months', -1],
                  },
                  ' - ',
                  {
                    $toString: '$_id.leaveYear',
                  },
                  ')',
                ],
              },
              months: {
                $map: {
                  input: '$$quarterData.months',
                  as: 'month',
                  in: {
                    month: '$$month',
                    totalPaidLeave: {
                      $ifNull: [
                        {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: {
                                  $filter: {
                                    input: '$months',
                                    cond: {
                                      $eq: ['$$quarterData.quarter', '$_id.quarter'],
                                    },
                                  },
                                },
                                cond: {
                                  $eq: ['$$month', '$$this.month'],
                                },
                              },
                            },
                            0,
                          ],
                        },
                        {
                          totalPaidLeave: '-',
                          totalUnpaidLeave: '-',
                          totalLeaveCount: '-',
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
    },
    {
      $project: {
        _id: 0,
        userId: 1,
        userName: 1,
        quarterlyData: {
          $map: {
            input: '$quarterlyData',
            as: 'data',
            in: {
              quarter: '$$data.quarter',
              months: {
                $map: {
                  input: '$$data.months',
                  as: 'monthData',
                  in: {
                    month: '$$monthData.month',
                    totalPaidLeave: {
                      $ifNull: ['$$monthData.totalPaidLeave.totalPaidLeave', '-'],
                    },
                    totalUnpaidLeave: {
                      $ifNull: ['$$monthData.totalPaidLeave.totalUnpaidLeave', '-'],
                    },
                    totalLeaveCount: {
                      $ifNull: ['$$monthData.totalPaidLeave.totalLeaveCount', '-'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  ];
  return pipeline;
};
