import { ObjectId } from 'mongoose';

export type CompanyResponse = {
  userId: ObjectId;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress?: string;
  companyWebsite?: string;
};

export type FilterCompanyOptions = {
  $or?: Array<{
    companyName?: { $regex: RegExp };
    companyEmail?: { $regex: RegExp };
    companyPhone?: { $regex: RegExp };
    companyWebsite?: { $regex: RegExp };
  }>;
};
