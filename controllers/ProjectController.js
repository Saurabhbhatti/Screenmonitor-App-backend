import {
  errorResponse,
  successResponse,
  validationError,
} from "../helpers/api-responses.js";
import Project from "../models/Project.js";
import { active } from "../helpers/variables.js";

const addProject = async (req, res) => {
  try {
    const { projectName } = req.body;

    if (!projectName) {
      return validationError(res, "Project name is required");
    }

    let projectExists = await Project.findOne({ projectName });
    if (projectExists) {
      return validationError(res, "Project already exists");
    }

    const newProject = new Project({
      projectName,
      active,
    });

    await newProject.save();

    return successResponse(res, "Project added successfully", newProject);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getProject = async (req, res) => {
  const limit = parseInt(req.query.limit);
  const offset = parseInt(req.query.offset);
  const search = req.query.search || "";
  const status = req.query.status;

  try {
    const filter = {
      projectName: { $regex: new RegExp(search, "i") },
      ...(status ? { status } : {})
    };

    const totalProjects = await Project.countDocuments(filter);

    if (totalProjects === 0) {
      return successResponse(res, "No projects found", {
        projects: [],
        totalPages: 0,
        currentPage: offset,
        totalRecords: 0,
      });
    }

    const projects = await Project.find(filter)
      .limit(limit)
      .skip((offset - 1) * limit)
      .sort({ createdAt: -1 });

    const totalPages = limit > 0 ? Math.ceil(totalProjects / limit) : 1;

    const responseData = {
      projects,
      totalPages,
      currentPage: offset,
      totalRecords: totalProjects,
    };

    return successResponse(res, "Projects found successfully", responseData);

  } catch (error) {
    return errorResponse(res, `Failed to fetch projects: ${error.message}`);
  }
};

const editProject = async (req, res) => {
  try {
    const { id, projectName, status } = req.body;

    const existingProject = await Project.findById(id);
    if (!existingProject) {
      return errorResponse(res, "Project not found");
    }

    existingProject.projectName = projectName;
    existingProject.status = status;

    await existingProject.save();

    return successResponse(res, "Project updated successfully", {
      project: existingProject,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const deleteProject = async (req, res) => {
  try {
    const { id } = req.body;

    const deletedProject = await Project.findByIdAndDelete(id);
    if (!deletedProject) {
      return errorResponse(res, "Project not found");
    }

    return successResponse(res, "Project deleted successfully", null);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const changeStatus = async (req,res) =>{
  try {
    const { id, status } = req.body;
    const projectId = id;
    const project = await Project.findOne({ _id: id });
    if (!project) {
      return errorResponse(res, "project not found");
    }
    if(!status){
      return errorResponse(res, "status not found");
    }
    if (status !== "active" && status !== "inactive") {
      return errorResponse(res, "status must be either active or inactive");
    }
    const updateStatusQuery = [
      { _id: projectId },
      {
        $set: {
          status: status === "" ? "" : status ? status : project.status,
        },
      },
      { new: true },
    ];
    const updateProject = await Project.findOneAndUpdate(...updateStatusQuery);
    const response = {
      id: updateProject._id,
      status: updateProject.status
    };
    return successResponse(res, "status updated successfully", response);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}


export { addProject, getProject, editProject, deleteProject, changeStatus };
