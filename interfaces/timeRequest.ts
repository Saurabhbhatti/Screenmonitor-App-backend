import { ObjectId } from 'mongoose';

import constants from '../helpers/constants';

export default interface ITimerRequest {
  companyId: ObjectId;
  userId: ObjectId;
  requestBy?: ObjectId;
  actionBy?: ObjectId;
  projectId?: ObjectId;
  applyDate: Date;
  startTime: number;
  endTime: number;
  description?: string;
  comment?: string;
  reason?: string;
  status:
    | typeof constants.TIME_REQUEST_STATUS.PENDING
    | typeof constants.TIME_REQUEST_STATUS.APPROVED
    | typeof constants.TIME_REQUEST_STATUS.REJECTED
    | typeof constants.TIME_REQUEST_STATUS.CANCELLED;
  createdAt?: Date;
  updatedAt?: Date;
}
