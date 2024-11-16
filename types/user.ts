import { ObjectId, Types } from 'mongoose';

import { MatchStage, LookupStage, UnwindStage, SortStage } from './common';
import { CompanyResponse } from './company';

export type User = {
  _id?: string;
  companyId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  status?: string;
  password?: string;
};

export type WelcomeEmailData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type FilterOptions = {
  companyId?: any;
  _id?: Types.ObjectId | { $ne: Types.ObjectId };
  role: string | { $ne: string };
  firstName?: { $regex: RegExp };
  status?: string;
  $or?: [
    {
      firstName?: { $regex: RegExp };
    },
    {
      lastName?: { $regex: RegExp };
    },
    {
      email?: { $regex: RegExp };
    },
    {
      phone?: { $regex: RegExp };
    },
    {
      empCode?: { $regex: RegExp };
    },
  ];
};

export type UserMatchStage = {
  role: string;
  status: string;
  _id?: string;
};

// Define the group stage type
export type UserGroupStage = {
  $group: {
    _id: {
      userId: string;
      firstName: string;
      lastName: string;
    };
    totalSeconds: {
      $sum: {
        $subtract: [string, string];
      };
    };
  };
};

// Define the project stage type
export type UserProjectStage = {
  $project: {
    _id: number;
    userId: string;
    firstName: string;
    lastName: string;
    totalSeconds: number;
  };
};

export type UserResponse = {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  designation?: string;
  email: string;
  phone: string;
  role: string;
  companyId?: ObjectId | null;
  isNewUser?: boolean;
  projects?: UserProjectResponse[];
};

export type UserProjectResponse = {
  projectName: string;
};

export type AddUserCompanyResponse = {
  user: UserResponse | null;
  company: CompanyResponse | null;
};

export type UserDataResponse = {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
};

// Define the overall pipeline type
export type UserActivityPipeline = [MatchStage, LookupStage, UnwindStage, MatchStage, UserGroupStage, UserProjectStage, SortStage];
