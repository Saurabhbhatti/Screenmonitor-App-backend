import { Request, Response } from 'express';

import { User, OnlineUser } from '../models';
import { successResponse, errorResponse, validationError } from '../helpers/api-responses';
import utils from '../helpers/utils';

const addOnlineUser = async (req: Request, res: Response) => {
  try {
    const { checkinId } = req.body;
    const userId = utils.getUserId(req);

    if (!userId) {
      return validationError(res, 'Invalid or missing token');
    }

    const isUser = await User.findById(userId);
    if (!isUser) {
      return validationError(res, 'User not found');
    }

    if (!checkinId) {
      return validationError(res, 'checkinId is required in request body');
    }

    let onlineUser = await OnlineUser.findOne({ userId, checkinId });

    if (onlineUser) {
      onlineUser.updatedAt = new Date();
      await onlineUser.save();
      return successResponse(res, 'Online user record updated successfully', onlineUser);
    }

    onlineUser = new OnlineUser({
      companyId: isUser.companyId,
      userId,
      checkinId,
    });
    await onlineUser.save();
    return successResponse(res, 'Online user record created successfully', onlineUser);
  } catch (error) {
    console.error('Error in addOnlineUser:', error);
    return errorResponse(res, 'Server error');
  }
};

export default { addOnlineUser };
