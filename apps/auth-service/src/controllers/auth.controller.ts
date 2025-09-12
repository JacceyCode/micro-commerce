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
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

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

    console.log("user ====", user);

    if (!user) {
      throw new AuthError("Invalid email or password!");
    }

    // verify password
    const passwordMatch = await bcrypt.compare(password, user?.password!);

    if (!passwordMatch) throw new AuthError("Invalid email or password!");

    res.clearCookie("mico_seller_access_token");
    res.clearCookie("mico_seller_refresh_token");

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
    // const { mico_refresh_token } = req.cookies;
    const refreshToken =
      req.cookies.mico_refresh_token ||
      req.cookies.mico_seller_refresh_token ||
      req.headers.authorization?.split(" ")[1];

    if (!refreshToken) {
      throw new ValidationError("Unauthorized! No refresh token.");
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET as string
    ) as { id: string; role: string };

    if (!decoded || !decoded.id || !decoded.role) {
      throw new JsonWebTokenError("Forbidden! Invalid refresh token.");
    }

    // Check if user exists
    let account;
    if (decoded.role === "user") {
      account = await prisma.users.findUnique({ where: { id: decoded.id } });
    } else if (decoded.role === "seller") {
      account = await prisma.sellers.findUnique({
        where: { id: decoded.id },
        include: { shop: true },
      });
    }

    if (!account) {
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

    if (decoded.role === "user") {
      setCookie(res, "mico_access_token", accessToken);
    } else if (decoded.role === "seller") {
      setCookie(res, "mico_seller_access_token", accessToken);
    }

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

// Register a new seller
export const sellerRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    validateRegistrationData(req.body, "seller");
    const { name, email } = req.body;

    // Check for exiting seller
    const existingSeller = await prisma.sellers.findUnique({
      where: { email },
    });

    if (existingSeller) {
      throw new ValidationError("Seller already exists with this email!");
    }

    // Verify account OTP status
    await checkOtpRestrictions(email);

    // Track account OTP requests
    await trackOtpRequests(email);

    // Send OTP
    await sendOtp(name, email, "seller-activation-mail");

    res.status(200).json({
      message: "OTP sent to email. Please verify your account.",
    });
  } catch (error) {
    next(error);
  }
};

// verify seller with otp
export const verifySeller = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, otp, password, phone_number, country } = req.body;

    if (!name || !email || !otp || !password || !phone_number || !country) {
      throw new ValidationError("All fields are required!");
    }

    const existingSeller = await prisma.sellers.findUnique({
      where: { email },
    });

    if (existingSeller) {
      throw new ValidationError("Seller already exists with this email!");
    }

    // Verify otp
    await verifyOtp(email, otp);

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save seller object to db
    const seller = await prisma.sellers.create({
      data: { name, email, password: hashedPassword, phone_number, country },
    });

    res.status(201).json({
      seller: seller.id,
      message: "Seller registered successfully!",
    });
  } catch (error) {
    next(error);
  }
};

// Create a new shop for seller
export const createShop = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, bio, address, opening_hours, website, category, sellerId } =
      req.body;

    if (!sellerId || !name || !bio || !address || !opening_hours || !category) {
      throw new ValidationError("All fields are required!");
    }

    const shopData: any = {
      name,
      bio,
      address,
      opening_hours,
      category,
      sellerId,
    };

    if (website && website.trim() !== "") {
      shopData.website = website;
    }

    // Create shop
    const shop = await prisma.shops.create({
      data: shopData,
    });

    res.status(201).json({
      success: true,
      shop,
    });
  } catch (error) {
    next(error);
  }
};

// Create a stripe connect account link for seller
export const createStripeConnectLink = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sellerId } = req.body;

    if (!sellerId) {
      throw new ValidationError("Seller ID is required!");
    }

    const seller = await prisma.sellers.findUnique({ where: { id: sellerId } });

    if (!seller) {
      throw new ValidationError(
        `Seller is not available with this id ${sellerId}!`
      );
    }

    const account = await stripe.accounts.create({
      type: "express",
      email: seller?.email,
      country: "US",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    await prisma.sellers.update({
      where: { id: seller.id },
      data: { stripeId: account.id },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `http://localhost:3000/signup?active_step=3`,
      return_url: `http://localhost:3000/success`,
      type: "account_onboarding",
    });

    res.json({ url: accountLink.url });
  } catch (error) {
    next(error);
  }
};

// Login seller
export const loginSeller = async (
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
    const seller = await prisma.sellers.findUnique({ where: { email } });

    if (!seller) {
      throw new AuthError("Invalid email or password!");
    }

    // verify password
    const passwordMatch = await bcrypt.compare(password, seller?.password!);

    if (!passwordMatch) throw new AuthError("Invalid email or password!");

    res.clearCookie("mico_access_token");
    res.clearCookie("mico_refresh_token");

    // Generate access and refresh token
    const accessToken = jwt.sign(
      { id: seller?.id, role: "seller" },
      process.env.JWT_ACCESS_TOKEN_SECRET as string,
      {
        expiresIn: "15m",
      }
    );
    const refreshToken = jwt.sign(
      { id: seller?.id, role: "seller" },
      process.env.JWT_REFRESH_TOKEN_SECRET as string,
      {
        expiresIn: "7d",
      }
    );

    // store the tokens in an httpOnly secure cookie
    setCookie(res, "mico_seller_refresh_token", refreshToken);
    setCookie(res, "mico_seller_access_token", accessToken);

    res.status(200).json({
      message: "Login successful!",
      seller: { id: seller?.id, email: seller?.email, name: seller?.name },
    });
  } catch (error) {
    next(error);
  }
};

// Get logged in seller
export const getSeller = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const seller = req.seller; // seller is set by isAuthenticated middleware

    if (!seller) {
      throw new AuthError("seller not found!");
    }

    seller.password = undefined; // Remove password from response

    res.status(200).json({
      success: true,
      seller,
    });
  } catch (error) {
    next(error);
  }
};
