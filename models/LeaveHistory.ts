import mongoose, { Schema } from 'mongoose';
import ILeaveHistory from '../interfaces/leaveHistory';

const LeaveHistorySchema: Schema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, ref: 'Company' },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    leaveId: { type: Schema.Types.ObjectId, ref: 'Leave' },
    compoffId: { type: Schema.Types.ObjectId, ref: 'Compoff' },
    description: { type: String },
    credited: { type: Number },
    debited: { type: Number },
    availablePL: { type: Number },
    availableCompOff: { type: Number },
  },
  {
    timestamps: true,
  },
);

const LeaveHistory =  mongoose.model<ILeaveHistory>('LeaveHistory', LeaveHistorySchema);

export default LeaveHistory;
