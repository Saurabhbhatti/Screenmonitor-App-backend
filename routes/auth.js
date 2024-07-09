import express from "express";
import {
  login,
  registerAdmin,
} from "../controllers/auth.js";

const router = express.Router();

router.post("/registeradmin", registerAdmin);
router.post("/login", login);

export default router;
