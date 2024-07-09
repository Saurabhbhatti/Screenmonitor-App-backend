import OnlineUser from '../models/OnlineUser.js';
import User from '../models/User.js';
import { successResponse, errorResponse, validationError } from '../helpers/api-responses.js';
import { getUserId } from '../helpers/utils.js';

const addOnlineUser = async (req, res) => {
  try {
    const { checkinId } = req.body;
    const userId = getUserId(req);

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
