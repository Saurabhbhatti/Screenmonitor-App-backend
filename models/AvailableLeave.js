import mongoose from 'mongoose';

// Define the schema for the AvailableLeave collection
const AvailableLeaveSchema = new mongoose.Schema({
  userId: {
    type: String, 
    ref: 'User', 
    unique: true 
  },
  availableLeave: {
    type: Number,
    default: 0
  },
  leaves: [{
    leaveId: {
      type: String, 
      ref: 'Leave'
    },
    leaveType: String, 
    dateOfApply: {
      type: Date,
      default: Date.now 
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending' 
    }
  }],
});

AvailableLeaveSchema.index({ userId: 1 });

const AvailableLeave = mongoose.model('AvailableLeave', AvailableLeaveSchema);

export default AvailableLeave;
