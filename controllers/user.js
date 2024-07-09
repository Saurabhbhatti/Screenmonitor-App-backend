import bcrypt from "bcryptjs";
import {
  errorResponse,
  successResponse,
  successResponseDataWithfilters,
  validationError,
} from "../helpers/api-responses.js";
import { active, role_uers } from '../helpers/variables.js';
import { generatePassword, getUserId, sendEmail, validateEmail, validatePhoneNumber } from "../helpers/utils.js";
import User from "../models/User.js";
import Timer from "../models/Timer.js";
import { getUserActivity } from '../helpers/userUtils.js';

// Add User
const addUser = async (req, res) => {
  try {
    const { first_name, last_name, company_name, member_type, projects, email, phone, status } = req.body;

    const userId = await getUserId(req);
    const isUser = await User.findById(userId);
    if (!isUser) {
      return validationError(res, "User not found");
    }

    // Assign user role from predefined variables
    const role = role_uers;

    // Check if a user with the same email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return validationError(res, "User with this email already exists");
    }

    // Validate email format
    if (!validateEmail(email)) {
      return validationError(res, "Email is Invalid");
    }

    // Validate phone number format
    if (!validatePhoneNumber(phone)) {
      return validationError(res, "Phone Number is Invalid");
    }

    // Generate a random password for the new user
    const password = generatePassword();

    // Send a welcome email with user details
    const userData = { first_name, email, password };
    sendEmail(email, "Greetings!", userData);

    // Encrypt the password using bcrypt
    const encryptedPassword = await bcrypt.hash(password, 10);

    // Create a new User instance and save it to the database
    const user = new User({
      first_name,
      last_name,
      company_name,
      member_type,
      projects,
      email,
      password: encryptedPassword,
      phone,
      status,
      role,
    });
    await user.save();

    return successResponse(res, "User added successfully", user);
  } catch (error) {
    return validationError(res, error.message);
  }
};

