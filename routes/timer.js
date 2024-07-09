import express from "express";
import { createTimer, dailyWorkingHours ,updateEndTime} from "../controllers/timer.js";
import authenticate from "../middleware/verifyAuth.js";

const router = express.Router();

router.post('/daily-working-hours', authenticate,dailyWorkingHours);
router.post('/create', authenticate ,createTimer);
router.post('/endtime', authenticate ,updateEndTime);

export default router;
