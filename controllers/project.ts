import { Request, Response } from 'express';
import { errorResponse, successResponse, successResponseWithPagination, validationError } from '../helpers/api-responses';
import { User, Project, UserProject } from '../models';
import utils from '../helpers/utils';
import { calculateTotalWorkingHours, getProjectData } from '../helpers/projectUtils';
import constants from '../helpers/constants';
import { AddEditProjectResponse, FilterOptions } from '../types/project';
import { PipelineStage } from 'mongoose';

// Add Project
const addProject = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return validationError(res, 'User not found');
    }

    if (user.role === constants.ROLE.HR || user.role === constants.ROLE.EMPLOYEE) {
      return validationError(res, 'You are not authorized to add project');
    }

    const { projectName, isScreenshot, notes, memberIds } = req.body;

    if (!projectName) {
      return validationError(res, 'Project name is required');
    }

    const existingProject = await Project.findOne({ projectName });
    if (existingProject) {
      return validationError(res, 'Project already exists');
    }

    const newProject = new Project({
      projectName,
      isScreenshot,
      notes,
      companyId: user.companyId,
    });
    await newProject.save();

    if (memberIds.length > 0) {
      const userProject = memberIds.map((id: string) => ({
        updateOne: {
          filter: { userId: id, companyId: user.companyId },
          update: { $addToSet: { projectIds: newProject._id } },
          upsert: true,
        },
      }));

      await UserProject.bulkWrite(userProject);
    }

    // Fetch member details
    const members = await User.find({ _id: { $in: memberIds } }, { _id: 1, firstName: 1, lastName: 1, email: 1 });

    // Calculate total working hours
    const totalWorkingHours = await calculateTotalWorkingHours(newProject._id);

    // Prepare the response data
    const responseData: AddEditProjectResponse = {
      _id: newProject._id,
      projectName: newProject.projectName,
      status: newProject.status,
      isScreenshot: newProject.isScreenshot,
      notes: newProject.notes,
      companyId: newProject.companyId,
      members,
      totalWorkingHours,
      createdAt: newProject.createdAt || new Date(),
      updatedAt: newProject.updatedAt || new Date(),
    };

    // Send success response
    return successResponse(res, 'Project created successfully', responseData);
  } catch (error: any) {
    return errorResponse(res, `Failed to add project: ${error.message}`);
  }
};

// Get Projects
const getProject = async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const offset = parseInt(req.query.offset as string, 10) || 1;

  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return validationError(res, 'User not found');
    }

    const { memberIds, projectIds, search, status } = req.body;

    let filterOptions: FilterOptions = { companyId: user.companyId };

    if (user.role === constants.ROLE.EMPLOYEE) {
      const userProjects = await UserProject.find({ userId }, 'projectIds');
      filterOptions.projectIds = userProjects.flatMap(up => up.projectIds);
      if (filterOptions.projectIds.length === 0) {
        return successResponseWithPagination(res, 'Projects found successfully', 0, []);
      }
    } else {
      filterOptions.projectIds = projectIds;
      filterOptions.memberIds = memberIds;
    }

    const { projects, totalProjects } = await getProjectData(search, status, limit, offset, filterOptions);

    return successResponseWithPagination(res, 'Projects found successfully', totalProjects, projects);
  } catch (error: any) {
    return errorResponse(res, `Failed to fetch projects: ${error.message}`);
  }
};

// Edit Project
const editProject = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return validationError(res, 'User not found');
    }

    if (user.role === constants.ROLE.EMPLOYEE || user.role === constants.ROLE.HR) {
      return validationError(res, 'You are not authorized to edit project');
    }

    const { projectId, projectName, status, isScreenshot, notes, memberIds, isMemberIdsChange } = req.body;

    if (!projectId) {
      return validationError(res, 'Project ID is required');
    }

    const existingProject = await Project.findById(projectId);
    if (!existingProject) {
      return errorResponse(res, 'Project not found');
    }

    // Update the project fields
    existingProject.projectName = projectName ?? existingProject.projectName;
    existingProject.status = status ?? existingProject.status;
    existingProject.isScreenshot = isScreenshot ?? existingProject.isScreenshot;
    existingProject.notes = notes ?? existingProject.notes;

    // Save the updated project
    await existingProject.save();

    if (isMemberIdsChange) {
      // Step 1: Update existing UserProject documents for provided memberIds
      if (memberIds.length > 0) {
        await UserProject.updateMany({ userId: { $in: memberIds } }, { $addToSet: { projectIds: projectId } });

        // Step 2: Remove projectId from UserProject documents for users not in memberIds
        await UserProject.updateMany(
          {
            userId: { $nin: memberIds },
            projectIds: projectId,
          },
          { $pull: { projectIds: projectId } },
        );
      } else {
        // If memberIds is empty, remove projectId from all UserProject documents
        await UserProject.updateMany({ projectIds: projectId }, { $pull: { projectIds: projectId } });
      }
    }

    // Fetch member details
    const members = await User.find({ _id: { $in: memberIds } }, { _id: 1, firstName: 1, lastName: 1, email: 1 });

    // Calculate total working hours
    const totalWorkingHours = await calculateTotalWorkingHours(existingProject._id);

    // Format the response data
    const responseData: AddEditProjectResponse = {
      _id: existingProject._id,
      projectName: existingProject.projectName,
      status: existingProject.status,
      isScreenshot: existingProject.isScreenshot,
      notes: existingProject.notes,
      companyId: existingProject.companyId,
      members,
      totalWorkingHours,
      createdAt: existingProject.createdAt || new Date(),
      updatedAt: existingProject.updatedAt || new Date(),
    };

    return successResponse(res, 'Project updated successfully', responseData);
  } catch (error: any) {
    return errorResponse(res, `Failed to update project: ${error.message}`);
  }
};

