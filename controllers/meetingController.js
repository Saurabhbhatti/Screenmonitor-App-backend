import Meeting from "../models/Meeting.js";
import { successResponse, errorResponse } from "../helpers/api-responses.js";
import {
  calculateTimeDifference,
  formatDuration,
  getCurrentTime,
} from "../helpers/index.js";

// Start Meeting
const startMeeting = async (req, res) => {
  const { userId, projectId, timerId, description } = req.body;

  if (!userId || !projectId || !timerId || !description) {
    return errorResponse(
      res,
      "userId, projectId, timerId, and description are required",
      400
    );
  }

  const startTime = getCurrentTime();
  try {
    const meeting = new Meeting({
      userId,
      projectId,
      timerId,
      startTime,
      description,
    });
    await meeting.save();
    return successResponse(res, "Meeting started successfully", meeting);
  } catch (error) {
    return errorResponse(res, error);
  }
};

// End Meeting
const endMeeting = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return errorResponse(res, "Meeting ID is required", 400);
  }

  try {
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return errorResponse(res, "Meeting not found", 404);
    }

    const endTime = getCurrentTime();
    const timediff = calculateTimeDifference(meeting.startTime, endTime);
    meeting.endTime = endTime;
    meeting.totalTime = timediff;
    await meeting.save();

    return successResponse(res, "Meeting ended successfully", meeting);
  } catch (error) {
    return errorResponse(res, error);
  }
};

// Get Total Meeting Time
const getTotalMeetingTime = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return errorResponse(res, "User ID is required", 400);
  }

  try {
    const meetings = await Meeting.find({ userId });

    if (!meetings || meetings.length === 0) {
      return errorResponse(res, "No meetings found", 404);
    }

    let totalMeetingTimeMinutes = 0;
    const meetingDetails = meetings.map((meeting, index) => {
      const [hours, minutes, seconds] = meeting.totalTime
        .split(":")
        .map(Number);
      const totalMinutes = hours * 60 + minutes + seconds / 60;
      totalMeetingTimeMinutes += totalMinutes;
      const totalMinutesString = Math.floor(totalMinutes)
        .toString()
        .padStart(2, "0");
      const totalSecondsString = Math.round((totalMinutes % 1) * 60)
        .toString()
        .padStart(2, "0");
      return {
        [`meeting${index + 1}`]: `${totalMinutesString}:${totalSecondsString}`,
      };
    });

    const totalMeetingTime = formatDuration(totalMeetingTimeMinutes);

    return successResponse(res, "Total meeting time retrieved successfully", {
      totalMeetingTime,
      totalMeetings: meetings.length,
      meetingDetails,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};

export { startMeeting, endMeeting, getTotalMeetingTime };
