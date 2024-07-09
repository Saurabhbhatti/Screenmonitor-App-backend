import Screenshot from "../models/Screenshot.js";
import {
  errorResponse,
  successResponse,
  validationError,
} from "../helpers/api-responses.js";
import { uploadToCloudinary } from "../helpers/index.js";
import moment from "moment";

const uploadScreenshot = async (req, res) => {
  try {
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

    const uploadSingleScreenShot = image
      ? await uploadToCloudinary(image)
      : null;

    // Generate the new file name
    const extension = image.name.split(".").pop();
    const userIdLastThree = req.body.userId.slice(-3);
    const projectIdLastThree = req.body.projectId.slice(-3);
    const dateTime = moment().format("YYYYMMDD_HHmmss");
    const newFileName = `uid_${userIdLastThree}_pro_id_${projectIdLastThree}_${dateTime}.${extension}`;

    const uploadScreenshotDate = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ");
    const newScreenshot = new Screenshot({
      userId: req.body.userId,
      projectId: req.body.projectId,
      screenshot: image
        ? {
        fileName: newFileName,
        fileType: image.mimetype,
        fileUrl: uploadSingleScreenShot.secure_url,
          }
        : null,
      uploadScreenshotDate: uploadScreenshotDate,
    });

    await newScreenshot.save();

    return successResponse(res, "Screenshot uploaded successfully", {
      image: newScreenshot.screenshot,
      uploadScreenshotDate,
    });
  } catch (error) {
    return errorResponse(res, "Failed to upload screenshot");
  }
};

const getHourlyScreenshots = async (req, res) => {
  try {
    const { userId, date } = req.query;

    if (!userId) {
      return validationError(res, "User ID is required");
    }

    const screenshotQuery = { userId };

    if (date) {
      const searchDate = moment(date).startOf("day");
      screenshotQuery.createdAt = {
        $gte: searchDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
        $lt: searchDate.add(1, "day").format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
      };
    }

    const screenShots = await Screenshot.aggregate([
      { $match: screenshotQuery },
      {
        $group: {
          _id: {
            hour: { $substr: ["$createdAt", 11, 2] },
          },
          count: { $sum: 1 },
          screenshots: { $push: "$$ROOT" },
        },
      },
    ]);

    if (screenShots.length === 0) {
      return successResponse(res, "No data found");
    }

    const hourlyScreenShots = screenShots.map((hourlyGroup) => ({
      time: moment()
        .hour(parseInt(hourlyGroup._id.hour))
        .minute(0)
        .format("HH:mm"),
      count: hourlyGroup.count,
      screenshots: hourlyGroup.screenshots
        .filter((screenshot) => screenshot && screenshot.screenshot)
        .map((screenshot) => ({
          fileName: screenshot.screenshot.fileName,
          fileType: screenshot.screenshot.fileType,
          fileUrl: screenshot.screenshot.fileUrl,
          createdAt: screenshot.createdAt,
          projectId: screenshot.projectId,
        })),
    }));

    return successResponse(res, "Data received successfully", {
      hourlyScreenshots: hourlyScreenShots,
    });
  } catch (error) {
    return errorResponse(res, "Failed to get hourly screenshots");
  }
};

export { uploadScreenshot, getHourlyScreenshots };
