import { Types } from 'mongoose';

export type TimeRequestFilterOptions = {
  userId?: Types.ObjectId;
  requestBy?: Types.ObjectId;
  actionBy?: Types.ObjectId;
  $or?: Array<{ [key: string]: Types.ObjectId }>;
  applyDate?: { $gte?: Date; $lte?: Date };
  status?: string;
};
