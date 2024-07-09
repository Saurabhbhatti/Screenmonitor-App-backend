import express from "express";
import {
  uploadScreenshot,
  getHourlyScreenshots,
} from "../controllers/ScreenshotController.js";
import authenticate from "../middleware/verifyAuth.js";

const router = express.Router();

router.post("/upload", authenticate, uploadScreenshot);
router.get("/hourly/", authenticate, getHourlyScreenshots);

export default router;
