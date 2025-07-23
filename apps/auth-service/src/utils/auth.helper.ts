import crypto from "crypto";
import { ValidationError } from "@packages/error-handler";
import { NextFunction } from "express";
import redis from "@packages/libs/redis";
import { sendEmail } from "./sendMail";
import prisma from "@packages/libs/prisma";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegistrationData = (
  data: any,
  userType: "user" | "seller"
) => {
  const { name, email, password, phone_number, country } = data;

  if (
    !name ||
    !email ||
    !password ||
    (userType === "seller" && (!phone_number || !country))
  ) {
    throw new ValidationError(`Missing required fields!`);
  }

  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format!");
  }
};

export const checkOtpRestrictions = async (
  email: string,
  next: NextFunction
) => {
  if (await redis.get(`otp_lock:${email}`)) {
    return next(
      new ValidationError(
        "Account locked due to multiple failed attempts! Try again after 30 minutes."
      )
    );
  }

  if (await redis.get(`otp_spam_lock:${email}`)) {
    return next(
      new ValidationError(
        "Too many OTP requests! Please wait 1hour before requesting again."
      )
    );
  }

  if (await redis.get(`otp_cooldown:${email}`)) {
    return next(
      new ValidationError("Please wait 1minute before requesting a new OTP!")
    );
  }
};

export const trackOtpRequests = async (email: string, next: NextFunction) => {
  const otpRequestKey = `otp_request_count:${email}`;
  let otpRequests = parseInt((await redis.get(otpRequestKey)) || "0");

  if (otpRequests >= 2) {
    await redis.set(`otp_spam_lock:${email}`, "locked", "EX", 3600); // Lock for 1hour
    return next(
      new ValidationError(
        "Too many OTP requests! Please wait 1hour before requesting again."
      )
    );
  }

  await redis.set(otpRequestKey, otpRequests + 1, "EX", 3600);
};

export const sendOtp = async (
  name: string,
  email: string,
  template: string
) => {
  const otp = crypto.randomInt(1001, 9999).toString();

  // Send email
  await sendEmail(email, "Verify Your Email", template, { name, otp });

  // Save OTP to redis(upstash)
  await redis.set(`otp:${email}`, otp, "EX", 300);

  // Save OTP interval to redis(upstash)
  await redis.set(`otp_cooldown:${email}`, "true", "EX", 60);
};

export const verifyOtp = async (email: string, otp: string) => {
  const storedOtp = await redis.get(`otp:${email}`);
  if (!storedOtp) {
    throw new ValidationError("Invalid or expired OTP!");
  }

  const failedOtpAttemptsKey = `otp_attempts:${email}`;
  const failedOtpAttempts = parseInt(
    (await redis.get(failedOtpAttemptsKey)) || "0"
  );

  if (storedOtp !== otp) {
    if (failedOtpAttempts >= 2) {
      await redis.set(`otp_lock:${email}`, "locked", "EX", 1800); // Lock for 30minutes
      await redis.del(`otp:${email}`, failedOtpAttemptsKey);

      throw new ValidationError(
        "Too many failed attempts. Your account is locked for 30minures!"
      );
    }

    await redis.set(failedOtpAttemptsKey, failedOtpAttempts + 1, "EX", 300);
    throw new ValidationError(
      `Incorrect OTP. ${2 - failedOtpAttempts} attempts left.`
    );
  }

  await redis.del(`otp:${email}`, failedOtpAttemptsKey);
};

export const handleForgotPassword = async (
  next: NextFunction,
  email: string,
  userType: "user" | "seller"
) => {
  // get user from db
  const user =
    userType === "user" &&
    (await prisma.users.findUnique({ where: { email } }));

  if (!user) throw new ValidationError(`${userType} not found!`);

  // Check otp restritions
  await checkOtpRestrictions(email, next);
  await trackOtpRequests(email, next);

  // Generate OTP and send to user
  await sendOtp(user.name, user.email, "forgot=password-user-email");
};
