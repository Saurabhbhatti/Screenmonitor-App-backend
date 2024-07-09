import express from "express";
import { startMeeting, endMeeting, getTotalMeetingTime} from "../controllers/meetingController.js";
import authenticate from "../middleware/verifyAuth.js";

const router = express.Router();

router.post("/start", authenticate, startMeeting);
router.post("/end/:id?", authenticate, endMeeting);
router.get("/total-time", authenticate, getTotalMeetingTime);


export default router;
