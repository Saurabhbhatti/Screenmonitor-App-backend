import { ObjectId } from 'mongoose';

export default interface ICompany {
  userId: ObjectId;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress?: string;
  companyWebsite?: string;
  status: string;
}
