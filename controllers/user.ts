import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose, { ObjectId } from 'mongoose';

import { errorResponse, successResponse, successResponseWithPagination, validationError } from '../helpers/api-responses';
import constants from '../helpers/constants';
import utils from '../helpers/utils';
import { User, Timer, Company, UserProject, Project, Screenshot, DSR, OnlineUser, Leave, LeaveHistory, TimeRequest, Compoff } from '../models';
import { getUsersWithProjectsAggregate } from '../helpers/userUtils';
import { FilterOptions, WelcomeEmailData, FilterCompanyOptions, AddUserCompanyResponse } from '../types';
import { UserDataResponse } from '../types/user';

// Add User
const addUserAndCompany = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      designation,
      email,
      phone,
      companyName,
      companyEmail,
      companyPhone,
      companyAddress,
      companyWebsite,
      projectIds,
      empCode,
      role,
    } = req.body;

    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return validationError(res, 'User not found');
    }

    if (user.role === constants.ROLE.SUPER_ADMIN) {
      if (!firstName || !lastName || !email || !phone || !companyName || !companyEmail || !companyPhone) {
        return validationError(res, 'Missing required fields');
      }
    } else {
      if (!firstName || !lastName || !email || !phone || !empCode) {
        return validationError(res, 'Missing required fields');
      }
    }

    const companyExists = await Company.findOne({ companyEmail });
    if (companyExists) {
      return validationError(res, 'Company with this email already exists');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return validationError(res, 'User with this email already exists');
    }

    // Employee is not allowed to add users
    if (user.role === constants.ROLE.EMPLOYEE || user.role === constants.ROLE.PROJECT_MANAGER) {
      return validationError(res, 'You are not authorized to add users');
    }

    // Generate a random password for the new user
    const password: string = utils.generatePassword();

    // Encrypt the password using bcrypt
    const encryptedPassword = await bcrypt.hash(password, 10);

    let response: AddUserCompanyResponse;

    // Create a new User instance and save it to the database
    const newUser = new User({
      firstName,
      lastName,
      designation,
      email,
      password: encryptedPassword,
      phone,
      role: user.role === constants.ROLE.SUPER_ADMIN ? constants.ROLE.COMPANY_ADMIN : role,
      companyId: user.role === constants.ROLE.SUPER_ADMIN ? null : user.companyId,
      empCode,
    });
    const savedUser = await newUser.save();

    let companyId: ObjectId | undefined = user.companyId;

    if (user.role === constants.ROLE.SUPER_ADMIN) {
      // Create a new Company instance and save it to the database
      const company = new Company({
        userId: savedUser._id,
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
        companyWebsite,
      });
      const savedCompany = await company.save();
      // Update the user with the company ID
      const updatedUser = await User.findOneAndUpdate({ _id: savedUser._id }, { companyId: savedCompany._id }, { new: true });
      response = { user: updatedUser, company: savedCompany };
      const newLeaveHistory = {
        companyId: savedCompany._id,
        userId: savedUser._id,
        credited: 0,
        debited: 0,
        availablePL: 0,
        availableCompoff: 0,
      };

      await LeaveHistory.create(newLeaveHistory);
    } else {
      response = { user: savedUser, company: null };
      const newLeaveHistory = {
        companyId: savedUser.companyId,
        userId: savedUser._id,
        credited: 0,
        debited: 0,
        availablePL: 0,
        availableCompoff: 0,
      };

      await LeaveHistory.create(newLeaveHistory);
    }
    // Send a welcome email with user details
    const userData: WelcomeEmailData = { firstName, lastName, email, password };
    utils.sendEmail(email, 'Greetings!', userData);

    // Create a new UserProject document with the new user's ID and projectId, if projectIds are provided
    if (projectIds) {
      const projectObjectIds = projectIds.map((id: string) => new mongoose.Types.ObjectId(id));
      const userProject = new UserProject({
        userId: savedUser._id,
        projectIds: projectObjectIds, // Ensure projectIds are ObjectId instances
        companyId: companyId,
      });
      await userProject.save();

      const projects = await Project.find(
        { _id: { $in: projectObjectIds } },
        { _id: 1, projectName: 1 }, // Include only _id and projectName
      );

      response = {
        user: {
          ...savedUser.toObject(),
          isNewUser: true,
          projects: projects,
        },
        company: null,
      };
    }

    return successResponse(res, 'User added successfully', response);
  } catch (error: any) {
    return validationError(res, error.message);
  }
};

