import { Request, Response } from 'express';
import mongoose from 'mongoose';

import { User, Project, Timer, TimeRequest } from '../models';
import {
  errorResponse,
  notFoundResponse,
  successResponse,
  successResponseWithPagination,
  unauthorizedResponse,
  validationError,
} from '../helpers/api-responses';
import utils from '../helpers/utils';
import constants from '../helpers/constants';
import { getTimeRequestQuery } from '../query/timeRequest';
import { TimeRequestFilterOptions } from '../types';

const applyForTimeRequest = async (req: Request, res: Response) => {
  try {
    const userIdFromToken = await utils.getUserId(req);
    const user = await User.findById(userIdFromToken);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const { userId, projectId, applyDate, startTime, endTime, description } = req.body;

    if (!userId || !startTime || !endTime) {
      return validationError(res, 'userId, projectId and startTime are required');
    }

    if (startTime > endTime) {
      return validationError(res, 'startTime should be less than endTime');
    }

    const userExists = await User.findOne({ _id: userId });
    if (!userExists) {
      return notFoundResponse(res, 'User not found, please provide valid userId');
    }

    if (projectId) {
      const projectExists = await Project.findOne({ _id: projectId });
      if (!projectExists) {
        return notFoundResponse(res, 'Project not found, please provide valid projectId');
      }
    }

    const timeRequestExists = await TimeRequest.findOne({
      userId,
      applyDate,
      startTime,
      endTime,
    });

    if (timeRequestExists) {
      return validationError(res, 'Time request already exists');
    }

    const isSelfRequest: boolean = user._id.toString() === userExists._id.toString();

    const timeRequestData = {
      companyId: user.companyId,
      userId,
      requestBy: isSelfRequest ? userId : user._id,
      actionBy: isSelfRequest ? null : user._id,
      projectId,
      applyDate,
      startTime,
      endTime,
      description,
      status: isSelfRequest ? constants.TIME_REQUEST_STATUS.PENDING : constants.TIME_REQUEST_STATUS.APPROVED,
    };

    const savedTimeRequest = await new TimeRequest(timeRequestData).save();

    if (!isSelfRequest) {
      const timer = new Timer({
        companyId: user.companyId,
        userId,
        projectId,
        startTime,
        endTime,
        description,
        type: constants.TIMER_TYPE.MANUAL,
      });
      await timer.save();
    }

    return successResponse(res, 'Time request added successfully', savedTimeRequest);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const getTimeRequests = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 1;

    const { userFilterId, startDate, endDate, status, isSelf } = req.query;
    console.log(typeof isSelf);

    // Determine the filter criteria based on user role and the notes provided
    let filterCriteria: TimeRequestFilterOptions = {};
    const userIdStr = new mongoose.Types.ObjectId(userId as string);

    if (user.role === constants.ROLE.COMPANY_ADMIN) {
      // Company Admin sees all requests
      filterCriteria =
        isSelf === 'true'
          ? {
              $or: [{ userId: userIdStr }, { requestBy: userIdStr }],
            }
          : {};
    } else if (user.role === constants.ROLE.HR || user.role === constants.ROLE.PROJECT_MANAGER) {
      filterCriteria =
        isSelf === 'true'
          ? {
              $or: [{ userId: userIdStr }, { requestBy: userIdStr }],
            }
          : {};
    } else {
      // Regular employees only see their own requests
      filterCriteria = {
        $or: [{ userId: userIdStr }, { requestBy: userIdStr }],
      };
    }

    if (userFilterId) {
      filterCriteria.userId = new mongoose.Types.ObjectId(userFilterId as string);
    }

    if (startDate && endDate) {
      filterCriteria.applyDate = { $gte: new Date(startDate as string), $lte: new Date(endDate as string) };
    }

    if (status) {
      filterCriteria.status = status as string;
    }

    // Fetch the time requests based on the filter criteria
    const timeRequestQuery = getTimeRequestQuery(filterCriteria, limit, offset);
    const timeRequests = await TimeRequest.aggregate(timeRequestQuery);

    const totalRequests = await TimeRequest.countDocuments(filterCriteria);

    return successResponseWithPagination(res, 'Time requests fetched successfully', totalRequests, timeRequests);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const approveOrRejectTimeRequest = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const { requestId, status, reason } = req.body;

    if (!requestId || !status) {
      return validationError(res, 'requestId and status are required');
    }

    if (user.role === constants.ROLE.EMPLOYEE) {
      if (status === constants.TIME_REQUEST_STATUS.CANCELLED) {
        return;
      } else {
        return unauthorizedResponse(res, 'You are not authorized to perform this action');
      }
    }

    const timeRequest = await TimeRequest.findById(requestId);
    if (!timeRequest) {
      return notFoundResponse(res, 'Time request not found');
    }

    const updatedTimeRequest = await TimeRequest.findByIdAndUpdate(requestId, { status, actionBy: userId, reason }, { new: true });

    if (status === constants.TIME_REQUEST_STATUS.APPROVED) {
      const timer = new Timer({
        companyId: user.companyId,
        userId: timeRequest.userId,
        projectId: timeRequest.projectId,
        startTime: timeRequest.startTime,
        endTime: timeRequest.endTime,
        description: timeRequest.description,
        type: constants.TIMER_TYPE.MANUAL,
      });
      await timer.save();
    }

    return successResponse(res, 'Time request updated successfully', updatedTimeRequest);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

export default { applyForTimeRequest, getTimeRequests, approveOrRejectTimeRequest };
