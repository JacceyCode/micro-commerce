import { NextFunction, Request, Response } from "express";
import {
  checkOtpRestrictions,
  handleForgotPassword,
  sendOtp,
  trackOtpRequests,
  validateRegistrationData,
  verifyOtp,
} from "../utils/auth.helper";
import prisma from "@packages/libs/prisma";
import { AuthError, ValidationError } from "@packages/error-handler";
import bcrypt from "bcryptjs";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import { setCookie } from "../utils/cookies/setCookie";

// Register a new user
export const userRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    validateRegistrationData(req.body, "user");
    const { name, email } = req.body;

    // Check for exiting user
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ValidationError("User already exists with this email!");
    }

    // Verify account OTP status
    await checkOtpRestrictions(email);

    // Track account OTP requests
    await trackOtpRequests(email);

    // Send OTP
    await sendOtp(name, email, "user-activation-mail");

    res.status(200).json({
      message: "OTP sent to email. Please verify your account.",
    });
  } catch (error) {
    next(error);
  }
};

// verify user with otp
export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, otp, password } = req.body;

    if (!name || !email || !otp || !password) {
      throw new ValidationError("All fields are required!");
    }

    const existingUser = await prisma.users.findUnique({ where: { email } });

    if (existingUser) {
      throw new ValidationError("User already exists with this email!");
    }

    // Verify otp
    await verifyOtp(email, otp);

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user object to db
    await prisma.users.create({
      data: { name, email, password: hashedPassword },
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully!",
    });
  } catch (error) {
    next(error);
  }
};

// Login user
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError("Email and password are required!");
    }

    // Verify user exists
    const user = await prisma.users.findUnique({ where: { email } });

    if (!user) {
      throw new AuthError("Invalid email or password!");
    }

    // verify password
    const passwordMatch = await bcrypt.compare(password, user?.password!);

    if (!passwordMatch) throw new AuthError("Invalid email or password!");

    // Generate access and refresh token
    const accessToken = jwt.sign(
      { id: user?.id, role: "user" },
      process.env.JWT_ACCESS_TOKEN_SECRET as string,
      {
        expiresIn: "15m",
      }
    );
    const refreshToken = jwt.sign(
      { id: user?.id, role: "user" },
      process.env.JWT_REFRESH_TOKEN_SECRET as string,
      {
        expiresIn: "7d",
      }
    );

    // store the tokens in an httpOnly secure cookie
    setCookie(res, "mico_refresh_token", refreshToken);
    setCookie(res, "mico_access_token", accessToken);

    res.status(200).json({
      message: "Login successful!",
      user: { id: user?.id, email: user?.email, name: user?.name },
    });
  } catch (error) {
    next(error);
  }
};

// refresh token user
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { mico_refresh_token } = req.cookies;

    if (!mico_refresh_token) {
      throw new ValidationError("Unauthorized! No refresh token.");
    }

    // Verify refresh token
    const decoded = jwt.verify(
      mico_refresh_token,
      process.env.JWT_REFRESH_TOKEN_SECRET as string
    ) as { id: string; role: string };

    if (!decoded || !decoded.id || !decoded.role) {
      throw new JsonWebTokenError("Forbidden! Invalid refresh token.");
    }

    // Check if user exists
    // let user;
    // if (decoded.role === "user") {
    const user = await prisma.users.findUnique({ where: { id: decoded.id } });

    if (!user) {
      throw new AuthError(`Forbidden! ${decoded.role} not found!`);
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { id: decoded.id, role: decoded.role },
      process.env.JWT_ACCESS_TOKEN_SECRET as string,
      {
        expiresIn: "15m",
      }
    );

    // Set new access token in cookie
    setCookie(res, "mico_access_token", accessToken);

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// Get logged in user
export const getUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = req.user; // user is set by isAuthenticated middleware

    if (!user) {
      throw new AuthError("User not found!");
    }

    user.password = undefined; // Remove password from response

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Forgot password
export const userForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    if (!email) throw new ValidationError("Email not provided!");

    await handleForgotPassword(email, "user");

    res.status(200).json({
      message: "OTP sent to email. Please verify your account",
    });
  } catch (error) {
    next(error);
  }
};

// Verify forgot password OTP
export const verifyForgotPasswordOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new ValidationError("Email and OTP are required!");
    }

    await verifyOtp(email, otp);

    res.status(200).json({
      message: "OTP verified. You can now reset your password.",
    });
  } catch (error) {
    next(error);
  }
};

// Reset user Password
export const resetUserPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      throw new ValidationError("Email and new password are required!");
    }

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      throw new ValidationError("Invalid user!");
    }

    // compare new and old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password!);

    if (isSamePassword) {
      throw new ValidationError("New password cannot be same as old password!");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    await prisma.users.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // Clear cookies if any
    res.clearCookie("mico_refresh_token");
    res.clearCookie("mico_access_token");

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};
