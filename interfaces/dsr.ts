import { Schema } from 'mongoose';

export default interface IDSR {
  companyId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  description: string;
  createdAt?: Date; // Optional if not strictly necessary
  updatedAt?: Date; // Optional if not strictly necessary
}
