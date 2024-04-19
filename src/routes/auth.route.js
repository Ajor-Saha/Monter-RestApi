import express from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  verifyOTP,
} from "../controllers/auth.controller.js";

import { verifyJWT } from "../middleware/auth.middleware.js";

// Create a router instance
const router = express.Router();

// Define routes
router.route("/register").post(registerUser);
router.route("/verify").post(verifyOTP);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT,logoutUser);

export default router;
