import { ObjectId } from 'mongoose';

export interface IUserProject {
  companyId: ObjectId;
  userId: ObjectId;
  projectIds: ObjectId[];
}
