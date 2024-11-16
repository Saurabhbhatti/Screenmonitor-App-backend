import { PipelineStage, Types } from 'mongoose';
import { FilterOptions } from '../types/project';
import { MatchStage } from '../types';

export const getProjectQuery = (
  search: string,
  status: string | undefined,
  limit: number,
  offset: number,
  filterOptions: FilterOptions = {}
): PipelineStage[] => {
  const { projectIds, memberIds, companyId } = filterOptions;

  const matchStage: MatchStage = {
    $match: { companyId },
  };

  if (projectIds?.length) {
    matchStage.$match._id = { $in: projectIds.map(id => new Types.ObjectId(id.toString())) };
  }
  if (search) {
    matchStage.$match.projectName = { $regex: new RegExp(search, 'i') };
  }
  if (status) {
    matchStage.$match.status = status;
  }

  const pipeline: PipelineStage[] = [
    matchStage,
    {
      $lookup: {
        from: 'timers',
        localField: '_id',
        foreignField: 'projectId',
        as: 'timers',
      },
    },
    {
      $unwind: {
        path: '$timers',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: '$_id',
        totalWorkingHours: { $sum: { $subtract: ['$timers.endTime', '$timers.startTime'] } },
        status: { $first: '$status' },
        projectName: { $first: '$projectName' },
        isScreenshot: { $first: '$isScreenshot' },
        createdAt: { $first: '$createdAt' },
        notes: { $first: '$notes' },
        timerUserIds: { $addToSet: '$timers.userId' },
      },
    },
    {
      $lookup: {
        from: 'userprojects',
        localField: '_id',
        foreignField: 'projectIds',
        as: 'projectDetails',
      },
    },
    {
      $unwind: {
        path: '$projectDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: '$_id',
        totalWorkingHours: { $first: '$totalWorkingHours' },
        status: { $first: '$status' },
        projectName: { $first: '$projectName' },
        isScreenshot: { $first: '$isScreenshot' },
        createdAt: { $first: '$createdAt' },
        notes: { $first: '$notes' },
        timerUserIds: { $first: '$timerUserIds' },
        assignedUserIds: { $addToSet: '$projectDetails.userId' },
      },
    },
    {
      $project: {
        _id: 1,
        status: 1,
        projectName: 1,
        isScreenshot: 1,
        createdAt: 1,
        notes: 1,
        memberIds: '$assignedUserIds',
        totalWorkingHours: {
          $let: {
            vars: {
              hours: { $floor: { $divide: ['$totalWorkingHours', 3600] } },
              minutes: { $floor: { $divide: [{ $mod: ['$totalWorkingHours', 3600] }, 60] } },
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
    ...(memberIds?.length
      ? [
          {
            $match: {
              memberIds: { $in: memberIds.map(id => new Types.ObjectId(id.toString())) },
            },
          },
        ]
      : []),
    {
      $lookup: {
        from: 'users',
        localField: 'memberIds',
        foreignField: '_id',
        as: 'members',
        pipeline: [
          {
            $project: {
              _id: 1,
              email: 1,
              firstName: 1,
              lastName: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$members',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: '$_id',
        totalWorkingHours: { $first: '$totalWorkingHours' },
        status: { $first: '$status' },
        projectName: { $first: '$projectName' },
        isScreenshot: { $first: '$isScreenshot' },
        createdAt: { $first: '$createdAt' },
        notes: { $first: '$notes' },
        members: { $push: '$members' },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $facet: {
        data: [{ $skip: (offset - 1) * limit }, { $limit: limit }],
        totalCount: [
          { $count: 'totalCount' },
          {
            $addFields: {
              totalCount: { $ifNull: ['$totalCount', 0] },
            },
          },
        ],
      },
    },
  ];
  return pipeline;
};
