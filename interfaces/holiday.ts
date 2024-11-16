import { ObjectId } from 'mongoose';

export default interface IHoliday {
  companyId: ObjectId;
  date: Date;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}
