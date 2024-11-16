import { Types } from 'mongoose';
import { MatchStage, LookupStage, UnwindStage, SortStage, SkipStage, LimitStage } from './common';

export type FacetStage = {
  $facet: {
    [key: string]: any[];
  };
};

export type DailyWeeklyHourPipeline = [MatchStage, FacetStage];

export type TimerActivityFilterOptions = {
  startTime: { $gte: number; $lte: number };
  projectId?: { $in: Array<Types.ObjectId> };
  userId?: { $in: Array<Types.ObjectId> };
};

export type AddFieldsStage = {
  $addFields: {
    day: { $dateToString: { format: string; date: { $toDate: { $multiply: [string, number] } } } };
  };
};

export type GroupStage = {
  $group: {
    _id: { userId: string; day: string; type: string };
    firstName: { $first: string };
    lastName: { $first: string };
    hoursTracked: { $sum: { $subtract: [string, string] } };
  };
};

export type SecondGroupStage = {
  $group: {
    _id: { userId: string; day: string };
    firstName: { $first: string };
    lastName: { $first: string };
    hoursTracked: { $sum: string };
    types: {
      $push: {
        type: string;
        hoursTracked: string;
      };
    };
  };
};

export type AddFieldsWithLetStage = {
  $addFields: {
    dailyHoursTracked: {
      $let: {
        vars: {
          hours: { $floor: { $divide: [string, number] } };
          minutes: { $floor: { $divide: [{ $mod: [string, number] }, number] } };
        };
        in: {
          $concat: [
            { $toString: string },
            ':',
            { $cond: [{ $lt: [string, number] }, { $concat: [string, { $toString: string }] }, { $toString: string }] },
          ];
        };
      };
    };
    types: {
      $map: {
        input: string;
        as: string;
        in: {
          type: string;
          hoursTracked: {
            $let: {
              vars: {
                hours: { $floor: { $divide: [string, number] } };
                minutes: { $floor: { $divide: [{ $mod: [string, number] }, number] } };
              };
              in: {
                $concat: [
                  { $toString: string },
                  ':',
                  { $cond: [{ $lt: [string, number] }, { $concat: [string, { $toString: string }] }, { $toString: string }] },
                ];
              };
            };
          };
        };
      };
    };
  };
};

export type FinalGroupStage = {
  $group: {
    _id: string;
    firstName: { $first: string };
    lastName: { $first: string };
    totalHoursTracked: { $sum: string };
    activities: {
      $push: {
        date: string;
        dailyHoursTracked: string;
        types: string;
      };
    };
  };
};

export type AddFieldsFinalStage = {
  $addFields: {
    totalHoursTracked: {
      $let: {
        vars: {
          hours: { $floor: { $divide: [string, number] } };
          minutes: { $floor: { $divide: [{ $mod: [string, number] }, number] } };
        };
        in: {
          $concat: [
            { $toString: string },
            ':',
            { $cond: [{ $lt: [string, number] }, { $concat: [string, { $toString: string }] }, { $toString: string }] },
          ];
        };
      };
    };
    activities: {
      $sortArray: {
        input: string;
        sortBy: { date: number };
      };
    };
  };
};

export type ProjectStage = {
  $project: {
    _id: number;
    userId: string;
    firstName: number;
    lastName: number;
    totalHoursTracked: number;
    activities: number;
  };
};

export type TimerActivityPipeline = [
  MatchStage,
  LookupStage,
  UnwindStage,
  MatchStage,
  AddFieldsStage,
  GroupStage,
  SecondGroupStage,
  AddFieldsWithLetStage,
  FinalGroupStage,
  AddFieldsFinalStage,
  SortStage,
  SkipStage,
  LimitStage,
  ProjectStage,
];
