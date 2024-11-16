import { Request, Response } from 'express';
import mongoose from 'mongoose';

import { User, Compoff, LeaveHistory } from '../models';
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
import compoff from '../helpers/cronjobs';

const getCompoffRequests = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    if (user.role !== constants.ROLE.COMPANY_ADMIN && user.role !== constants.ROLE.HR) {
      return unauthorizedResponse(res, 'You are not authorized to access this resource');
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 1;

    const { userFilterId, startDate, endDate, status } = req.query;

    const filterCriteria: any = { companyId: user.companyId };

    if (userFilterId) {
      filterCriteria.userId = new mongoose.Types.ObjectId(userFilterId as string);
    }

    if (startDate && endDate) {
      filterCriteria.workDate = { $gte: new Date(startDate as string), $lte: new Date(endDate as string) };
    }

    if (status) {
      filterCriteria.status = status as string;
    }

    const compoffRequests = await Compoff.aggregate([
      { $match: filterCriteria },

      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'actionBy',
          foreignField: '_id',
          as: 'actionBy',
        },
      },
      { $unwind: { path: '$actionBy', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          compoffType: 1,
          description: 1,
          workDate: 1,
          totalHours: 1,
          trackedHours: 1,
          eligibleCompoff: 1,
          status: 1,
          createdAt: 1,
          'user.firstName': 1,
          'user.lastName': 1,
          'user.empCode': 1,
          'actionBy.firstName': 1,
          'actionBy.lastName': 1,
          'actionBy.empCode': 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (offset - 1) * limit },
      { $limit: limit },
    ]);

    const totalRequests = await Compoff.countDocuments(filterCriteria);

    return successResponseWithPagination(res, 'Compoff requests fetched successfully', totalRequests, compoffRequests);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const actionOnCompoffRequest = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    if (user.role !== constants.ROLE.COMPANY_ADMIN && user.role !== constants.ROLE.HR) {
      return unauthorizedResponse(res, 'You are not authorized to access this resource');
    }

    const { compoffId, eligibleCompoff, status, comment } = req.body;

    const compoffExists = await Compoff.findById(compoffId);
    if (!compoffExists) {
      return notFoundResponse(res, 'Compoff request not found');
    }

    const lastLeaveHistory = await LeaveHistory.findOne({ userId: compoffExists.userId }).sort({ createdAt: -1 }).lean();

    const isApproved = status === constants.COMPOFF_STATUS.APPROVED;
    const isRejected = status === constants.COMPOFF_STATUS.REJECTED;

    if (!isApproved && !isRejected) {
      return validationError(res, 'Invalid status provided');
    }

    const updateData = { eligibleCompoff, status, comment };

    const updatedCompoff = await Compoff.findByIdAndUpdate(compoffId, updateData, { new: true });

    const compoff = eligibleCompoff ? eligibleCompoff : compoffExists.eligibleCompoff;

    const leaveHistoryData = {
      companyId: user.companyId,
      userId: compoffExists.userId,
      compoffId: compoffExists._id,
      description: `Compoff request ${isApproved ? 'approved' : 'rejected'}`,
      credited: isApproved ? Math.max(compoffExists.eligibleCompoff, 0) : 0,
      debited: isApproved ? Math.abs(Math.min(compoffExists.eligibleCompoff, 0)) : 0,
      availablePL: lastLeaveHistory?.availablePL,
      availableCompOff: isApproved ? (lastLeaveHistory?.availableCompOff || 0) + compoff : lastLeaveHistory?.availableCompOff,
    };

    await LeaveHistory.create(leaveHistoryData);

    return successResponse(res, `Compoff request ${status} successfully`, updatedCompoff);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const creditDailyCompoff = async (_req: Request, res: Response) => {
  await compoff.creditDailyCompoff();
  return successResponse(res, 'Daily compoff cronjob run successfully', null);
};

const creditMonthlyCompoff = async (_req: Request, res: Response) => {
  await compoff.creditMonthlyCompoff();
  return successResponse(res, 'Monthly compoff cronjob run successfully', null);
};

export default { getCompoffRequests, actionOnCompoffRequest, creditDailyCompoff, creditMonthlyCompoff };
