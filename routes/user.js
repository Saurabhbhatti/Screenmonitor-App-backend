import express from "express";
import {
  addUser,
  deleteUser,
  editUser,
  getUsers,
  activeUserAndProject,
  totalUsersActivity,
  changeStatus,
} from "../controllers/user.js";
import authenticate from "../middleware/verifyAuth.js";


const router = express.Router();

router.post("/add", authenticate, addUser);
router.post("/edit", authenticate, editUser);
router.get("/list", authenticate, getUsers);
router.delete("/delete", authenticate, deleteUser);
router.get('/active_users_projects',authenticate,activeUserAndProject);
router.get('/activity',authenticate,totalUsersActivity)
router.post("/status", authenticate, changeStatus);

export default router;
