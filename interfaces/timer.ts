import { ObjectId } from 'mongoose';

import constants from '../helpers/constants';

export default interface ITimer {
  companyId: ObjectId;
  userId: ObjectId;
  projectId: ObjectId;
  description: string;
  startTime: number;
  endTime: number;
  type:
    | typeof constants.TIMER_TYPE.WORK
    | typeof constants.TIMER_TYPE.MEETING
    | typeof constants.TIMER_TYPE.ACTIVITY
    | typeof constants.TIMER_TYPE.BREAK
    | typeof constants.TIMER_TYPE.MANUAL;
  isAutoCheckout: boolean;
}
