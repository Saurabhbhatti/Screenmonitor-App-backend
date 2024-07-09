import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  projectId: { type: String, required: true },
  timerId: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String },
  totalTime: { type: String },
  description: { type: String },
});

const Meeting = mongoose.model('Meeting', meetingSchema);

export default Meeting;