import mongoose from 'mongoose';

// Define the schema for the Timer collection
const TimerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    description: { type: String, required: false },
    startTime: { type: Number, required: [true, 'startTime is required'] },
    endTime: { type: Number, required: false },
    type: { type: String, enum: ['work', 'meeting', 'activity'], required: true, default: 'work' },
    isAutoCheckout: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Timer = mongoose.model('Timer', TimerSchema);

export default Timer;
