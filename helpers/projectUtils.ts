import { PipelineStage, Types } from 'mongoose';
import { Project, Timer } from '../models';
import { getProjectQuery } from '../query/project';
import { ProjectResponseData  } from '../types/project';
import { FilterOptions } from '../types/project';


export const getProjectData = async (
  search: string,
  status: string | undefined,
  limit: number,
  offset: number,
  filterOptions: FilterOptions = {}
): Promise<ProjectResponseData> => {
  try {
    const pipeline: PipelineStage[] = getProjectQuery(search, status, limit, offset,filterOptions);

    const result = await Project.aggregate(pipeline);

    // Extract results safely
    const projects = result?.[0]?.data || [];
    const totalProjects = result?.[0]?.totalCount?.[0]?.totalCount || 0;

    return { projects, totalProjects };
  } catch (error) {
    console.error('Error fetching project data:', error);
    return { projects: [], totalProjects: 0 };
  }
};


export const calculateTotalWorkingHours = async (projectId: Types.ObjectId): Promise<string> => {
  const pipeline = [
    {
      $match: {
        projectId: projectId,
      },
    },
    {
      $group: {
        _id: null,
        totalWorkingHours: { $sum: { $subtract: ['$endTime', '$startTime'] } },
      },
    },
    {
      $project: {
        _id: 0,
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
        }
      }
    }
  ];

  const result = await Timer.aggregate(pipeline);
  const [time] = result;

  return time?.totalWorkingHours || '00:00';
};
