import { Request, Response } from 'express';

import { User, Holiday } from '../models';
import { errorResponse, successResponse, notFoundResponse, validationError } from '../helpers/api-responses';
import utils from '../helpers/utils';
import constants from '../helpers/constants';

const createHoliday = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    if (user.role !== constants.ROLE.COMPANY_ADMIN && user.role !== constants.ROLE.HR) {
      return validationError(res, 'You are not authorized to create a holiday');
    }

    const { date, name } = req.body;

    if (!date || !name) {
      return validationError(res, 'Date and name are required');
    }

    const holidayDate = new Date(date);
    const dayOfWeek = holidayDate.toLocaleString('en-US', { weekday: 'long' });

    const holiday = await Holiday.create({
      companyId: user.companyId,
      date: holidayDate,
      name,
    });

    return successResponse(res, 'Holiday created successfully', {
      ...holiday.toObject(),
      day: dayOfWeek,
    });
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const getHolidays = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const holidays = await Holiday.find({ companyId: user.companyId });

    const holidaysWithDay = holidays.map(holiday => ({
      ...holiday.toObject(),
      day: new Date(holiday.date).toLocaleString('en-US', { weekday: 'long' }),
    }));

    return successResponse(res, 'Holidays fetched successfully', holidaysWithDay);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const editHoliday = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    if (user.role !== constants.ROLE.COMPANY_ADMIN && user.role !== constants.ROLE.HR) {
      return validationError(res, 'You are not authorized to edit a holiday');
    }

    const { holidayId, date, name } = req.body;

    const holiday = await Holiday.findByIdAndUpdate(holidayId, { date, name }, { new: true });
    return successResponse(res, 'Holiday updated successfully', holiday);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const deleteHoliday = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    // Check if the user has permission to delete holidays
    if (user.role !== constants.ROLE.COMPANY_ADMIN && user.role !== constants.ROLE.HR) {
      return validationError(res, 'You are not authorized to delete holidays');
    }

    const { holidayIds } = req.body; // Assuming holidayIds is passed as an array in the request body

    // Validate if holidayIds is an array and has valid IDs
    if (!Array.isArray(holidayIds) || holidayIds.length === 0) {
      return validationError(res, 'Please provide valid holiday IDs to delete');
    }

    // Use `deleteMany` to remove multiple holidays in one go
    await Holiday.deleteMany({ _id: { $in: holidayIds } });
    return successResponse(res, 'Holidays deleted successfully', null);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const getUpcomingHolidays = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    const today = new Date();
    const upcomingHolidays = await Holiday.find({
      companyId: user.companyId,
      date: { $gte: today },
    }).sort({ date: 1 });

    const holidaysWithDay = upcomingHolidays.map(holiday => ({
      ...holiday.toObject(),
      day: new Date(holiday.date).toLocaleString('en-US', { weekday: 'long' }),
    }));

    return successResponse(res, 'Upcoming holidays fetched successfully', holidaysWithDay);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

export default { createHoliday, getHolidays, editHoliday, deleteHoliday, getUpcomingHolidays };
