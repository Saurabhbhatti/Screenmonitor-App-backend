import { PipelineStage } from 'mongoose';

import { FilterOptions} from '../types';


export const getUsersWithProjectsQuery = (
  filter: FilterOptions,
  limit: number,
  offset: number
): PipelineStage[] => {
  return [
    { $match: filter },
    {
      $lookup: {
        from: 'userprojects',
        localField: '_id',
        foreignField: 'userId',
        as: 'userProject'
      }
    },
    { $unwind: { path: '$userProject', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'projects',
        localField: 'userProject.projectIds',
        foreignField: '_id',
        as: 'projects'
      }
    },
    {
      $project: {
        _id: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        designation:1,
        phone:1,
        status: 1,
        isNewUser:1,
        empCode: 1,
        role: 1,
        createdAt: 1,
        projects: {
          $map: {
            input: '$projects',
            as: 'project',
            in: {
              _id: '$$project._id',
              projectName: '$$project.projectName'
            }
          }
        }
      }
    },
    { $sort: { createdAt: -1 } },
    { $skip: (offset - 1) * limit },
    { $limit: limit }
  ];
};
