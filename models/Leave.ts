import mongoose, { Schema } from 'mongoose';
import ILeave from '../interfaces/leave';
import constants from '../helpers/constants';

const LeaveSchema = new Schema<ILeave>(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, ref: 'Company' },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    actionBy: { type: Schema.Types.ObjectId, required: false, ref: 'User' },
    leaveType: {
      type: String,
      enum: Object.values(constants.LEAVE_TYPE),
      required: true,
    },
    applyDate: [
      {
        date: { type: Date, required: true },
        period: {
          type: String,
          enum: Object.values(constants.LEAVE_PERIOD),
          required: true,
        },
        count: { type: Number, required: true },
      },
    ],
    totalDays: { type: Number, required: true },
    leaveReason: { type: String, required: true },
    remarks: { type: String },
    comment: { type: String },
    status: {
      type: String,
      enum: Object.values(constants.LEAVE_STATUS),
      required: true,
      default: constants.LEAVE_STATUS.PENDING,
    },
  },
  { timestamps: true },
);

const Leave = mongoose.model<ILeave>('Leave', LeaveSchema);

export default Leave;
