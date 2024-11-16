import { Types } from 'mongoose';

export type LeaveFilterOptions = {
  userId?: Types.ObjectId | { $ne: Types.ObjectId } | { $in: Types.ObjectId[] };
  companyId?: Types.ObjectId;
  'applyDate.date'?: {
    $gte?: Date;
    $lte?: Date;
  };
  status?: string;
  [key: string]: any;
};
