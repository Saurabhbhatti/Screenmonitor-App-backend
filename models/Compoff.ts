import mongoose, { Schema, Document } from 'mongoose';

import constants from '../helpers/constants';
import ICompoff from '../interfaces/compoff';

const CompoffSchema: Schema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, ref: 'Company' },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    actionBy: { type: Schema.Types.ObjectId, ref: 'User' },
    compoffType: {
      type: String,
      enum: Object.values(constants.COMPOFF_TYPE),
      required: true,
    },
    description: { type: String },
    workDate: { type: Date },
    totalHours: { type: Number },
    trackedHours: { type: Number },
    eligibleCompoff: {
      type: String,
      enum: Object.values(constants.COMPOFF_COUNT),
      required: true,
    },
    comment: { type: String },
    status: {
      type: String,
      enum: Object.values(constants.COMPOFF_STATUS),
      required: true,
    },
  },
  { timestamps: true },
);

const Compoff = mongoose.model<ICompoff & Document>('Compoff', CompoffSchema);

export default Compoff;
