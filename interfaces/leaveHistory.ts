import { ObjectId } from 'mongoose';

export default interface ILeaveHistory {
  companyId: ObjectId;
  userId: ObjectId;
  leaveId?: ObjectId;
  compoffId?: ObjectId;
  description?: string;
  credited?: number;
  debited?: number;
  availablePL?: number;
  availableCompOff?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
