import AvailableLeave from "../models/AvailableLeave.js";
import Leave from "../models/Leave.js";
import User from "../models/User.js";
import { successResponse, errorResponse } from "../helpers/api-responses.js";
import { sendEmailforLeave } from "../helpers/utils.js";

const LEAVE_STATUS = {
  APPROVED: "Approved",
  REJECTED: "Rejected"
};

// send mail to admin for action like apply, approve and reject
const sendEmailToAdmin = async (leave, userEmail, action) => {
  try {
    const status = action === "apply" ? "Submitted" : action === "approve" ? LEAVE_STATUS.APPROVED : LEAVE_STATUS.REJECTED;
    const adminEmail = 'hr@yopmail.com';
    const subject = `Leave Application ${status}`;
    const message = `Leave application ${status.toLowerCase()}:
      ---------------------------------
      User ID: ${leave.userId}
      Start Date: ${leave.startDate}
      End Date: ${leave.endDate}
      Number of Days: ${leave.numberOfDays}
      Leave Type: ${leave.leaveType}
      Reason: ${leave.reason}
      User Email: ${userEmail}`;

    await sendEmailforLeave(adminEmail, userEmail, subject, message);
  } catch (error) {
    console.error('Error sending email to admin:', error);
    throw new Error('Failed to send email to admin');
  }
};

// add 3 leaves to all users 
const addLeavesToAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    
    for (const user of users) {
      await AvailableLeave.findOneAndUpdate(
        { userId: user._id },
        { $inc: { availableLeave: 3 } },
        { upsert: true } 
      );
    }

    return successResponse(res, 'Added 3 leave days to all users');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Leave functionality like apply, approve and reject and also get all leaves 
const applyApproveRejectLeaveOrGetLeaves = async (req, res) => {
  try {
    const { action, id } = req.params;
    const { name, offset = 1, limit = 10 } = req.query;
    const skip = (offset - 1) * limit;

    if (name) {
      const regex = new RegExp(`^${name}`, 'i');
      const user = await User.findOne({ first_name: { $regex: regex } });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      const totalLeavesCount = await Leave.countDocuments({ userId: user._id });
      const leaves = await Leave.find({ userId: user._id })
        .skip(skip)
        .limit(limit);

      return successResponse(res, 'Leaves fetched successfully', { leaves, totalLeavesCount });
    }

    if (!action && !id) {
      const totalLeavesCount = await Leave.countDocuments();
      const leaves = await Leave.find()
        .skip(skip)
        .limit(limit);

      return successResponse(res, 'Leaves fetched successfully', { leaves, totalLeavesCount });
    }

    // Apply for leave
    if (action === "apply") {
      const { userId, startDate, endDate, numberOfDays, leaveType, userEmail, reason } = req.body;

      if (!userId || !startDate || !endDate || !numberOfDays || !leaveType || !userEmail || !reason) {
        return errorResponse(res, 'Missing required parameters');
      }

      if (new Date(startDate) >= new Date(endDate)) {
        return errorResponse(res, 'End date must be after start date');
      }

      if (!Number.isInteger(numberOfDays) || numberOfDays <= 0) {
        return errorResponse(res, 'Number of days must be a positive integer');
      }

      let userLeave = await AvailableLeave.findOneAndUpdate(
        { userId },
        { $setOnInsert: { availableLeave: 0, leaves: [], dateOfApply: new Date() } }, // Include dateOfApply
        { new: true, upsert: true }
      );

      if (leaveType === 'Paid Leave' && userLeave.availableLeave < numberOfDays) {
        return errorResponse(res, 'No Paid Leave balance available');
      }

      const newLeave = new Leave({
        userId,
        startDate,
        endDate,
        numberOfDays,
        leaveType,
        reason,
        userEmail
      });
      await newLeave.save();

      if (leaveType === 'Paid Leave') {
        await AvailableLeave.updateOne(
          { userId },
          { $inc: { availableLeave: -numberOfDays } }
        );
      }

      await AvailableLeave.updateOne(
        { userId },
        { $push: { leaves: { leaveId: newLeave._id, leaveType, status: 'Pending' } } }
      );

      await sendEmailToAdmin(newLeave, userEmail, action);
      return successResponse(res, 'Leave applied successfully', newLeave);
    }

    // Approve or Reject leave
    if (["approve", "reject"].includes(action)) {
      if (!id) {
        return errorResponse(res, 'Leave ID is required for approval or rejection', 400);
      }

      const leave = await Leave.findById(id);

      if (!leave) {
        return errorResponse(res, 'Leave not found', 404);
      }

      const status = action === "approve" ? LEAVE_STATUS.APPROVED : LEAVE_STATUS.REJECTED;

      if (status === LEAVE_STATUS.REJECTED && leave.leaveType === 'Paid Leave') {
        await AvailableLeave.updateOne(
          { userId: leave.userId },
          { $inc: { availableLeave: leave.numberOfDays } }
        );
      }

      const updatedLeave = await Leave.findByIdAndUpdate(id, { $set: { status } }, { new: true });

      await AvailableLeave.updateOne(
        { userId: leave.userId, 'leaves.leaveId': id },
        { $set: { 'leaves.$.status': status } }
      );

      await sendEmailToAdmin(updatedLeave, leave.userEmail, action);

      return successResponse(res, `Leave ${status.toLowerCase()} successfully`, updatedLeave);
    }

    return errorResponse(res, "Invalid request", 400);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

export default { addLeavesToAllUsers, applyApproveRejectLeaveOrGetLeaves };
