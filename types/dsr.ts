import { ObjectId } from 'mongoose';
import { MatchStage, LookupStage, UnwindStage, ProjectStage, GroupStage } from './common';
import constants from '../helpers/constants';

export type DsrAggregateResult = {
  projectName: string;
  descriptions: string[];
};

export type DsrGroupStage = {
  $group: {
    _id: string;
    projectName: { $first: string };
    descriptions: { $push: string };
  };
};

export type DsrProjectStage = {
  $project: {
    _id: number;
    projectName: number;
    descriptions: number;
  };
};

export type DsrAggregatePipeline = [MatchStage, LookupStage, UnwindStage, DsrGroupStage, DsrProjectStage];

export type Timers = {
  startTime: number;
  endTime?: number;
};

export type DailyHoursMap = { [date: string]: number };

export type AllDatesMap = { [date: string]: string };

export type Users = {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  designation: string;
  email: string;
  empCode: string;
};

export type DateRangeQuery = {
  startDate?: string;
  endDate?: string;
  format?: typeof constants.FILE_FORMATS.EXCEL | typeof constants.FILE_FORMATS.PDF;
  isFile?: string;
  memberId?: string;
};

export type TimesheetData = {
  data: TimesheetEntry[];
  totalHoursSum: number;
  totalDays: number;
};

export type DsrEntry = {
  createdAt?: Date;
  description: string;
  userId: ObjectId;
};

export type TimesheetEntry = {
  dsr: any;
  dailyHoursTracked: string;
  date: string; // YYYY-MM-DD
  day: string; // Full name of the day (e.g., "Monday")
  dsrTask: string; // Task description from DSR
  totalHours: number | string; // Total hours as a string (e.g., "8.00")
  leave: string; // Leave status (e.g., "-")
};

// Type for the EJS view data
export type TimesheetViewData = {
  data: TimesheetEntry[];
  user: Users;
  totalHoursSum: number; // Total hours sum
  totalDays: number; // Total number of days
  startDate: string; // Added startDate
  endDate: string; // Added endDate
};

export type GetDsrForUserPipeline = [MatchStage, LookupStage, UnwindStage, DsrGroupStage, DsrProjectStage];

export type GetDsrWithFiltersPipeline = [
  MatchStage,
  ProjectStage,
  GroupStage,
  LookupStage,
  UnwindStage,
  ProjectStage,
  GroupStage,
  ProjectStage,
  {
    $sort: { [key: string]: 1 | -1 };
  },
];
