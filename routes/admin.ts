import express from 'express';

import authController from '../controllers/auth';
import userController from '../controllers/user';
import projectController from '../controllers/project';
import timerController from '../controllers/timer';
import screenshotController from '../controllers/screenshot';
import authenticate from '../middleware/verifyAuth';
import dsrController from '../controllers/dsr';
import timerRequestController from '../controllers/timeRequest';
import leaveController from '../controllers/leave';
import holidayController from '../controllers/holiday';
import dashboardController from '../controllers/dashboard';
import attendanceController from '../controllers/attendance';
import compoffController from '../controllers/compoff';
import profileDetailController from '../controllers/profileDetail';
import settingController from '../controllers/setting';

const router = express.Router();

// auth routes
router.post('/auth/add', authController.registerSuperAdmin);
router.post('/auth/login', authController.login);
router.post('/auth/forgotpassword', authController.forgotPassword);
router.put('/auth/resetpassword', authController.resetPassword);

// user routes
router.post('/user/add', authenticate, userController.addUserAndCompany);
router.post('/user/edit', authenticate, userController.editUserAndCompany);
router.get('/users', authenticate, userController.getUsers);
router.get('/user/list', authenticate, userController.getUsersList);
router.delete('/user/delete', authenticate, userController.deleteUser);
router.get('/user/roles', authenticate, userController.getUserRoles);

// company routes
router.post('/company/add', authenticate, userController.addUserAndCompany);
router.get('/company/list', authenticate, userController.getCompanies);
router.patch('/company/edit', authenticate, userController.editUserAndCompany);
router.delete('/company/delete', authenticate, userController.deleteCompany);

// project routes
router.post('/project/add', authenticate, projectController.addProject);
router.post('/project/edit', authenticate, projectController.editProject);
router.post('/project/list', authenticate, projectController.getProject);
router.get('/project/name/list', authenticate, projectController.getProjectsByName);
router.delete('/project/delete', authenticate, projectController.deleteProject);

// timer routes
router.post('/timer/daily-working-hours', authenticate, timerController.dailyWorkingHours);
router.post('/timer/activity', authenticate, timerController.timerActivity);
router.post('/timer/timeline', authenticate, timerController.timelineActivity);

// screenshot routes
router.post('/screenshot/hourly', authenticate, screenshotController.getHourlyScreenshots);

//dsr routes
router.post('/report', authenticate, dsrController.generateReport);
router.post('/dsr', authenticate, dsrController.getDSR);

// time request routes
router.post('/time-request', authenticate, timerRequestController.applyForTimeRequest);
router.get('/time-request', authenticate, timerRequestController.getTimeRequests);
router.post('/time-request/action', authenticate, timerRequestController.approveOrRejectTimeRequest);

// leave routes
router.post('/leave', authenticate, leaveController.createLeave);
router.get('/leave', authenticate, leaveController.getLeaves);
router.post('/leave/action', authenticate, leaveController.actionOnLeave);
router.post('/leave/history', leaveController.addLeaveHistory);
router.get('/leave/upcoming', authenticate, leaveController.getUpcomingLeaves);
router.get('/leave/history', authenticate, leaveController.getLeaveHistory);
router.get('/leave/check', authenticate, leaveController.checkExistingLeaveAndHoliday);
router.get('/export-leave-report', authenticate, leaveController.LeaveHistoryReport);

// holiday routes
router.post('/holiday', authenticate, holidayController.createHoliday);
router.get('/holiday', authenticate, holidayController.getHolidays);
router.patch('/holiday', authenticate, holidayController.editHoliday);
router.delete('/holiday', authenticate, holidayController.deleteHoliday);
router.get('/holiday/upcoming', authenticate, holidayController.getUpcomingHolidays);

// dashboard routes
router.get('/dashboard/total-hours', authenticate, dashboardController.getTotalHoursData);
router.get('/dashboard/total-leaves', authenticate, dashboardController.getTotalLeavesData);
router.get('/dashboard/chart-data', authenticate, dashboardController.getChartData);

//attendance routes
router.post('/attendance', authenticate, attendanceController.getAttendance);

// compoff routes
router.get('/compoff', authenticate, compoffController.getCompoffRequests);
router.post('/compoff', authenticate, compoffController.actionOnCompoffRequest);
router.post('/compoff/daily', compoffController.creditDailyCompoff);
router.post('/compoff/monthly', compoffController.creditMonthlyCompoff);

// profile detail routes
router.patch('/profile-detail', authenticate, profileDetailController.updateProfileDetail);
router.get('/profile-detail', authenticate, profileDetailController.getProfileDetail);

// setting routes
router.patch('/setting', authenticate, settingController.updateSettings);
router.get('/setting', authenticate, settingController.getSettings);

export default router;
