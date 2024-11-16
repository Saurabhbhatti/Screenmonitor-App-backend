import { ObjectId } from 'mongoose';

import constants from '../helpers/constants';

export default interface ICompoff {
  companyId: ObjectId;
  userId: ObjectId;
  actionBy?: ObjectId;
  compoffType: typeof constants.COMPOFF_TYPE.DAILY | typeof constants.COMPOFF_TYPE.MONTHLY;
  description?: string;
  workDate?: Date;
  totalHours?: number;
  trackedHours?: number;
  eligibleCompoff: typeof constants.COMPOFF_COUNT.FULL | typeof constants.COMPOFF_COUNT.HALF;
  comment?: string;
  status: typeof constants.COMPOFF_STATUS.PENDING | typeof constants.COMPOFF_STATUS.APPROVED | typeof constants.COMPOFF_STATUS.REJECTED;
}
