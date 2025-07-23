import { NextFunction, Request, Response } from "express";
import { AppError } from "./index";

export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof AppError) {
    console.log(`Error ${req.method} ${req.url} - ${error.message}`);

    return res.status(error.statusCode).json({
      status: "error",
      message: error.message,
      ...(error.details && { details: error.details }),
    });
  }

  console.log("Unhandled error:", error);

  return res.status(500).json({
    error: "Something went wrong, please try again!",
  });
};
