import mongoose from 'mongoose';

// Define the schema for the Leave collection
const LeaveSchema = new mongoose.Schema(
  {
    userId: {
      type: String, 
      ref: 'User', 
      required: true, 
    },
    startDate: { type: Date, required: true }, 
    endDate: { type: Date, required: true }, 
    numberOfDays: { type: Number, required: true }, 
    leaveType: {
      type: String, 
      required: true, 
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending", 
    },
    reason: { type: String }, 
  },
  { timestamps: true } 
);

const Leave = mongoose.model('Leave', LeaveSchema);

export default Leave;
