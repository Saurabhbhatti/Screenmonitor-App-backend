import express from 'express';

import authController from '../controllers/auth';
import timerController from '../controllers/timer';
import projectController from '../controllers/project';
import screenshotController from '../controllers/screenshot';
import onlineUserController from '../controllers/onlineUser';
import authenticate from '../middleware/verifyAuth';
import dsrController from '../controllers/dsr';
import jiraController from '../controllers/jira';

const router = express.Router();

// auth routes
router.post('/auth/login', authController.login);

// timer routes
router.post('/timer/checkin', authenticate, timerController.checkIn);
router.post('/timer/checkout', authenticate, timerController.checkOut);

// project routes
router.get('/project/name/list', authenticate, projectController.getProjectsByName);

// screenshot routes
router.post('/screenshot/upload', authenticate, screenshotController.uploadScreenshot);

// online user routes
router.post('/online-user/add', authenticate, onlineUserController.addOnlineUser);

// dsr routes
router.get('/dsr', authenticate, dsrController.getDSR);
router.post('/dsr/update', authenticate, dsrController.createDSR);

// jira routes
router.get('/jira/issues', authenticate, jiraController.getJiraIssues);
router.post('/jira/worklog', authenticate, jiraController.addWorklog);

export default router;
