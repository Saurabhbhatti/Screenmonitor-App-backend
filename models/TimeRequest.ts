import mongoose, { Schema } from 'mongoose';

import ITimeRequest from '../interfaces/timeRequest';
import constants from '../helpers/constants';

const TimeRequestSchema: Schema<ITimeRequest> = new Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Company' },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    requestBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    actionBy: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    description: { type: String, required: false },
    applyDate: { type: Date, required: [true, 'applyDate is required'] },
    startTime: { type: Number, required: [true, 'startTime is required'] },
    endTime: { type: Number, required: [true, 'endTime is required'] },
    comment: { type: String, required: false },
    reason: { type: String, required: false },
    status: {
      type: String,
      enum: [
        constants.TIME_REQUEST_STATUS.PENDING,
        constants.TIME_REQUEST_STATUS.APPROVED,
        constants.TIME_REQUEST_STATUS.REJECTED,
        constants.TIME_REQUEST_STATUS.CANCELLED,
      ],
      required: true,
      default: constants.TIME_REQUEST_STATUS.PENDING,
    },
  },
  { timestamps: true },
);

const TimeRequest = mongoose.model<ITimeRequest>('TimeRequest', TimeRequestSchema);

export default TimeRequest;
