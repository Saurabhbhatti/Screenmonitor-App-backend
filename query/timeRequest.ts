import { PipelineStage } from 'mongoose';

export const getTimeRequestQuery = (filterCriteria: any, limit: number, offset: number): PipelineStage[] => {
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
      $lookup: {
        from: 'users',
        localField: 'requestBy',
        foreignField: '_id',
        as: 'requestBy',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'actionBy',
        foreignField: '_id',
        as: 'actionBy',
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
      $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
    },
    {
      $unwind: { path: '$requestBy', preserveNullAndEmptyArrays: true },
    },
    {
      $unwind: { path: '$actionBy', preserveNullAndEmptyArrays: true },
    },
    {
      $unwind: { path: '$project', preserveNullAndEmptyArrays: true },
    },
    {
      $addFields: {
        timeSlot: {
          $concat: [
            {
              $dateToString: {
                format: '%H:%M',
                date: { $toDate: { $multiply: ['$startTime', 1000] } },
                timezone: '+05:30',
              },
            },
            ' to ',
            {
              $dateToString: {
                format: '%H:%M',
                date: { $toDate: { $multiply: ['$endTime', 1000] } },
                timezone: '+05:30',
              },
            },
          ],
        },
      },
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
        requestBy: {
          _id: '$requestBy._id',
          firstName: '$requestBy.firstName',
          lastName: '$requestBy.lastName',
          empCode: '$requestBy.empCode',
        },
        actionBy: {
          _id: '$actionBy._id',
          firstName: '$actionBy.firstName',
          lastName: '$actionBy.lastName',
          empCode: '$actionBy.empCode',
        },
        projectId: {
          _id: '$project._id',
          projectName: '$project.projectName',
        },
        description: 1,
        applyDate: 1,
        startTime: 1,
        endTime: 1,
        timeSlot: 1,
        status: 1,
        reason: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
    { $skip: (offset - 1) * limit },
    { $limit: limit },
    { $sort: { createdAt: -1 } },
  ];

  return pipeline;
};
