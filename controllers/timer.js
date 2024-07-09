import Timer from '../models/Timer.js';
import { errorResponse, successResponse, validationError } from '../helpers/api-responses.js';
import { getCurrentTime } from '../helpers/utils.js';
import { userAggregatedHoursForLogin } from '../helpers/userUtils.js';
import { getUserId } from '../helpers/utils.js';
import User from '../models/User.js';

// Check In
const checkIn = async (req, res) => {
  try {
    const { projectId, description, type } = req.body;

    const userId = await getUserId(req);
    const isUser = await User.findById(userId);
    if (!isUser) {
      return validationError(res, "User not found");
    }

    // Check if userId and type are provided - mandatory fields
    if (!userId || !type) {
      return validationError(res, 'userId and type are required');
    }

    // Check if the type is valid
    if (!['work', 'meeting', 'activity'].includes(type)) {
      return validationError(res, 'Invalid type, should be work, meeting or activity');
    }

    const startTime = getCurrentTime();

    // Create new timer instance and save to database
    const timer = new Timer({
      userId,
      projectId,
      description,
      startTime,
      type,
    });

    await timer.save();

    // Fetch aggregated daily and weekly hours for the user
    const { dailyWorkHours, weeklyHours } = await userAggregatedHoursForLogin(userId);

    // Prepare response with timer details and aggregated hours
    const response = {
      _id: timer._id,
      userId: timer.userId,
      projectId: timer.projectId,
      description: timer.description,
      startTime: timer.startTime,
      endTime: timer.endTime,
      type: timer.type,
      dailyTotalWorkingHour: dailyWorkHours,
      weeklyTotalWorkingHour: weeklyHours,
    };

    return successResponse(res, 'Time added successfully', response);
  } catch (err) {
    console.error('Error in checkIn:', err);
    return errorResponse(res, err.message);
  }
};

// Check Out
const checkOut = async (req, res) => {
  try {
    const { id, isAutoCheckout } = req.body;

    const userId = await getUserId(req);
    const isUser = await User.findById(userId);
    if (!isUser) {
      return validationError(res, "User not found");
    }

    const timer = await Timer.findById(id);

    // Check if timer exists
    if (!timer) {
      return errorResponse(res, 'Timer not found');
    }

    // Set end time and calculate total time duration
    const endTime = getCurrentTime();
    const timeDiff = endTime - timer.startTime;

    timer.endTime = endTime;
    timer.totalTime = timeDiff;
    timer.isAutoCheckout = isAutoCheckout;

    await timer.save();

    // Fetch aggregated daily and weekly hours for the user
    const { dailyWorkHours, weeklyHours } = await userAggregatedHoursForLogin(timer.userId);

    // Prepare response with updated timer details and aggregated hours
    const response = {
      _id: timer._id,
      userId: timer.userId,
      projectId: timer.projectId,
      description: timer.description,
      startTime: timer.startTime,
      endTime: timer.endTime,
      type: timer.type,
      isAutoCheckout: timer.isAutoCheckout,
      dailyTotalWorkingHour: dailyWorkHours,
      weeklyTotalWorkingHour: weeklyHours,
    };

    return successResponse(res, 'End time updated successfully', response);
  } catch (err) {
    console.error('Error in checkOut:', err);
    return errorResponse(res, err.message);
  }
};

// Daily Working Hours
const dailyWorkingHours = async (req, res) => {
  try {
    const loginUserId = await getUserId(req);
    const isUser = await User.findById(loginUserId);
    if (!isUser) {
      return validationError(res, "User not found");
    }

    const { startTime, endTime, userId } = req.body;

    // Fetch aggregated daily and weekly hours for the user
    const { dailyWorkHours, weeklyHours } = await userAggregatedHoursForLogin(userId, startTime, endTime);

    // Prepare response with daily and weekly hours
    const response = {
      dailyTotalWorkingHour: dailyWorkHours,
      weeklyTotalWorkingHour: weeklyHours,
    };

    return successResponse(res, 'Daily working hours retrieved successfully', response);
  } catch (err) {
    console.error('Error in dailyWorkingHours:', err);
    return errorResponse(res, err.message);
  }
};

export default { checkIn, checkOut, dailyWorkingHours };
