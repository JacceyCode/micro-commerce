import express, { Router } from "express";
import {
  userRegistration,
  verifyUser,
  loginUser,
  userForgotPassword,
  resetUserPassword,
  verifyForgotPasswordOtp,
  refreshToken,
  getUser,
} from "../controllers/auth.controller";
import isAuthenticated from "@packages/middleware/isAuthenticated";

const router: Router = express.Router();

router.get("/logged-in-user", isAuthenticated, getUser);
router.post("/user-registration", userRegistration);
router.post("/verify-user", verifyUser);
router.post("/login-user", loginUser);
router.post("/refresh-token-user", refreshToken);
router.post("/forgot-password-user", userForgotPassword);
router.post("/verify-forgot-password-user", verifyForgotPasswordOtp);
router.post("/reset-forgot-password-user", resetUserPassword);

export default router;
