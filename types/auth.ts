import { ObjectId } from "mongoose";

export type LoginResponse = {
  _id: string;
  companyId?: ObjectId;
  companyName: string;
  firstName: string;
  lastName: string;
  designation: string;
  email: string;
  phone: string;
  status: string;
  role: string;
  isNewUser: boolean;
  token: string;
  dailyTotalWorkingHour: string;
  weeklyTotalWorkingHour: string;
  requiresPasswordReset?: boolean;
  empCode: string;
};
