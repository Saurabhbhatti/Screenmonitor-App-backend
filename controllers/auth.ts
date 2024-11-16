import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';

import { Company, User } from '../models';
import { successResponse, validationError, errorResponse, unauthorizedResponse, notFoundResponse } from '../helpers/api-responses';
import utils from '../helpers/utils';
import { getDailyAndWeeklyHours } from '../helpers/timerUtils';
import constants from '../helpers/constants';
import { LoginResponse } from '../types/auth';

// create admin
const registerSuperAdmin = async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, phone, empCode } = req.body;
  const encryptedPassword: string = await bcrypt.hash(password, 10);
  const existingAdmin = await User.findOne({ role: constants.ROLE.SUPER_ADMIN });
  if (existingAdmin) {
    return validationError(res, 'Super admin already exists in the database');
  }

  const user = new User({
    firstName,
    lastName,
    email,
    password: encryptedPassword,
    role: constants.ROLE.SUPER_ADMIN,
    phone,
    empCode,
  });

  try {
    const savedUser = await user.save();
    return successResponse(res, 'Super admin added successfully', savedUser);
  } catch (error: any) {
    return validationError(res, error.message);
  }
};

// user login and admin login
const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ $or: [{ email: username }, { empCode: username }] });

    if (!user) {
      const errorMessage = utils.validateEmail(username) ? 'Invalid Email, Enter valid email' : 'Invalid Employee code';
      return validationError(res, errorMessage);
    }

    if (user.status === constants.STATUS.INACTIVE) {
      return unauthorizedResponse(res, 'You are not permitted to login, contact admin!');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return validationError(res, 'Invalid password, Enter valid Password');
    }

    const token: string = utils.generateToken(user);

    const { dailyWorkHours, weeklyWorkHours } = await getDailyAndWeeklyHours(user._id);

    const { _id, firstName, lastName, companyId, designation, email: userEmail, phone, status, role, isNewUser, empCode } = user;

    const company = await Company.findById(companyId);
    const companyName = company ? company.companyName : '';

    let response: LoginResponse = {
      _id: _id.toString(),
      firstName,
      lastName,
      companyId,
      companyName,
      designation,
      email: userEmail,
      phone,
      status,
      role,
      isNewUser,
      token,
      dailyTotalWorkingHour: dailyWorkHours,
      weeklyTotalWorkingHour: weeklyWorkHours,
      requiresPasswordReset: isNewUser,
      empCode,
    };

    return successResponse(res, 'Login successful', response);
  } catch (error: any) {
    console.error('Login error:', error);
    return errorResponse(res, error.message);
  }
};

// user forgotPassword and admin forgotPassword
const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return validationError(res, 'Email is required');
    }

    const user = await User.findOne({ email });

    if (!user) {
      return notFoundResponse(res, 'user with this email not found');
    }

    const newPassword = utils.generatePassword();
    const encryptedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(user._id, { password: encryptedPassword });

    const userData = {
      firstName: `${user.firstName}`,
      lastName: `${user.lastName}`,
      email,
      password: newPassword,
    };

    await utils.sendForgotPasswordEmail(email, 'Greetings! Your password reset was successful', userData);

    return successResponse(res, 'Password reset email sent to your email!', null);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

// user resetPassword and admin resetPassword
const resetPassword = async (req: Request, res: Response) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    return validationError(res, 'Email, current password and new password are required');
  }

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return notFoundResponse(res, 'User with this email not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return validationError(res, 'Invalid current password');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(user._id, {
      password: hashedNewPassword,
      isNewUser: false,
      requiresPasswordReset: false,
    });

    return successResponse(res, 'Password reset successfully', null);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

export default { registerSuperAdmin, login, forgotPassword, resetPassword };
