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
  sellerRegistration,
  verifySeller,
  createShop,
  createStripeConnectLink,
  loginSeller,
  getSeller,
} from "../controllers/auth.controller";
import isAuthenticated from "@packages/middleware/isAuthenticated";
import { isSeller } from "@packages/middleware/authorizeRoles";

const router: Router = express.Router();

router.get("/logged-in-user", isAuthenticated, getUser);
router.get("/logged-in-seller", isAuthenticated, isSeller, getSeller);
router.post("/user-registration", userRegistration);
router.post("/verify-user", verifyUser);
router.post("/login-user", loginUser);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password-user", userForgotPassword);
router.post("/verify-forgot-password-user", verifyForgotPasswordOtp);
router.post("/reset-forgot-password-user", resetUserPassword);
router.post("/seller-registration", sellerRegistration);
router.post("/verify-seller", verifySeller);
router.post("/create-shop", createShop);
router.post("/create-stripe-link", createStripeConnectLink);
router.post("/login-seller", loginSeller);

export default router;
