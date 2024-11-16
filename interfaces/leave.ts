import { ObjectId } from 'mongoose';

import constants from '../helpers/constants';

export default interface ILeave {
  companyId: ObjectId;
  userId: ObjectId;
  actionBy?: ObjectId;
  leaveType: typeof constants.LEAVE_TYPE.PAID | typeof constants.LEAVE_TYPE.UNPAID | typeof constants.LEAVE_TYPE.COMPOFF;
  applyDate: [
    {
      date: Date;
      period:
        | typeof constants.LEAVE_PERIOD.FULL_DAY
        | typeof constants.LEAVE_PERIOD.HALF_DAY
        | typeof constants.LEAVE_PERIOD.FIRST_HALF
        | typeof constants.LEAVE_PERIOD.SECOND_HALF;
      count: number;
    },
  ];
  totalDays: number;
  leaveReason: string;
  remarks?: string;
  comment?: string;
  status:
    | typeof constants.LEAVE_STATUS.PENDING
    | typeof constants.LEAVE_STATUS.APPROVED
    | typeof constants.LEAVE_STATUS.REJECTED
    | typeof constants.LEAVE_STATUS.CANCELLED;
  createdAt?: Date;
  updatedAt?: Date;
}
