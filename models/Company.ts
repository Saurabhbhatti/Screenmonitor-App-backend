import mongoose, { Schema } from 'mongoose';

import ICompany from '../interfaces/company';
import constants from '../helpers/constants';

// Define the schema for the Company collection
const companySchema: Schema<ICompany> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    companyName: { type: String, required: [true, 'Company name is required'] },
    companyEmail: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: [true, 'Company email is required'],
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid company email address'],
    },
    companyPhone: { type: String, required: [true, 'Company phone is required'], unique: true },
    companyAddress: { type: String, required: false },
    companyWebsite: { type: String, required: false },
    status: {
      type: String,
      enum: [constants.STATUS.ACTIVE, constants.STATUS.INACTIVE],
      default: constants.STATUS.ACTIVE,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Create the Company model
const Company = mongoose.model<ICompany>('Company', companySchema);

export default Company;
