import express from "express";
import {
  addProject,
  deleteProject,
  editProject,
  getProject,
  changeStatus
} from "../controllers/ProjectController.js";
import authenticate from "../middleware/verifyAuth.js";

const router = express.Router();

router.post("/add_project", authenticate, addProject);
router.post("/edit_project", authenticate, editProject);
router.get("/list_project", authenticate, getProject);
router.delete("/delete_project", authenticate, deleteProject);
router.post("/status", authenticate, changeStatus);
export default router;
