import express from "express";
import { registerUser, verifyOTP } from "../controllers/auth.controller.js";

// Create a router instance
const router = express.Router();

// Define routes
router.route("/register").post(registerUser);
router.route("/verify").post(verifyOTP);

export default router;
