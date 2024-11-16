import { ObjectId } from 'mongoose';

interface IPersonalDetail {
  gender?: string;
  bloodGroup?: string;
  dateOfBirth?: Date;
  dateOfJoining?: Date;
  totalExperience?: number;
  currentAddress?: string;
  permanentAddress?: string;
  profilePic?: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  };
  skills?: string[];
}

export default interface IProfileDetail {
  companyId: ObjectId;
  userId: ObjectId;
  personalDetail?: IPersonalDetail;
  aadharCard?: {
    number: string;
    file: {
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    };
  };
  panCard?: {
    number: string;
    file: {
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    };
  };
  bankDetail?: {
    accountNumber: string;
    accountHolderName: string;
    bankName: string;
    branchName: string;
    ifscCode: string;
  };
  emergencyContact?: {
    name: string;
    relation: string;
    contactNumber: string;
  };
}
