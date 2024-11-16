import mongoose, { Schema } from 'mongoose';
import IProfileDetail from '../interfaces/profileDetail';

const ProfileDetailSchema: Schema<IProfileDetail> = new Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Company', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    personalDetail: {
      gender: { type: String },
      bloodGroup: { type: String },
      dateOfBirth: { type: Date },
      dateOfJoining: { type: Date },
      totalExperience: { type: Number },
      currentAddress: { type: String },
      permanentAddress: { type: String },
      profilePic: {
        fileName: { type: String },
        fileUrl: { type: String },
        fileType: { type: String },
        fileSize: { type: Number },
      },
      skills: { type: [String] },
    },
    aadharCard: {
      number: { type: String },
      file: {
        fileName: { type: String },
        fileUrl: { type: String },
        fileType: { type: String },
        fileSize: { type: Number },
      },
    },
    panCard: {
      number: { type: String },
      file: {
        fileName: { type: String },
        fileUrl: { type: String },
        fileType: { type: String },
        fileSize: { type: Number },
      },
    },
    bankDetail: {
      accountNumber: { type: String },
      accountHolderName: { type: String },
      bankName: { type: String },
      branchName: { type: String },
      ifscCode: { type: String },
    },
    emergencyContact: {
      name: { type: String },
      relation: { type: String },
      contactNumber: { type: String },
    },
  },
  { timestamps: true },
);

const ProfileDetail = mongoose.model<IProfileDetail>('ProfileDetail', ProfileDetailSchema);

export default ProfileDetail;
