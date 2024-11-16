import { Schema } from 'mongoose';

export default interface IOnlineUser {
  companyId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  checkinId: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
