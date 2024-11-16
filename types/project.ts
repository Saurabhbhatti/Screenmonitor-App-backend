import { ObjectId, Schema, Types } from 'mongoose';
import { MatchStage, LookupStage, UnwindStage, GroupStage, ProjectStage, SortStage, SkipStage, LimitStage, FacetStage, CountStage } from './common';
import IUser from '../interfaces/user';

export type AddEditProjectResponse = {
  _id: Types.ObjectId;
  projectName: string;
  status: string;
  isScreenshot: boolean;
  notes?: string;
  companyId: ObjectId; 
  members: IUser[];
  createdAt: Date;
  updatedAt: Date;
  totalWorkingHours: string; 
};

export type ProjectData = {
  _id: Types.ObjectId;
  projectName: string;
  isScreenshot: boolean;
};

export type ProjectResponseData   = {
  projects: any[];
  totalProjects: number;
};

// Filter options for the getProjectQuery function
export type FilterOptions = {
  companyId?: Schema.Types.ObjectId;
  projectIds?: Schema.Types.ObjectId[];
  memberIds?: Schema.Types.ObjectId[];
};

// Match Stage for the pipeline
export type ProjectMatchStage = MatchStage & {
  $match: {
    _id?: { $in: Schema.Types.ObjectId[] };
    projectName?: { $regex: RegExp };
    status?: string;
  };
};

// Lookup Stage for timers
export type TimerLookupStage = LookupStage & {
  $lookup: {
    from: 'timers';
    localField: '_id';
    foreignField: 'projectId';
    as: 'timers';
  };
};

// Unwind Stage for timers
export type TimerUnwindStage = UnwindStage & {
  $unwind: {
    path: '$timers';
    preserveNullAndEmptyArrays: true;
  };
};

// Group Stage for total working hours
export type TotalWorkingHoursGroupStage = GroupStage & {
  $group: {
    _id: '$_id';
    totalWorkingHours: { $sum: { $subtract: ['$timers.endTime', '$timers.startTime'] } };
    status: { $first: '$status' };
    projectName: { $first: '$projectName' };
    isScreenshot: { $first: '$isScreenshot' };
    createdAt: { $first: '$createdAt' };
    notes: { $first: '$notes' };
    timerUserIds: { $addToSet: '$timers.userId' };
  };
};

// Lookup Stage for project details
export type ProjectDetailsLookupStage = LookupStage & {
  $lookup: {
    from: 'userprojects';
    localField: '_id';
    foreignField: 'projectIds';
    as: 'projectDetails';
  };
};

// Unwind Stage for project details
export type ProjectDetailsUnwindStage = UnwindStage & {
  $unwind: {
    path: '$projectDetails';
    preserveNullAndEmptyArrays: true;
  };
};

// Final Group Stage
export type FinalGroupStage = GroupStage & {
  $group: {
    _id: '$_id';
    totalWorkingHours: { $first: '$totalWorkingHours' };
    status: { $first: '$status' };
    projectName: { $first: '$projectName' };
    isScreenshot: { $first: '$isScreenshot' };
    createdAt: { $first: '$createdAt' };
    notes: { $first: '$notes' };
    timerUserIds: { $first: '$timerUserIds' };
    assignedUserIds: { $addToSet: '$projectDetails.userId' };
  };
};

// Project Stage to format the output
export type ProjectOutputStage = ProjectStage & {
  $project: {
    _id: 1;
    totalWorkingHours: 1;
    status: 1;
    projectName: 1;
    isScreenshot: 1;
    createdAt: 1;
    notes: 1;
    memberIds: { $setUnion: ['$timerUserIds', '$assignedUserIds'] };
  };
};

// Facet Stage for pagination
export type ProjectFacetStage = FacetStage & {
  $facet: {
    data: [SkipStage, LimitStage];
    totalCount: [CountStage, { $addFields: { totalCount: { $ifNull: ['$totalCount', 0] } } }];
  };
};

// Define the full pipeline type
export type GetProjectPipeline = [
  ProjectMatchStage,
  TimerLookupStage,
  TimerUnwindStage,
  TotalWorkingHoursGroupStage,
  ProjectDetailsLookupStage,
  ProjectDetailsUnwindStage,
  FinalGroupStage,
  ProjectOutputStage,
  SortStage,
  ProjectFacetStage
];