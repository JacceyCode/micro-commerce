import express, { Router } from "express";
import {
  userRegistration,
  verifyUser,
  loginUser,
  userForgotPassword,
  resetUserPassword,
  verifyForgotPasswordOtp,
} from "../controllers/auth.controller";

const router: Router = express.Router();

router.post("/user-registration", userRegistration);
router.post("/verify-user", verifyUser);
router.post("/login-user", loginUser);
router.post("/forgot-password-user", userForgotPassword);
router.post("/reset-forgot-password-user", resetUserPassword);
router.post("/verify-forgot-password-user", verifyForgotPasswordOtp);

export default router;
