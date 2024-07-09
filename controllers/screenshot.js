import Screenshot from "../models/Screenshot.js";
import {
  errorResponse,
  successResponse,
  validationError,
} from "../helpers/api-responses.js";
import { uploadToCloudinary, convertToIST } from "../helpers/utils.js";
import moment from "moment";
import User from "../models/User.js";
import { getUserId } from "../helpers/utils.js";
import mongoose from "mongoose";

// Upload Screenshot
const uploadScreenshot = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const isUser = await User.findById(userId);
    if (!isUser) {
      return validationError(res, "User not found");
    }

    const image = req.files?.screenshot;

    if (!image) {
      return validationError(res, "No file uploaded");
    }

    if (image.size > 5 * 1024 * 1024) {
      return validationError(res, "File size exceeds 5MB limit");
    }

    if (!image.mimetype.startsWith("image/")) {
      return validationError(res, "Invalid file type. Only images are allowed");
    }

    const uploadSingleScreenShot = image ? await uploadToCloudinary(image) : null;

    const extension = image.name.split(".").pop();
    const userIdLastThree = userId.slice(-3);
    const projectIdLastThree = req.body.projectId.slice(-3);
    const dateTime = convertToIST(new Date(), 'YYYYMMDD_HHmmss');
    const newFileName = `uid_${userIdLastThree}_pro_id_${projectIdLastThree}_${dateTime}.${extension}`;

    const newScreenshot = new Screenshot({
      userId: userId,
      projectId: req.body.projectId,
      screenshot: {
        fileName: newFileName,
        fileType: image.mimetype,
        fileUrl: uploadSingleScreenShot.secure_url,
      },
    });

    await newScreenshot.save();

    return successResponse(res, "Screenshot uploaded successfully", {
      image: newScreenshot.screenshot,
      uploadScreenshotDate: convertToIST(newScreenshot.uploadScreenshotDate),
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Failed to upload screenshot");
  }
};

// Get Hourly Screenshots
const getHourlyScreenshots = async (req, res) => {
  try {
    const loginUserId = await getUserId(req);
    const isUser = await User.findById(loginUserId);
    if (!isUser) {
      return validationError(res, "User not found");
    }

    const { date, projectId } = req.query;
    const { userId } = req.body;

    const screenshotQuery = { userId: new mongoose.Types.ObjectId(userId) };

    if (date) {
      const searchDate = moment.tz(date, 'Asia/Kolkata').startOf('day');
      screenshotQuery.createdAt = {
        $gte: searchDate.toDate(),
        $lt: searchDate.clone().add(1, 'day').toDate(),
      };
    }

    if (projectId) {
      screenshotQuery.projectId = new mongoose.Types.ObjectId(projectId);
    }

    const screenShots = await Screenshot.aggregate([
      { $match: screenshotQuery },
      {
        $group: {
          _id: {
            hour: { $hour: { date: "$createdAt", timezone: "Asia/Kolkata" } },
          },
          count: { $sum: 1 },
          screenshots: { $push: "$$ROOT" },
        },
      },
      { $sort: { "_id.hour": 1 } }
    ]);

    if (screenShots.length === 0) {
      return successResponse(res, "No data found");
    }

    const hourlyScreenShots = screenShots.map((hourlyGroup) => {
      const startHour = hourlyGroup._id.hour;
      const endHour = (startHour + 1) % 24;

      return {
        time: `${startHour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`,
        count: hourlyGroup.count,
        screenshots: hourlyGroup.screenshots
          .filter((screenshot) => screenshot && screenshot.screenshot)
          .map((screenshot) => ({
            fileName: screenshot.screenshot.fileName,
            fileType: screenshot.screenshot.fileType,
            fileUrl: screenshot.screenshot.fileUrl,
            createdAt: convertToIST(screenshot.createdAt),
            projectId: screenshot.projectId,
          })),
      };
    });

    return successResponse(res, "Data received successfully", {
      hourlyScreenshots: hourlyScreenShots,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Failed to get hourly screenshots");
  }
};

export default { uploadScreenshot, getHourlyScreenshots };