const getCompanies = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return validationError(res, 'User not found');
    }

    if (user.role !== constants.ROLE.SUPER_ADMIN) {
      return validationError(res, 'Only super admin is allowed to view companies');
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 1;
    const search = req.query.search as string;

    let filter: FilterCompanyOptions = {};
    if (search) {
      // search companies by name, email, phone and website
      filter = {
        $or: [
          { companyName: { $regex: new RegExp(search, 'i') } },
          { companyEmail: { $regex: new RegExp(search, 'i') } },
          { companyPhone: { $regex: new RegExp(search, 'i') } },
          { companyWebsite: { $regex: new RegExp(search, 'i') } },
        ],
      };
    }

    const totalCompanies = await Company.countDocuments(filter);

    // Fetch companies based on filter, pagination, and sorting
    const companies = await Company.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'users', // The users collection
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' }, // Unwind the user array to a single object
      {
        $project: {
          user: 1, // Include the user information
          company: {
            _id: '$_id',
            userId: '$user._id',
            companyName: '$companyName',
            companyEmail: '$companyEmail',
            companyPhone: '$companyPhone',
            companyAddress: '$companyAddress',
            companyWebsite: '$companyWebsite',
            status: '$status',
            createdAt: '$createdAt',
            updatedAt: '$updatedAt',
            __v: '$__v',
          },
        },
      },
      { $sort: { 'company.createdAt': -1 } },
      { $skip: (offset - 1) * limit },
      { $limit: limit },
    ]);

    return successResponseWithPagination(res, 'Companies found successfully', totalCompanies, companies);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

// Get Users
const getUsers = async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10; // Default to 10 if not provided
  const offset = parseInt(req.query.offset as string) || 1; // Default to 1 if not provided
  const searchText = req.query.searchText;
  const status = req.query.status;

  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return validationError(res, 'User not found');
    }

    // Initialize filter object with user role condition
    let filter: FilterOptions = {
      companyId: user.role === constants.ROLE.SUPER_ADMIN ? { $ne: null } : user.companyId,
      _id: user.role === constants.ROLE.EMPLOYEE ? new mongoose.Types.ObjectId(userId) : { $ne: new mongoose.Types.ObjectId(userId) },
      role: user.role === constants.ROLE.EMPLOYEE ? constants.ROLE.EMPLOYEE : { $ne: constants.ROLE.SUPER_ADMIN },
    };

    // Add name filter if provided
    if (searchText) {
      filter.$or = [
        { firstName: { $regex: new RegExp(searchText.toString(), 'i') } },
        { lastName: { $regex: new RegExp(searchText.toString(), 'i') } },
        { email: { $regex: new RegExp(searchText.toString(), 'i') } },
        { phone: { $regex: new RegExp(searchText.toString(), 'i') } },
        { empCode: { $regex: new RegExp(searchText.toString(), 'i') } },
      ];
    }

    // Add status filter if provided
    if (status) {
      filter.status = status.toString();
    }

    // Fetch users with projects
    const users = await getUsersWithProjectsAggregate(filter, limit, offset);

    // Count total users matching the filter
    const totalUsers = await User.countDocuments(filter);

    return successResponseWithPagination(res, 'Users found successfully', totalUsers, users);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

// get Users by Name
const getUsersList = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);

    if (!user) {
      return validationError(res, 'User not found');
    }

    const activeStatus = constants.STATUS.ACTIVE;
    const excludedRoles = [constants.ROLE.SUPER_ADMIN];
    const excludeSelf = { _id: { $ne: userId } };

    if (user.role === constants.ROLE.COMPANY_ADMIN || user.role === constants.ROLE.HR || user.role === constants.ROLE.PROJECT_MANAGER) {
      // Admin/HR: Get all active users' IDs and names from the User collection
      const allUsers: UserDataResponse[] = await User.find(
        {
          status: activeStatus,
          role: { $nin: excludedRoles },
          ...excludeSelf,
        },
        { _id: 1, firstName: 1, lastName: 1 },
      );
      return successResponse(res, 'Users retrieved successfully', allUsers);
    } else {
      // Handle cases where the user is neither COMPANY_ADMIN nor HR
      return validationError(res, 'Unauthorized access');
    }
  } catch (error: any) {
    return errorResponse(res, `Failed to retrieve users: ${error.message}`);
  }
};