// Get Users
const getUsers = async (req, res) => {
  const limit = parseInt(req.query.limit);
  const offset = parseInt(req.query.offset);
  const name = req.query.name;
  const status = req.query.status;

  let totalUsers;
  try {
    const userId = await getUserId(req);
    const isUser = await User.findById(userId);
    if (!isUser) {
      return validationError(res, "User not found");
    }
    // Initialize filter object with user role condition
    let filter = { role: role_uers };

    // Add name filter if provided
    if (name) {
      filter.first_name = { $regex: new RegExp(name, "i") };
    }

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    // Count total users matching the filter
    totalUsers = await User.countDocuments(filter);

    let users;
    if (isUser.role === role_uers) {
      // Fetch a single user by ID and role
      const user = await User.findOne({ _id: userId, role: role_uers });
      if (!user) {
        return errorResponse(res, "User not found");
      }
      users = [user];
    } else {
      // Fetch users based on filter, pagination, and sorting
      users = await User.find(filter)
        .limit(limit)
        .skip((offset - 1) * limit)
        .sort({ createdAt: -1 });
    }

    // Adjust totalUsers when fewer results than limit are available
    if (totalUsers < limit && offset > 1) {
      totalUsers = 0;
    }

    if (users) {
      successResponseDataWithfilters(res, "Users found successfully", totalUsers, users);
    }
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Edit User
const editUser = async (req, res) => {
  try {
    const { id, first_name, last_name, company_name, member_type, projects, email, phone, status } = req.body;

    const userId = await getUserId(req);
    const isUser = await User.findById(userId);
    if (!isUser) {
      return validationError(res, "User not found");
    }

    // Retrieve user by ID
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return errorResponse(res, "User not found");
    }

    // Define update query with optional fields
    const updateUserQuery = [
      { _id: id },
      {
        $set: {
          first_name: first_name === "" ? "" : first_name ? first_name : user.first_name,
          last_name: last_name === "" ? "" : last_name ? last_name : user.last_name,
          company_name: company_name === "" ? "" : company_name ? company_name : user.company_name,
          member_type: member_type === "" ? "" : member_type ? member_type : user.member_type,
          projects: Array.isArray(projects) ? projects : [projects],
          email: email === "" ? "" : email ? email : user.email,
          phone: phone === "" ? "" : phone ? phone : user.phone,
          status: status === "" ? "" : status ? status : user.status,
        },
      },
      { new: true },
    ];

    // Execute update query and retrieve updated user
    const updateUser = await User.findOneAndUpdate(...updateUserQuery);

    // Remove sensitive data from response
    updateUser.password = undefined;
    updateUser.__v = undefined;

    const response = { ...updateUser._doc };
    return successResponse(res, "User updated successfully", response);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Delete User
const deleteUser = async (req, res) => {
  try {
    const { id } = req.body;

    const userId = await getUserId(req);
    const isUser = await User.findById(userId);
    if (!isUser) {
      return validationError(res, "User not found");
    }

    // Find user by ID and delete from database
    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, "User not found in the database");
    }
    await User.findOneAndDelete({ _id: id });

    return successResponse(res, "User deleted successfully", null);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Active Users and Projects
const activeUserAndProject = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const isUser = await User.findById(userId);
    if (!isUser) {
      return validationError(res, "User not found");
    }
    // Function to fetch counts of unique users and projects within a date range
    const getDateRangeCount = async (startDate, endDate) => {
      if (isUser.role === 'admin') {
        const userCount = await Timer.distinct("userId", {
          createdAt: { $gte: startDate, $lt: endDate }
        });
        const projectCount = await Timer.distinct("projectId", {
          createdAt: { $gte: startDate, $lt: endDate }
        });
        return { userCount: userCount.length, projectCount: projectCount.length };
      } else {
        const userCount = await Timer.distinct("userId", {
          createdAt: { $gte: startDate, $lt: endDate },
          userId: isUser._id
        });
        const projectCount = await Timer.distinct("projectId", {
          createdAt: { $gte: startDate, $lt: endDate },
          userId: isUser._id
        });
        return { userCount: userCount.length, projectCount: projectCount.length };
      }
    };

    // Initialize dates for today, start of week, and start of month
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Fetch counts for today, this week, and this month using date range function
    const [todayCount, thisWeekCount, thisMonthCount] = await Promise.all([
      getDateRangeCount(today, new Date(today.getTime() + 24 * 60 * 60 * 1000)),
      getDateRangeCount(startOfWeek, new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)),
      getDateRangeCount(startOfMonth, endOfMonth)
    ]);

    // Prepare response with counts for today, this week, and this month
    const response = {
      today: todayCount,
      thisWeek: thisWeekCount,
      thisMonth: thisMonthCount
    };

    return successResponse(res, "Data fetch successfully", response);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Total Users Activity
const totalUsersActivity = async (req, res) => {
  try {
  
    const userId = await getUserId(req);
    const isUser = await User.findById(userId);
    if (!isUser) {
      return validationError(res, "User not found");
    }

    // Extract query parameters for timeframe, pagination, and search
    let timeFrame = req.query.timeframe;
    let page = parseInt(req.query.offset) || 1; // Default to page 1
    let limit = parseInt(req.query.limit) || 10; // Default limit to 10 records per page
    let search = req.query.search;
    const startTime = req.query.startTime;
    const endTime = req.query.endTime;

    let usersWithTotalTime;

    // Fetch user activity based on timeframe and optional user
    if (isUser.role === 'admin') {
      usersWithTotalTime = await getUserActivity(timeFrame, startTime, endTime);
    } else {
      usersWithTotalTime = await getUserActivity(timeFrame, startTime, endTime, isUser);
    }

    // Filter results by name if search parameter is provided
    if (search) {
      usersWithTotalTime = usersWithTotalTime.filter(user =>
        user.first_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Calculate total records and pagination details
    const totalRecords = usersWithTotalTime.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const results = usersWithTotalTime.slice(startIndex, endIndex);

    // Return success response with paginated results and metadata
    return successResponse(res, "User activity retrieved successfully", {
      results,
      totalPages,
      currentPage: page,
      totalRecords
    });
  } catch (error) {
    return errorResponse(res, "Invalid Data");
  }
};

// Change User Status
const changeStatus = async (req, res) => {
  try {
    const { id, status } = req.body;

    const userId = await getUserId(req);
    const isUser = await User.findById(userId);
    if (!isUser) {
      return validationError(res, "User not found");
    }

    // Retrieve user by ID
    const user = await User.findOne({ _id: id });
    if (!user) {
      return errorResponse(res, "User not found");
    }

    if (!status) {
      return errorResponse(res, "Status not found");
    }
    if (status !== "active" && status !== "inactive") {
      return errorResponse(res, "Status must be either active or inactive");
    }

    // Define update query to change user status
    const updateStatusQuery = [
      { _id: id },
      {
        $set: {
          status: status === "" ? "" : status ? status : user.status,
        },
      },
      { new: true },
    ];

    // Execute update query and retrieve updated user
    const updateUser = await User.findOneAndUpdate(...updateStatusQuery);

    // Prepare response with updated user status
    const response = {
      id: updateUser._id,
      status: updateUser.status
    };

    return successResponse(res, "Status updated successfully", response);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

export default {
  addUser,
  getUsers,
  editUser,
  deleteUser,
  activeUserAndProject,
  totalUsersActivity,
  changeStatus
};