// Delete Project
const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return validationError(res, 'User not found');
    }

    if (user.role === constants.ROLE.EMPLOYEE || user.role === constants.ROLE.HR) {
      return validationError(res, 'You are not authorized to delete project');
    }

    const { id } = req.body;

    const deletedProject = await Project.findByIdAndDelete(id);
    if (!deletedProject) {
      return errorResponse(res, 'Project not found');
    }

    return successResponse(res, 'Project deleted successfully', null);
  } catch (error: any) {
    return errorResponse(res, `Failed to delete project: ${error.message}`);
  }
};

const getProjectsByName = async (req: Request, res: Response) => {
  try {
    const userId = await utils.getUserId(req);
    const user = await User.findById(userId);

    if (!user) {
      return validationError(res, 'User not found');
    }

    const { app } = req.query;

    const activeStatus = constants.STATUS.ACTIVE;

    let matchCondition = {};

    if (user.role === constants.ROLE.COMPANY_ADMIN || user.role === constants.ROLE.HR || user.role === constants.ROLE.PROJECT_MANAGER) {
      if (app === 'desktop') {
        // only get the projects assigned to the user
        const userProjects = await UserProject.find({ userId }, { projectIds: 1 });
        const assignedProjectIds = userProjects.flatMap(up => up.projectIds);
        matchCondition = { _id: { $in: assignedProjectIds }, status: activeStatus };
      } else {
        // CA/HR?PM: Get all active projects
        matchCondition = { status: activeStatus };
      }
    } else {
      // Regular User: Get only the assigned active projects for the user
      const userProjects = await UserProject.find({ userId: userId }, { projectIds: 1 });
      const assignedProjectIds = userProjects.flatMap(up => up.projectIds);
      matchCondition = { _id: { $in: assignedProjectIds }, status: activeStatus };
    }

    const projectsWithMembers: PipelineStage[] = await Project.aggregate([
      // Match the projects based on the condition
      { $match: matchCondition },

      // Lookup to join with UserProject to get the user IDs associated with the project
      {
        $lookup: {
          from: 'userprojects',
          localField: '_id',
          foreignField: 'projectIds',
          as: 'userProjects',
        },
      },

      // Unwind the userProjects array to normalize the data
      { $unwind: { path: '$userProjects', preserveNullAndEmptyArrays: true } },

      // Lookup to get user details based on user IDs
      {
        $lookup: {
          from: 'users',
          localField: 'userProjects.userId',
          foreignField: '_id',
          as: 'members',
          pipeline: [{ $project: { _id: 1, firstName: 1, lastName: 1 } }],
        },
      },

      // Group back the results to accumulate members for each project
      {
        $group: {
          _id: '$_id',
          projectName: { $first: '$projectName' },
          isScreenshot: { $first: '$isScreenshot' },
          members: { $push: { $arrayElemAt: ['$members', 0] } },
        },
      },

      // Filter out any null values and ensure members is always an array
      {
        $addFields: {
          members: {
            $filter: {
              input: '$members',
              as: 'member',
              cond: { $ne: ['$$member', null] },
            },
          },
        },
      },
      // Sort by projectName in ascending order
      { $sort: { projectName: 1 } },
    ]);

    return successResponse(res, 'Projects retrieved successfully', projectsWithMembers);
  } catch (error: any) {
    return errorResponse(res, `Failed to retrieve projects: ${error.message}`);
  }
};

export default { addProject, getProject, editProject, deleteProject, getProjectsByName };
