import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

import {
  successResponse,
  validationError,
  errorResponse,
  unauthorizedResponse,
} from "../helpers/api-responses.js";
import { generatePassword, sendForgotPasswordEmail} from "../helpers/utils.js";
import { userAggregatedHoursForLogin } from "../helpers/userUtils.js";

const router = Router();

// create admin 
const registerAdmin = async (req, res) => {
  const { first_name, last_name, email, password, role, phone } = req.body;
  const encryptedPassword = await bcrypt.hash(password, 10);
  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin && role === "admin") {
    return res.status(400).json({
      success: false,
      msg: "An admin already exists. Only one admin is allowed.",
    });
  }

  const user = new User({
    first_name,
    last_name,
    email,
    password: encryptedPassword,
    role,
    phone,
  });

  try {
    const savedUser = await user.save();
    return successResponse(res, "User added successfully", savedUser);
  } catch (error) {
    return validationError(res, error.message);
  }
};

// user login and admin login 
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return errorResponse(res, "Invalid Email, Enter valid Email");
    }

    if (user.status === "inactive") {
      return unauthorizedResponse(res, "You are not permitted to login, contact admin!", null);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return errorResponse(res, "Invalid password, Enter valid Password");
    }

    const jwtPayload = user;
    const secret = process.env.JWT_SECRET;
    let token = jwt.sign(jwtPayload.toJSON(), secret);
    user.password = undefined;
    user.__v = undefined;

    const { dailyWorkHours, weeklyHours } = await userAggregatedHoursForLogin(user._id);

    let response = { 
      ...user._doc, 
      token: token,
      dailyTotalWorkingHour: dailyWorkHours, 
      weeklyTotalWorkingHour: weeklyHours 
    };

    if (user.isNewUser && user.role === 'user') {
      response.requiresPasswordReset = true;
    }

    return successResponse(res, "Login successful", response);
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse(res, error.message);
  }
};

// user forgotPassword and admin forgotPassword 
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required!', status: false });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: 'Email not found!', status: false });
    }

    const newPassword = generatePassword();    
    const encryptedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(user._id, { password: encryptedPassword });

    const userData = {
      name: user.name, 
      email: user.email, 
      password: newPassword
    };

    await sendForgotPasswordEmail(user.email, "Greetings! Your password reset was successful", userData);

    res.status(200).json({ message: 'Password reset email sent to your email!', status: true });
  } catch (error) {
    res.status(500).json({ error: 'Error sending password reset email!', status: false });
  }
};

// user resetPassword and admin resetPassword 
const resetPassword = async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing required parameters', status: false });
  }

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found', status: false });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid current password', status: false });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    user.isNewUser = false;

    user.requiresPasswordReset = false;

    const options = { validateModifiedOnly: true };
    await user.save(options);

    return res.json({ message: 'Password reset successfully', status: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', status: false });
  }
};

export default { registerAdmin, login, forgotPassword, resetPassword};
