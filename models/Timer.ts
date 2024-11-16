import mongoose, { Schema } from 'mongoose';

import ITimer from '../interfaces/timer';
import constants from '../helpers/constants';

// Define the schema for the Timer collection
const TimerSchema: Schema<ITimer> = new Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Company' },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    description: { type: String, required: false },
    startTime: { type: Number, required: [true, 'startTime is required'] },
    endTime: { type: Number, required: false },
    type: {
      type: String,
      enum: [
        constants.TIMER_TYPE.WORK,
        constants.TIMER_TYPE.MEETING,
        constants.TIMER_TYPE.ACTIVITY,
        constants.TIMER_TYPE.BREAK,
        constants.TIMER_TYPE.MANUAL,
      ],
      required: true,
      default: constants.TIMER_TYPE.WORK,
    },
    isAutoCheckout: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Timer = mongoose.model<ITimer>('Timer', TimerSchema);

export default Timer;
