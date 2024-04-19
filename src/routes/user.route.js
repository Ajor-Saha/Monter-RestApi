import express from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
} from "../controllers/user.controller.js";

// Create a router instance
const router = express.Router();

// Define routes
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);

export default router;