// Edit User
const editUserAndCompany = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      companyId,
      firstName,
      lastName,
      designation,
      email,
      phone,
      projectIds,
      userStatus,
      companyName,
      companyEmail,
      companyPhone,
      companyAddress,
      companyWebsite,
      companyStatus,
      empCode,
      role,
    } = req.body;

    const adminId = await utils.getUserId(req);
    const userExists = await User.findById(adminId);
    if (!userExists) {
      return validationError(res, 'User not found');
    }

    // Retrieve user by ID
    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, 'User not found');
    }

    if (userExists.role === constants.ROLE.SUPER_ADMIN) {
      const companyExists = await Company.findById(companyId);
      if (!companyExists) {
        return validationError(res, 'Company not found');
      }
    }

    // Define update query with optional fields
    const updateUserQuery = [
      { _id: userId },
      {
        $set: {
          firstName,
          lastName,
          designation,
          email,
          phone,
          status: userStatus,
          empCode,
          role,
        },
      },
      { new: true },
    ];

    const updateCompanyQuery = [
      { _id: companyId },
      {
        $set: {
          companyName,
          companyEmail,
          companyPhone,
          companyAddress,
          companyWebsite,
          status: companyStatus,
        },
      },
      { new: true },
    ];

    // Execute update query and retrieve updated user
    const updatedUser = await User.findOneAndUpdate(...updateUserQuery);
    if (!updatedUser) {
      return errorResponse(res, 'User update failed');
    }

    // Update company if the user is a super admin
    if (userExists.role === constants.ROLE.SUPER_ADMIN) {
      await Company.findOneAndUpdate(...updateCompanyQuery);
    }

    if (projectIds) {
      // Update or add projectIds in the UserProject collection
      await UserProject.updateOne({ userId }, { $set: { projectIds } }, { upsert: true });

      // Fetch project details with projection for only _id and projectName
      const projects = await Project.find(
        { _id: { $in: projectIds } },
        { _id: 1, projectName: 1 }, // Include only _id and projectName
      );

      const response = {
        user: {
          ...updatedUser.toObject(),
          projects: projects,
        },
        company: null, // Assuming company details are not needed in the response
      };

      return successResponse(res, 'Data updated successfully', response);
    } else {
      const company = await Company.findById(companyId);
      const response = {
        user: {
          ...updatedUser.toObject(),
          projects: [],
        },
        company: company,
      };

      return successResponse(res, 'Data updated successfully', response);
    }
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

// Delete User
const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    const userId = await utils.getUserId(req);
    const userExists = await User.findById(userId);
    if (!userExists) {
      return validationError(res, 'User not found');
    }

    // Find user by ID and delete from database
    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, 'User not found in the database');
    }

    // Find all the documents from all the collection which are related to the user and delete them
    await Promise.all([
      User.deleteOne({ _id: id }),
      UserProject.deleteMany({ userId: id }),
      Timer.deleteMany({ userId: id }),
      Screenshot.deleteMany({ userId: id }),
      DSR.deleteMany({ userId: id }),
      OnlineUser.deleteMany({ userId: id }),
      Leave.deleteMany({ userId: id }),
      LeaveHistory.deleteMany({ userId: id }),
      TimeRequest.deleteMany({ userId: id }),
      Compoff.deleteMany({ userId: id }),
    ]);

    return successResponse(res, 'User deleted successfully', null);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

// Delete Company
const deleteCompany = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.body;

    const userId = await utils.getUserId(req);
    const userExists = await User.findById(userId);
    if (!userExists) {
      return validationError(res, 'User not found');
    }

    if (userExists.role !== constants.ROLE.SUPER_ADMIN) {
      return validationError(res, 'Only super admin is allowed to delete companies');
    }

    const companyExists = await Company.findById(companyId);
    if (!companyExists) {
      return validationError(res, 'Company not found');
    }

    // Find all the documents from all the collection which are related to the company and delete them
    await Promise.all([
      Company.deleteOne({ _id: companyId }),
      User.deleteMany({ companyId }),
      UserProject.deleteMany({ companyId }),
      Project.deleteMany({ companyId }),
      Timer.deleteMany({ companyId }),
      Screenshot.deleteMany({ companyId }),
      DSR.deleteMany({ companyId }),
      OnlineUser.deleteMany({ companyId }),
      Leave.deleteMany({ companyId }),
      LeaveHistory.deleteMany({ companyId }),
      TimeRequest.deleteMany({ companyId }),
      Compoff.deleteMany({ companyId }),
    ]);

    return successResponse(res, 'Company deleted successfully', null);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

const getUserRoles = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return validationError(res, 'User not found');
    }

    let roles = [];

    if (user.role === constants.ROLE.COMPANY_ADMIN) {
      roles.push(constants.ROLE.HR, constants.ROLE.PROJECT_MANAGER, constants.ROLE.EMPLOYEE);
    } else if (user.role === constants.ROLE.HR) {
      roles.push(constants.ROLE.EMPLOYEE, constants.ROLE.PROJECT_MANAGER);
    } else if (user.role === constants.ROLE.PROJECT_MANAGER) {
      roles.push(constants.ROLE.EMPLOYEE);
    } else {
      roles.push(constants.ROLE.COMPANY_ADMIN);
    }

    return successResponse(res, 'User roles retrieved successfully', roles);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

export default {
  addUserAndCompany,
  getCompanies,
  getUsers,
  getUsersList,
  editUserAndCompany,
  deleteUser,
  deleteCompany,
  getUserRoles,
};
