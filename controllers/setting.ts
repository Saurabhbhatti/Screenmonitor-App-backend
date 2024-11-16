import { Request, Response } from 'express';

import { User, Setting } from '../models';
import { errorResponse, notFoundResponse, successResponse } from '../helpers/api-responses';
import utils from '../helpers/utils';

const updateSettings = async (req: Request, res: Response) => {
  try {
    const userIdFromToken = await utils.getUserId(req);
    const user = await User.findById(userIdFromToken);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const { leave, attendance, productivity, jira, slack } = req.body;

    const settingExists = await Setting.findOne({ userId: user._id });

    if (settingExists) {
      const setting = await Setting.findOneAndUpdate(
        { userId: user._id },
        {
          leave,
          attendance,
          productivity,
          jira,
          slack,
        },
        { new: true },
      );

      return successResponse(res, 'Settings updated successfully', setting);
    } else {
      const setting = new Setting({
        companyId: user.companyId,
        userId: user._id,
        leave,
        attendance,
        productivity,
        jira,
        slack,
      });

      await setting.save();
      return successResponse(res, 'Settings updated successfully', setting);
    }
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const getSettings = async (req: Request, res: Response) => {
  try {
    const userIdFromToken = await utils.getUserId(req);
    const user = await User.findById(userIdFromToken);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const setting = await Setting.findOne({ userId: user._id });

    if (!setting) {
      return successResponse(res, 'Settings not found', null);
    }

    return successResponse(res, 'Settings fetched successfully', setting);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

export default { updateSettings, getSettings };
