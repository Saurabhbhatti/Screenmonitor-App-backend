import express from 'express';

import authController from '../controllers/auth.js';
import timerController from '../controllers/timer.js';
import projectController from '../controllers/project.js';
import screenshotController from '../controllers/screenshot.js';
import onlineUserController from '../controllers/onlineUser.js';
import authenticate from '../middleware/verifyAuth.js';

const router = express.Router();

// auth routes
router.post('/auth/login', authController.login);

// timer routes
router.post('/timer/checkin', authenticate, timerController.checkIn);
router.post('/timer/checkout', authenticate, timerController.checkOut);

// project routes
router.get('/project/list', authenticate, projectController.getProject);

// screenshot routes
router.post('/screenshot/upload', authenticate, screenshotController.uploadScreenshot);

// online user routes
router.post('/online-user/add', authenticate, onlineUserController.addOnlineUser);

export default router;
