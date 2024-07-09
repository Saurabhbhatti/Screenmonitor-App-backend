import express from 'express';

import authController from '../controllers/auth.js';
import userController from '../controllers/user.js';
import projectController from '../controllers/project.js';
import timerController from '../controllers/timer.js';
import screenshotController from '../controllers/screenshot.js';
import leaveController from '../controllers/leave.js';
import authenticate from '../middleware/verifyAuth.js';

const router = express.Router();

// auth routes
router.post('/auth/add', authController.registerAdmin);
router.post('/auth/login', authController.login);
router.post('/auth/forgotpassword', authController.forgotPassword);
router.put('/auth/resetpassword', authController.resetPassword);

// user routes
router.post('/user/add', authenticate, userController.addUser);
router.post('/user/edit', authenticate, userController.editUser);
router.get('/user/list', authenticate, userController.getUsers);
router.delete('/user/delete', authenticate, userController.deleteUser);
router.get('/user/active-users-projects', authenticate, userController.activeUserAndProject);
router.get('/user/activity', authenticate, userController.totalUsersActivity);
router.post('/user/status/edit', authenticate, userController.changeStatus);

// project routes
router.post('/project/add', authenticate, projectController.addProject);
router.post('/project/edit', authenticate, projectController.editProject);
router.get('/project/list', authenticate, projectController.getProject);
router.delete('/project/delete', authenticate, projectController.deleteProject);
router.post('/project/status/edit', authenticate, projectController.changeStatus);

// timer routes
router.post('/timer/daily-working-hours', authenticate, timerController.dailyWorkingHours);

// screenshot routes
router.post('/screenshot/hourly', authenticate, screenshotController.getHourlyScreenshots);

// leave routes
router.post('/leave/apply', authenticate, leaveController.addLeavesToAllUsers);
router.get('/leave/list', authenticate, leaveController.applyApproveRejectLeaveOrGetLeaves);

export default router;
